/**
 * Calculos de Substituicao de Funcao - JMU
 * 
 * Responsavel por calcular:
 * - Substituicao de funcao (diferenca proporcional aos dias)
 */

import { CourtConfig } from '../../../../../types';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Substituicao de Funcao
 */
export async function calculateSubstitution(params: IJmuCalculationParams): Promise<number> {
    const config = requireAgencyConfig(params);
    const { funcoes, salario } = await getDataForPeriod(params.periodo, config);
    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    }

    // Base de abatimento = Funcao atual + Gratificacao
    const baseAbatimento = funcaoValor + gratVal;

    let substTotalCalc = 0;

    if (params.substDias) {
        for (const [funcKey, days] of Object.entries(params.substDias)) {
            if (days > 0 && funcoes[funcKey]) {
                const valDestino = funcoes[funcKey];

                if (valDestino > baseAbatimento) {
                    substTotalCalc += ((valDestino - baseAbatimento) / 30) * days;
                }
            }
        }
    }

    return Math.round(substTotalCalc * 100) / 100;
}
