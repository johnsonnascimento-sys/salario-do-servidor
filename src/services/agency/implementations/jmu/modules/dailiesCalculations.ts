/**
 * Calculos de Diarias de Viagem - JMU
 * 
 * Responsavel por calcular:
 * - Diarias de viagem
 * - Adicional de embarque
 * - Glosas externas
 * - Deducoes internas (alimentacao e transporte)
 */

import { IJmuCalculationParams } from '../types';
import { calculateBenefits } from './benefitsCalculations';
import { getPayrollRules } from './configRules';

export interface DailiesResult {
    valor: number;
    bruto: number;
    glosa: number;
    deducoes: number;
}

/**
 * Calcula Diarias de Viagem
 */
export async function calculateDailies(params: IJmuCalculationParams): Promise<DailiesResult> {
    const dailiesConfig = params.agencyConfig?.dailies;
    const payrollRules = getPayrollRules(params.agencyConfig);

    // 1. Determinar valor da diaria por cargo/funcao
    let valorDiaria = 0;
    if (params.funcao && params.funcao.toLowerCase().startsWith('cj')) {
        valorDiaria = dailiesConfig?.rates?.cj ?? 0;
    } else {
        valorDiaria = dailiesConfig?.rates?.[params.cargo] ?? 0;
    }

    // 2. Adicional de embarque
    let adicionalEmbarque = 0;
    if (params.diariasEmbarque === 'completo') {
        adicionalEmbarque = dailiesConfig?.embarkationAdditional?.completo ?? 0;
    } else if (params.diariasEmbarque === 'metade') {
        adicionalEmbarque = dailiesConfig?.embarkationAdditional?.metade ?? 0;
    }

    // 3. Bruto
    const diariasBruto = (params.diariasQtd * valorDiaria) + adicionalEmbarque;

    // 4. Glosa Externa (reducoes percentuais)
    let percentGlosa = 0;
    if (params.diariasExtHospedagem) percentGlosa += dailiesConfig?.externalGloss?.hospedagem ?? 0;
    if (params.diariasExtAlimentacao) percentGlosa += dailiesConfig?.externalGloss?.alimentacao ?? 0;
    if (params.diariasExtTransporte) percentGlosa += dailiesConfig?.externalGloss?.transporte ?? 0;
    const glosaExterno = (params.diariasQtd * valorDiaria) * percentGlosa;

    // 5. Deducoes Internas
    const totalDiasViagem = params.diariasQtd;
    let deducaoAlimentacao = 0;
    let deducaoTransporte = 0;

    const benefits = await calculateBenefits(params);

    if (params.diariasDescontarAlimentacao && totalDiasViagem > 0) {
        deducaoAlimentacao = (benefits.auxAlimentacao / payrollRules.monthDayDivisor) * totalDiasViagem;
    }

    if (params.diariasDescontarTransporte && totalDiasViagem > 0) {
        deducaoTransporte = (benefits.auxTransporte / payrollRules.monthDayDivisor) * totalDiasViagem;
    }

    const totalDeducoes = deducaoAlimentacao + deducaoTransporte;

    // 6. Liquido (minimo zero)
    const valor = Math.max(0, diariasBruto - glosaExterno - totalDeducoes);

    return {
        valor: Math.round(valor * 100) / 100,
        bruto: Math.round(diariasBruto * 100) / 100,
        glosa: Math.round(glosaExterno * 100) / 100,
        deducoes: Math.round(totalDeducoes * 100) / 100
    };
}
