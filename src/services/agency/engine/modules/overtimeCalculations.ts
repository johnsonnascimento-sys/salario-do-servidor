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

    // Função auxiliar para calcular o valor da baseHE para uma função específica (a própria ou substituída)
    const calcHEForFunction = (funcKey: string, q50: number, q100: number) => {
        const paramFuncValor = isNoFunction(funcKey, config) ? 0 : (funcoes[funcKey] || 0);
        let baseBaseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
            paramFuncValor + gratVal + (params.vpni_lei || 0) +
            (params.vpni_decisao || 0) + (params.ats || 0);

        if (params.recebeAbono) {
            let baseForPSS = baseBaseHE;
            baseForPSS -= aqTreinoVal;
            if (!params.pssSobreFC) baseForPSS -= paramFuncValor;
            if (!params.incidirPSSGrat) baseForPSS -= gratVal;

            const pssTable = config.historico_pss?.[params.tabelaPSS];
            const teto = pssTable?.teto_rgps || 0;
            const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

            if (pssTable) {
                if (usaTeto) {
                    baseForPSS = Math.min(baseForPSS, teto);
                }
                const abonoEstimado = calculatePss(baseForPSS, pssTable);
                baseBaseHE += abonoEstimado;
            }
        }

        const paramValorHora = payrollRules.overtimeMonthHours > 0 ? baseBaseHE / payrollRules.overtimeMonthHours : 0;
        return {
            v50: paramValorHora * 1.5 * q50,
            v100: paramValorHora * 2.0 * q100
        };
    };

    const overtimeEntries = params.overtimeEntries || [];

    if (overtimeEntries.length > 0) {
        const entries = overtimeEntries.map((entry, index) => {
            let heVal50 = 0;
            let heVal100 = 0;

            const qtd50Global = Math.max(0, Number(entry.qtd50 || 0));
            const qtd100Global = Math.max(0, Number(entry.qtd100 || 0));
            
            // Calcula as horas inseridas no escopo "global" do card usando a função titular
            if (qtd50Global > 0 || qtd100Global > 0) {
                const res = calcHEForFunction(params.funcao, qtd50Global, qtd100Global);
                heVal50 += res.v50;
                heVal100 += res.v100;
            }

            // Se houver grid de horas por função, calcula dinamicamente para cada uma
            if (entry.horasPorFuncao) {
                for (const [funcKey, horas] of Object.entries(entry.horasPorFuncao)) {
                    const h50 = Math.max(0, Number(horas.qtd50 || 0));
                    const h100 = Math.max(0, Number(horas.qtd100 || 0));
                    if (h50 > 0 || h100 > 0) {
                        const res = calcHEForFunction(funcKey, h50, h100);
                        heVal50 += res.v50;
                        heVal100 += res.v100;
                    }
                }
            }

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

    // Calcula valor para o bloco legacy-he usando sua funcao titular
    const legacyHE = calcHEForFunction(params.funcao, params.heQtd50 || 0, params.heQtd100 || 0);
    const heVal50 = legacyHE.v50;
    const heVal100 = legacyHE.v100;
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
