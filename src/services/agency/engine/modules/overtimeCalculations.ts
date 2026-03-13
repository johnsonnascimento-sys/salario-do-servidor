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
    entries: Array<{
        id: string;
        heVal50: number;
        heVal100: number;
        heTotal: number;
        isEA: boolean;
        excluirIR: boolean;
    }>;
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

    const overtimeEntries = params.overtimeEntries || [];

    if (overtimeEntries.length > 0) {
        const entries = overtimeEntries.map((entry, index) => {
            const qtd50 = Math.max(0, Number(entry.qtd50 || 0));
            const qtd100 = Math.max(0, Number(entry.qtd100 || 0));
            const heVal50 = valorHora * 1.5 * qtd50;
            const heVal100 = valorHora * 2.0 * qtd100;
            const heTotal = heVal50 + heVal100;

            return {
                id: entry.id || `he-${index}`,
                heVal50,
                heVal100,
                heTotal,
                isEA: Boolean(entry.isEA),
                excluirIR: Boolean(entry.excluirIR)
            };
        });

        const heVal50 = entries.reduce((acc, item) => acc + item.heVal50, 0);
        const heVal100 = entries.reduce((acc, item) => acc + item.heVal100, 0);
        const heTotal = entries.reduce((acc, item) => acc + item.heTotal, 0);

        return { heVal50, heVal100, heTotal, entries };
    }

    const heVal50 = valorHora * 1.5 * (params.heQtd50 || 0);
    const heVal100 = valorHora * 2.0 * (params.heQtd100 || 0);
    const heTotal = heVal50 + heVal100;

    return {
        heVal50,
        heVal100,
        heTotal,
        entries: [
            {
                id: 'legacy-he',
                heVal50,
                heVal100,
                heTotal,
                isEA: Boolean(params.heIsEA),
                excluirIR: Boolean(params.heExcluirIR)
            }
        ]
    };
}
