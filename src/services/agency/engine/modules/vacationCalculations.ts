/**
 * Calculos de Ferias - JMU
 * 
 * Responsavel por calcular:
 * - Ferias (1/3 Constitucional)
 * - IR sobre Ferias
 */

import { CourtConfig } from '../../../../types';
import { calculateIrrf } from '../../../../core/calculations/taxUtils';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

export interface VacationResult {
    value: number;
    irFerias: number;
    descontoAntecipacao: number;
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Ferias (1/3 Constitucional)
 */
export async function calculateVacation(params: IAgencyCalculationParams): Promise<VacationResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    let ferias1_3 = params.ferias1_3 || 0;

    if (!params.manualFerias) {
        if (params.tipoCalculo === 'jan' || ferias1_3 > 0) {
            const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
            const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
            const gaj = baseVencimento * payrollRules.gajRate;
            const funcaoValor = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);

            let aqTituloVal = 0;
            let aqTreinoVal = 0;
            if (params.periodo >= 1) {
                aqTituloVal = valorVR * params.aqTituloVR;
                aqTreinoVal = valorVR * params.aqTreinoVR;
            } else {
                aqTituloVal = baseVencimento * normalizeAQPercent(params.aqTituloPerc);
                aqTreinoVal = baseVencimento * normalizeAQPercent(params.aqTreinoPerc);
            }

            let gratVal = 0;
            if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
                gratVal = baseVencimento * payrollRules.specificGratificationRate;
            }

            const incideVenc = params.feriasIncideVencimento !== false;
            const incideGAJ = params.feriasIncideGAJ !== false;
            const incideFuncao = params.feriasIncideFuncao !== false;
            const incideAQTitulo = params.feriasIncideAQTitulo !== false;
            const incideAQTreino = params.feriasIncideAQTreino !== false;
            const incideGrat = params.feriasIncideGrat !== false;
            const incideVPNI = params.feriasIncideVPNI !== false;
            const incideATS = params.feriasIncideATS !== false;
            const incideAbono = params.feriasIncideAbono !== false;

            let baseFerias = 0;
            if (incideVenc) baseFerias += baseVencimento;
            if (incideGAJ) baseFerias += gaj;
            if (incideFuncao) baseFerias += funcaoValor;
            if (incideAQTitulo) baseFerias += aqTituloVal;
            if (incideAQTreino) baseFerias += aqTreinoVal;
            if (incideGrat) baseFerias += gratVal;
            if (incideVPNI) baseFerias += ((params.vpni_lei || 0) + (params.vpni_decisao || 0));
            if (incideATS) baseFerias += (params.ats || 0);

            if (incideAbono && params.recebeAbono) {
                baseFerias += (params.abonoPermanencia || params.pssMensal || 0);
            }

            if (params.feriasRubricasInclusas && Array.isArray(params.rubricasExtras)) {
                params.rubricasExtras
                    .filter(r => r.tipo === 'C' && params.feriasRubricasInclusas?.[r.id] === true)
                    .forEach(r => {
                        baseFerias += (r.valor || 0);
                    });
            }

            if (params.feriasOutrasParcelas && params.feriasOutrasParcelas > 0) {
                baseFerias += params.feriasOutrasParcelas;
            }

            ferias1_3 = baseFerias / 3;
        }
    }
    ferias1_3 = Math.round(ferias1_3 * 100) / 100;
    const descontoAntecipacao = params.feriasAntecipadas
        ? Math.round(((params.feriasDescManual ? params.feriasDesc : ferias1_3) || 0) * 100) / 100
        : 0;

    // IR sobre Ferias
    let irFerias = 0;
    if (ferias1_3 > 0 && !params.feriasAntecipadas) {
        const deducaoDep = config.values?.deducao_dep || 0;
        const baseIRFerias = ferias1_3 - (params.dependents * deducaoDep);
        const deductionVal = config.historico_ir?.[params.tabelaIR] || 0;
        irFerias = calculateIrrf(baseIRFerias, payrollRules.irrfTopRate, deductionVal);
    }

    return { value: ferias1_3, irFerias, descontoAntecipacao };
}
