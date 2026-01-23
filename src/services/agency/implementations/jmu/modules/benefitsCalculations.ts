/**
 * Cálculos de Benefícios - JMU
 * 
 * Responsável por calcular:
 * - Auxílio Alimentação
 * - Auxílio Pré-Escolar
 * - Auxílio Transporte (crédito e débito)
 */

import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

export interface BenefitsResult {
    auxAlimentacao: number;
    auxPreEscolar: number;
    auxTransporte: number;
    auxTransporteDebito: number;
}

/**
 * Calcula benefícios (auxílios)
 */
export async function calculateBenefits(params: IJmuCalculationParams): Promise<BenefitsResult> {
    // Valores de benefícios variam conforme o período
    // Período 0 (2025): valores antigos
    // Período >= 1 (2026+): valores novos
    let auxAlimentacao: number;
    let cotaPreEscolar: number;

    if (params.periodo === 0) {
        // 2025
        auxAlimentacao = 1182.74;
        cotaPreEscolar = 935.22;
    } else {
        // 2026+
        auxAlimentacao = 1784.42;
        cotaPreEscolar = 1235.77;
    }

    const preEscolarVal = (params.auxPreEscolarQtd || 0) * cotaPreEscolar;

    // Aux Transporte Logic
    let auxTranspCred = 0;
    let auxTranspDeb = 0;
    if (params.auxTransporteGasto > 0) {
        auxTranspCred = params.auxTransporteGasto;

        // Debit logic depends on base salary
        const { salario, funcoes } = await getDataForPeriod(params.periodo, params.orgSlug);
        const baseVenc = salario[params.cargo]?.[params.padrao] || 0;
        const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

        const baseCalculoDesc = baseVenc > 0 ? baseVenc : funcaoValor;
        const desc = (baseCalculoDesc / 30 * 22) * 0.06;

        if (desc >= auxTranspCred) {
            auxTranspCred = 0;
        } else {
            auxTranspDeb = desc;
        }
    }

    return {
        auxAlimentacao,
        auxPreEscolar: preEscolarVal,
        auxTransporte: auxTranspCred,
        auxTransporteDebito: auxTranspDeb
    };
}
