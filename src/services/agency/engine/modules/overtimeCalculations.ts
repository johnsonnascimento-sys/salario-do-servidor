/**
 * Calculos de Hora Extra - JMU
 * 
 * Responsavel por calcular:
 * - Hora Extra 50%
 * - Hora Extra 100%
 * - Total de Hora Extra
 */

import { CourtConfig } from '../../../../types';
import { calculatePss } from '../../../../core/calculations/taxUtils';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

export interface OvertimeResult {
    heVal50: number;
    heVal100: number;
    heTotal: number;
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Hora Extra (50% e 100%)
 */
export async function calculateOvertime(params: IAgencyCalculationParams): Promise<OvertimeResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
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

    // Base para HE inclui todos os rendimentos + abono se aplicavel
    let baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
        funcaoValor + gratVal + (params.vpni_lei || 0) +
        (params.vpni_decisao || 0) + (params.ats || 0);

    // Se recebe abono, adiciona a base de HE
    if (params.recebeAbono) {
        let baseForPSS = baseHE;
        baseForPSS -= aqTreinoVal;
        if (!params.pssSobreFC) baseForPSS -= funcaoValor;
        if (!params.incidirPSSGrat) baseForPSS -= gratVal;

        const pssTable = config.historico_pss?.[params.tabelaPSS];
        const teto = pssTable?.teto_rgps || 0;
        const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

        if (pssTable) {
            if (usaTeto) {
                baseForPSS = Math.min(baseForPSS, teto);
            }
            const abonoEstimado = calculatePss(baseForPSS, pssTable);
            baseHE += abonoEstimado;
        }
    }

    // Valor da hora = Base / 175
    const valorHora = baseHE / payrollRules.overtimeMonthHours;

    // HE 50% = hora * 1.5 * quantidade
    const heVal50 = valorHora * 1.5 * (params.heQtd50 || 0);

    // HE 100% = hora * 2.0 * quantidade
    const heVal100 = valorHora * 2.0 * (params.heQtd100 || 0);

    // Total HE
    const heTotal = heVal50 + heVal100;

    return { heVal50, heVal100, heTotal };
}
