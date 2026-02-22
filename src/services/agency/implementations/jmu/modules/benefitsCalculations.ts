/**
 * Calculos de Beneficios - JMU
 * 
 * Responsavel por calcular:
 * - Auxilio Alimentacao
 * - Auxilio Pre-Escolar
 * - Auxilio Transporte (credito e debito)
 */

import { CourtConfig } from '../../../../../types';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

export interface BenefitsResult {
    auxAlimentacao: number;
    auxPreEscolar: number;
    auxTransporte: number;
    auxTransporteDebito: number;
}

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula beneficios (auxilios)
 */
export async function calculateBenefits(params: IJmuCalculationParams): Promise<BenefitsResult> {
    const config = requireAgencyConfig(params);

    const configAuxAlimentacao = config.values?.food_allowance ?? 0;
    const auxAlimentacao = params.auxAlimentacao > 0 ? params.auxAlimentacao : configAuxAlimentacao;

    const configCotaPreEscolar = config.values?.pre_school ?? 0;
    const cotaPreEscolar = params.cotaPreEscolar && params.cotaPreEscolar > 0
        ? params.cotaPreEscolar
        : configCotaPreEscolar;

    const preEscolarVal = (params.auxPreEscolarQtd || 0) * cotaPreEscolar;

    // Aux Transporte Logic
    let auxTranspCred = 0;
    let auxTranspDeb = 0;
    if (params.auxTransporteGasto > 0) {
        auxTranspCred = params.auxTransporteGasto;

        // Debit logic depends on base salary
        const { salario, funcoes } = await getDataForPeriod(params.periodo, config);
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
