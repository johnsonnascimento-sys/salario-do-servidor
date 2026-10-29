/**
 * Calculos de Diarias de Viagem - JMU
 *
 * Responsavel por calcular:
 * - Diarias de viagem
 * - Adicional de embarque
 * - Corte por teto LDO (configuravel)
 * - Glosas externas (art. 4)
 * - Deducoes internas (auxilio-alimentacao/transporte)
 */

import { IAgencyCalculationParams } from '../types';
import {
    applyLdoCapToDailiesGross,
    countDeductibleDaysInRange,
    countCalendarDaysInRange,
    resolveDailiesDailyRate,
    resolveDailiesDiscountDays,
    resolveDailiesDiscountRules,
    resolveDailiesEmbarkationAdditional,
    summarizeDailiesPeriodMode
} from '../../../../utils/dailiesRules';
import { calculateBenefits } from './benefitsCalculations';
import { getPayrollRules } from './configRules';
import type { DailiesCalculationMemory } from '../../../../types/calculationMemory';
import { assertNonNegativeFinite, CalculationValidationError } from '../validation';

export interface DailiesResult {
    valor: number;
    bruto: number;
    glosa: number;
    corteLdo: number;
    deducoes: number;
    descAlim: number;
    descTransp: number;
    diasDescontoAlim: number;
    diasDescontoTransp: number;
    memory: DailiesCalculationMemory;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const configuredNumber = (value: unknown, label: string, positive = false): number => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (positive && value === 0)) {
        throw new Error(`Configuração de diárias incompleta: ${label}. Revise o cadastro administrativo.`);
    }
    return value;
};

/**
 * Calcula Diarias de Viagem
 */
export async function calculateDailies(params: IAgencyCalculationParams): Promise<DailiesResult> {
    assertNonNegativeFinite('diariasQtd', params.diariasQtd);
    assertNonNegativeFinite('diariasDiasDescontoAlimentacao', params.diariasDiasDescontoAlimentacao);
    assertNonNegativeFinite('diariasDiasDescontoTransporte', params.diariasDiasDescontoTransporte);
    if (params.diariasModoDesconto === 'periodo' && (params.diariasDataInicio || params.diariasDataFim)) {
        const days = countCalendarDaysInRange(params.diariasDataInicio, params.diariasDataFim);
        if (days === null || params.diariasDataFim < params.diariasDataInicio) {
            throw new CalculationValidationError('diariasDataFim', 'Informe datas válidas de viagem, com data final igual ou posterior à inicial.');
        }
    }
    const hasPeriod = params.diariasModoDesconto === 'periodo' && Boolean(params.diariasDataInicio && params.diariasDataFim);
    if (!hasPeriod && !params.diariasQtd && params.diariasEmbarque === 'nenhum') {
        return { valor: 0, bruto: 0, glosa: 0, corteLdo: 0, deducoes: 0, descAlim: 0, descTransp: 0,
            diasDescontoAlim: 0, diasDescontoTransp: 0,
            memory: { dailyRate: 0, quantity: 0, embarkationAdditional: 0, gross: 0, ldoCut: 0,
                externalGloss: 0, foodDiscount: 0, transportDiscount: 0, foodDays: 0, transportDays: 0,
                foodDiscountHalf: 0, foodDiscountFull: 0, transportDiscountHalf: 0, transportDiscountFull: 0,
                calculatedAmounts: { ldoCut: 0, externalGloss: 0, foodDiscount: 0, transportDiscount: 0, deductions: 0 }, unappliedDeductions: 0,
                halfDailyApplied: false, halfDiscountApplied: false, deductions: 0, net: 0 } };
    }
    const dailiesConfig = params.agencyConfig?.dailies;
    const payrollRules = getPayrollRules(params.agencyConfig);
    const manualDailiesQty = Math.max(0, Number(params.diariasQtd) || 0);
    const discountRules = resolveDailiesDiscountRules(
        dailiesConfig,
        payrollRules.transportWorkdays
    );
    if (params.diariasDescontarAlimentacao) configuredNumber(dailiesConfig?.discountRules?.foodDivisor ?? payrollRules.transportWorkdays, 'divisor de alimentação', true);
    if (params.diariasDescontarTransporte) configuredNumber(dailiesConfig?.discountRules?.transportDivisor ?? payrollRules.transportWorkdays, 'divisor de transporte', true);
    const effectiveHolidays = Array.isArray(params.diariasFeriados) ? params.diariasFeriados : [];

    const effectiveDiscountRules = params.diariasModoDesconto === 'periodo'
        ? { ...discountRules, excludeWeekendsAndHolidays: true, holidays: effectiveHolidays }
        : { ...discountRules, holidays: effectiveHolidays };
    const periodSummary = params.diariasModoDesconto === 'periodo'
        ? summarizeDailiesPeriodMode(
            params.diariasDataInicio,
            params.diariasDataFim,
            effectiveDiscountRules
        )
        : null;
    const periodCalendarDays = params.diariasModoDesconto === 'periodo'
        ? countCalendarDaysInRange(params.diariasDataInicio, params.diariasDataFim)
        : null;
    const dailiesQty = params.diariasModoDesconto === 'periodo'
        ? (periodSummary?.payableDays ?? periodCalendarDays ?? manualDailiesQty)
        : manualDailiesQty;

    // 1. Determinar valor da diaria por cargo/funcao
    const valorDiaria = resolveDailiesDailyRate({
        dailiesConfig,
        cargo: params.cargo,
        funcao: params.funcao,
        hasCommissionRole: Boolean(params.funcao && params.funcao.toLowerCase().startsWith('cj')),
        assessoramentoMagistrado: Boolean(params.diariasAssessoramentoMagistrado),
        autoridadeAssistida: params.diariasAutoridadeAssistida
    });

    // 2. Adicional de embarque
    const adicionalEmbarque = resolveDailiesEmbarkationAdditional({
        dailiesConfig,
        embarkationType: params.diariasEmbarque
    });

    // 3. Bruto + corte por teto LDO
    const cappedGross = applyLdoCapToDailiesGross({
        dailiesQty,
        dailiesRate: valorDiaria,
        embarkationAdditional: adicionalEmbarque,
        enabled: Boolean(dailiesConfig?.ldoCap?.enabled),
        perDiemLimit: dailiesConfig?.ldoCap?.enabled
            ? configuredNumber(dailiesConfig.ldoCap.perDiemLimit, 'limite LDO', true) : 0,
    });
    const diariasBruto = cappedGross.gross;
    const corteLdo = cappedGross.cut;
    const diariasAposCorte = Math.max(0, diariasBruto - corteLdo);

    // 4. Glosa Externa (reducoes percentuais)
    let percentGlosa = 0;
    if (params.diariasExtHospedagem) percentGlosa += configuredNumber(dailiesConfig?.externalGloss?.hospedagem, 'glosa de hospedagem');
    if (params.diariasExtAlimentacao) percentGlosa += configuredNumber(dailiesConfig?.externalGloss?.alimentacao, 'glosa de alimentação');
    if (params.diariasExtTransporte) percentGlosa += configuredNumber(dailiesConfig?.externalGloss?.transporte, 'glosa de transporte');
    const glosaExterno = round2((dailiesQty * valorDiaria) * percentGlosa);

    // 5. Deducoes Internas
    const benefits = await calculateBenefits(params);
    const periodDiscountDays = params.diariasModoDesconto === 'periodo'
        ? (
            periodSummary?.discountDays ??
            countDeductibleDaysInRange(params.diariasDataInicio, params.diariasDataFim, effectiveDiscountRules) ??
            dailiesQty
        )
        : null;

    const discountDays = params.diariasModoDesconto === 'periodo'
        ? {
            foodDays: params.diariasDescontarAlimentacao ? periodDiscountDays || 0 : 0,
            transportDays: params.diariasDescontarTransporte ? periodDiscountDays || 0 : 0
        }
        : resolveDailiesDiscountDays({
            mode: params.diariasModoDesconto,
            startDate: params.diariasDataInicio,
            endDate: params.diariasDataFim,
            manualFoodDays: params.diariasDiasDescontoAlimentacao,
            manualTransportDays: params.diariasDiasDescontoTransporte,
            applyFoodDiscount: params.diariasDescontarAlimentacao,
            applyTransportDiscount: params.diariasDescontarTransporte,
            fallbackDays: dailiesQty,
            rules: effectiveDiscountRules,
        });

    const deducaoAlimentacao = params.diariasDescontarAlimentacao
        ? round2((benefits.auxAlimentacao / discountRules.foodDivisor) * discountDays.foodDays)
        : 0;
    const deducaoTransporte = params.diariasDescontarTransporte
        ? round2((benefits.auxTransporte / discountRules.transportDivisor) * discountDays.transportDays)
        : 0;
    const totalDeducoes = deducaoAlimentacao + deducaoTransporte;

    // 6. Liquido (minimo zero)
    const valor = Math.max(0, diariasAposCorte - glosaExterno - totalDeducoes);
    const calculatedFoodDiscountHalf = periodSummary?.halfDiscountApplied && params.diariasDescontarAlimentacao
        ? Math.min(round2(deducaoAlimentacao), round2((benefits.auxAlimentacao / discountRules.foodDivisor) * 0.5)) : 0;
    const calculatedTransportDiscountHalf = periodSummary?.halfDiscountApplied && params.diariasDescontarTransporte
        ? Math.min(round2(deducaoTransporte), round2((benefits.auxTransporte / discountRules.transportDivisor) * 0.5)) : 0;

    // Preserve the established minimum-zero-net rule without posting deductions
    // beyond the available gross. Allocation follows the existing calculation order.
    let availableGross = round2(diariasBruto);
    const applyDeduction = (calculated: number): number => {
        const effective = round2(Math.min(availableGross, Math.max(0, calculated)));
        availableGross = round2(availableGross - effective);
        return effective;
    };
    const appliedLdo = applyDeduction(corteLdo);
    const appliedGloss = applyDeduction(glosaExterno);
    const appliedFood = applyDeduction(deducaoAlimentacao);
    const appliedTransport = applyDeduction(deducaoTransporte);
    const foodDiscountFull = Math.min(appliedFood, round2(deducaoAlimentacao - calculatedFoodDiscountHalf));
    const foodDiscountHalf = round2(appliedFood - foodDiscountFull);
    const transportDiscountFull = Math.min(appliedTransport, round2(deducaoTransporte - calculatedTransportDiscountHalf));
    const transportDiscountHalf = round2(appliedTransport - transportDiscountFull);
    const unappliedDeductions = round2(corteLdo + glosaExterno + totalDeducoes - appliedLdo - appliedGloss - appliedFood - appliedTransport);

    return {
        valor: round2(valor),
        bruto: round2(diariasBruto),
        glosa: appliedGloss,
        corteLdo: appliedLdo,
        deducoes: round2(appliedFood + appliedTransport),
        descAlim: appliedFood,
        descTransp: appliedTransport,
        diasDescontoAlim: round2(discountDays.foodDays),
        diasDescontoTransp: round2(discountDays.transportDays),
        memory: { dailyRate: round2(valorDiaria), quantity: dailiesQty, embarkationAdditional: round2(adicionalEmbarque),
            gross: round2(diariasBruto), ldoCut: appliedLdo, externalGloss: appliedGloss,
            foodDiscount: appliedFood, transportDiscount: appliedTransport,
            calculatedAmounts: { ldoCut: round2(corteLdo), externalGloss: round2(glosaExterno), foodDiscount: round2(deducaoAlimentacao),
                transportDiscount: round2(deducaoTransporte), deductions: round2(totalDeducoes) }, unappliedDeductions,
            foodDays: round2(discountDays.foodDays), transportDays: round2(discountDays.transportDays),
            foodDiscountHalf, foodDiscountFull,
            transportDiscountHalf, transportDiscountFull,
            halfDailyApplied: Boolean(periodSummary?.halfDailyApplied), halfDiscountApplied: Boolean(periodSummary?.halfDiscountApplied),
            deductions: round2(appliedFood + appliedTransport), net: round2(valor) },
    };
}
