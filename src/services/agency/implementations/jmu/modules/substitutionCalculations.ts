/**
 * Cálculos de Substituição de Função - JMU
 * 
 * Responsável por calcular:
 * - Substituição de função (diferença proporcional aos dias)
 * 
 * Baseado em LEGACY_FORMULAS.md seção 6 (L191-215)
 */

import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

/**
 * Calcula Substituição de Função
 */
export async function calculateSubstitution(params: IJmuCalculationParams): Promise<number> {
    const { funcoes, salario } = await getDataForPeriod(params.periodo, params.orgSlug);
    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    }

    // Base de abatimento = Função atual + Gratificação
    const baseAbatimento = funcaoValor + gratVal;

    let substTotalCalc = 0;

    // Para cada função substituída
    if (params.substDias) {
        for (const [funcKey, days] of Object.entries(params.substDias)) {
            if (days > 0 && funcoes[funcKey]) {
                const valDestino = funcoes[funcKey]; // Valor da função destino

                // Só paga diferença se destino > origem
                if (valDestino > baseAbatimento) {
                    substTotalCalc += ((valDestino - baseAbatimento) / 30) * days;
                }
            }
        }
    }

    return Math.round(substTotalCalc * 100) / 100;
}
