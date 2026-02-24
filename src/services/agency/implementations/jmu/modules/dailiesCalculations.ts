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

import { IJmuCalculationParams } from '../types';
import {
    applyLdoCapToDailiesGross,
    countCalendarDaysInRange,
    resolveDailiesDailyRate,
    resolveDailiesDiscountDays,
    resolveDailiesDiscountRules,
    resolveDailiesEmbarkationAdditional
} from '../../../../../utils/dailiesRules';
import { calculateBenefits } from './benefitsCalculations';
import { getPayrollRules } from './configRules';

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
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Calcula Diarias de Viagem
 */
export async function calculateDailies(params: IJmuCalculationParams): Promise<DailiesResult> {
    const dailiesConfig = params.agencyConfig?.dailies;
    const payrollRules = getPayrollRules(params.agencyConfig);
    const manualDailiesQty = Math.max(0, Number(params.diariasQtd) || 0);
    const periodDailiesQty = params.diariasModoDesconto === 'periodo'
        ? countCalendarDaysInRange(params.diariasDataInicio, params.diariasDataFim)
        : null;
    const dailiesQty = periodDailiesQty !== null ? periodDailiesQty : manualDailiesQty;

    // 1. Determinar valor da diaria por cargo/funcao
    const valorDiaria = resolveDailiesDailyRate({
        dailiesConfig,
        cargo: params.cargo,
        hasCommissionRole: Boolean(params.funcao && params.funcao.toLowerCase().startsWith('cj'))
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
    const discountRules = resolveDailiesDiscountRules(
        dailiesConfig,
        Number(payrollRules.transportWorkdays || 22)
    );

    const discountDays = resolveDailiesDiscountDays({
        mode: params.diariasModoDesconto,
        startDate: params.diariasDataInicio,
        endDate: params.diariasDataFim,
        manualFoodDays: params.diariasDiasDescontoAlimentacao,
        manualTransportDays: params.diariasDiasDescontoTransporte,
        applyFoodDiscount: params.diariasDescontarAlimentacao,
        applyTransportDiscount: params.diariasDescontarTransporte,
        fallbackDays: dailiesQty,
        rules: discountRules,
    });

    const deducaoAlimentacao = params.diariasDescontarAlimentacao
        ? (benefits.auxAlimentacao / discountRules.foodDivisor) * discountDays.foodDays
        : 0;
    const deducaoTransporte = params.diariasDescontarTransporte
        ? (benefits.auxTransporte / discountRules.transportDivisor) * discountDays.transportDays
        : 0;
    const totalDeducoes = deducaoAlimentacao + deducaoTransporte;

    // 6. Liquido (minimo zero)
    const valor = Math.max(0, diariasAposCorte - glosaExterno - totalDeducoes);

    return {
        valor: round2(valor),
        bruto: round2(diariasBruto),
        glosa: round2(glosaExterno),
        corteLdo: round2(corteLdo),
        deducoes: round2(totalDeducoes),
        descAlim: round2(deducaoAlimentacao),
        descTransp: round2(deducaoTransporte),
        diasDescontoAlim: round2(discountDays.foodDays),
        diasDescontoTransp: round2(discountDays.transportDays),
    };
}
