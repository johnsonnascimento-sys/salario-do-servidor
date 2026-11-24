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

export interface DailiesResult {
    valorUnitario: number;
    valor: number;
    bruto: number;
    glosa: number;
    corteLdo: number;
    deducoes: number;
    descAlim: number;
    descTransp: number;
    descTranspRetorno: number;
    diasDescontoAlim: number;
    diasDescontoTransp: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Calcula Diarias de Viagem
 */
export async function calculateDailies(params: IAgencyCalculationParams): Promise<DailiesResult> {
    const dailiesConfig = params.agencyConfig?.dailies;
    const payrollRules = getPayrollRules(params.agencyConfig);
    const manualDailiesQty = Math.max(0, Number(params.diariasQtd) || 0);
    const discountRules = resolveDailiesDiscountRules(
        dailiesConfig,
        Number(payrollRules.transportWorkdays || 22)
    );
    const manualHolidays = Array.isArray(params.diariasFeriados) ? params.diariasFeriados : null;
    const effectiveHolidays = manualHolidays !== null
        ? manualHolidays
        : (discountRules.holidays || []);

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
    const externalFc = params.commissionProfile?.kind === 'external' && params.funcao.toLowerCase().startsWith('fc');
    const fcRule = externalFc ? params.agencyConfig?.commission?.dailiesFc : undefined;
    const serviceStart = params.diariasModoDesconto === 'periodo' && params.diariasDataInicio
        ? params.diariasDataInicio : `${params.competencia}-01`;
    const declaredRate = externalFc && params.commissionProfile?.kind === 'external'
        ? params.commissionProfile.documentedDailyRate ?? (fcRule?.source && serviceStart >= fcRule.validFrom ? fcRule.amount : undefined)
        : undefined;
    const documentedRegularRate = typeof declaredRate === 'number' && Number.isFinite(declaredRate) && declaredRate > 0
        ? declaredRate : undefined;
    const valorDiaria = resolveDailiesDailyRate({
        dailiesConfig,
        cargo: params.cargo,
        funcao: params.funcao,
        hasCommissionRole: Boolean(params.funcao && params.funcao.toLowerCase().startsWith('cj')),
        documentedRegularRate,
        assessoramentoMagistrado: Boolean(params.diariasAssessoramentoMagistrado),
        acompanhamentoIntegral: Boolean(params.diariasAcompanhamentoIntegral),
        autoridadeAssistida: params.diariasAutoridadeAssistida,
        equipeTrabalho: Boolean(params.diariasEquipeTrabalho),
        equipeTrabalhoMaiorCargo: params.diariasEquipeTrabalhoMaiorCargo
    });
    if (params.commissionProfile && dailiesQty > 0 && valorDiaria <= 0) {
        throw new Error('Diárias pendentes: indique o valor unitário documentado ou use uma regra de diária configurada para este vínculo.');
    }

    // 2. Adicional de embarque
    const adicionalEmbarque = resolveDailiesEmbarkationAdditional({
        dailiesConfig,
        embarkationType: params.diariasEmbarque,
        trechosTransporte: params.diariasTrechosTransporte
    });

    // 3. Bruto + corte por teto LDO
    const cappedGross = applyLdoCapToDailiesGross({
        dailiesQty,
        dailiesRate: valorDiaria,
        embarkationAdditional: adicionalEmbarque,
        enabled: Boolean(dailiesConfig?.ldoCap?.enabled),
        perDiemLimit: Number(dailiesConfig?.ldoCap?.perDiemLimit ?? 0),
    });
    const diariasBruto = cappedGross.gross;
    const corteLdo = cappedGross.cut;
    const diariasAposCorte = Math.max(0, diariasBruto - corteLdo);

    // 4. Glosa Externa (reducoes percentuais)
    let percentGlosa = 0;
    if (params.diariasExtHospedagem) percentGlosa += dailiesConfig?.externalGloss?.hospedagem ?? 0;
    if (params.diariasExtAlimentacao) percentGlosa += dailiesConfig?.externalGloss?.alimentacao ?? 0;
    if (params.diariasExtTransporte) percentGlosa += dailiesConfig?.externalGloss?.transporte ?? 0;
    const glosaExterno = (dailiesQty * valorDiaria) * percentGlosa;

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
        ? (benefits.auxAlimentacao / discountRules.foodDivisor) * discountDays.foodDays
        : 0;
    const auxTransporteLiquido = round2(benefits.auxTransporte - benefits.auxTransporteDebito);
    const auxTransportePorDia = auxTransporteLiquido / discountRules.transportDivisor;
    const deducaoTransporte = auxTransportePorDia * discountDays.transportDays;
    const deducaoTransporteRetorno = periodSummary?.halfDiscountApplied && params.diariasDescontarTransporte
        ? auxTransportePorDia * 0.5
        : 0;
    const totalDeducoes = deducaoAlimentacao + deducaoTransporte;

    // 6. Liquido (minimo zero)
    const valor = Math.max(0, diariasAposCorte - glosaExterno - totalDeducoes);

    return {
        valorUnitario: round2(valorDiaria),
        valor: round2(valor),
        bruto: round2(diariasBruto),
        glosa: round2(glosaExterno),
        corteLdo: round2(corteLdo),
        deducoes: round2(totalDeducoes),
        descAlim: round2(deducaoAlimentacao),
        descTransp: round2(deducaoTransporte),
        descTranspRetorno: round2(deducaoTransporteRetorno),
        diasDescontoAlim: round2(discountDays.foodDays),
        diasDescontoTransp: round2(discountDays.transportDays),
    };
}
