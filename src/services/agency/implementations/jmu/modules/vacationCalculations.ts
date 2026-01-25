/**
 * Calculos de Ferias - JMU
 * 
 * Responsavel por calcular:
 * - Ferias (1/3 Constitucional)
 * - IR sobre Ferias
 */

import { CourtConfig } from '../../../../../types';
import { calculateIrrf } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

export interface VacationResult {
    value: number;
    irFerias: number;
}

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Ferias (1/3 Constitucional)
 */
export async function calculateVacation(params: IJmuCalculationParams): Promise<VacationResult> {
    const config = requireAgencyConfig(params);
    let ferias1_3 = params.ferias1_3 || 0;

    if (!params.manualFerias) {
        if (params.tipoCalculo === 'jan' || ferias1_3 > 0) {
            const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
            const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
            const gaj = baseVencimento * 1.40;
            const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

            let aqTituloVal = 0;
            let aqTreinoVal = 0;
            if (params.periodo >= 1) {
                aqTituloVal = valorVR * params.aqTituloVR;
                aqTreinoVal = valorVR * params.aqTreinoVR;
            } else {
                aqTituloVal = baseVencimento * params.aqTituloPerc;
                aqTreinoVal = baseVencimento * params.aqTreinoPerc;
            }

            let gratVal = 0;
            if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
                gratVal = baseVencimento * 0.35;
            }

            const totalComFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
                funcaoValor + gratVal + (params.vpni_lei || 0) +
                (params.vpni_decisao || 0) + (params.ats || 0);

            ferias1_3 = totalComFC / 3;
        }
    }
    ferias1_3 = Math.round(ferias1_3 * 100) / 100;

    // IR sobre Ferias
    let irFerias = 0;
    if (ferias1_3 > 0 && !params.feriasAntecipadas) {
        const deducaoDep = config.values?.deducao_dep || 0;
        const baseIRFerias = ferias1_3 - (params.dependents * deducaoDep);
        const deductionVal = config.historico_ir?.[params.tabelaIR] || 896.00;
        irFerias = calculateIrrf(baseIRFerias, 0.275, deductionVal);
    }

    return { value: ferias1_3, irFerias };
}
