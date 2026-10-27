/**
 * Calculos de Base Salarial - JMU
 *
 * Responsavel por calcular:
 * - Vencimento base
 * - GAJ (Gratificacao de Atividade Judiciaria)
 * - Funcao Comissionada
 * - AQ (Adicional de Qualificacao) - Sistema antigo e novo
 * - Gratificacoes Especificas (GAE/GAS)
 * - VPNI e ATS
 *
 * REFATORADO: Agora usa params.agencyConfig para buscar dados.
 */

import { IAgencyCalculationParams } from '../types';
import { CourtConfig } from '../../../../types';
import { getPayrollRules, isNoFunction } from './configRules';
import { applySalaryCorrections, isSalaryProjection } from '../../../../utils/salaryScenario';

interface PeriodData {
    salario: Record<string, Record<string, number>>;
    funcoes: Record<string, number>;
    valorVR: number;
}

const periodDataCache = new WeakMap<CourtConfig, Map<string, PeriodData>>();

export const normalizeAQPercent = (value: number) => (value > 1 ? value / 100 : value);

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Obtem dados ajustados para o periodo (bases salariais e VR)
 * usando a configuracao do orgao ja carregada.
 */
export async function getDataForPeriod(periodo: number, agencyConfig: CourtConfig, projection?: boolean) {
    const includeHypothetical = isSalaryProjection({ periodo, simularDerrubadaVeto: projection }, agencyConfig);
    const cacheKey = `${periodo}:${includeHypothetical}`;
    const cachedByConfig = periodDataCache.get(agencyConfig);
    if (cachedByConfig?.has(cacheKey)) {
        return cachedByConfig.get(cacheKey)!;
    }

    const config = agencyConfig;
    const payrollRules = getPayrollRules(config);

    const salario: any = {};
    const salaryBases = config.bases?.salario || {};
    for (const [cargo, padroes] of Object.entries(salaryBases)) {
        salario[cargo] = {};
        for (const [padrao, valor] of Object.entries(padroes || {})) {
            salario[cargo][padrao] = applySalaryCorrections(Number(valor), periodo, config, includeHypothetical);
        }
    }

    const func = JSON.parse(JSON.stringify(config.bases?.funcoes || {}));
    const funcoes: any = {};
    for (let key in func) {
        funcoes[key] = applySalaryCorrections(func[key], periodo, config, includeHypothetical);
    }

    const cj1Base = config.values?.cj1_integral_base || 0;
    const cj1Adjusted = applySalaryCorrections(cj1Base, periodo, config, includeHypothetical);
    const valorVR = Math.round(cj1Adjusted * payrollRules.vrRateOnCj1 * 100) / 100;

    const computed: PeriodData = { salario, funcoes, valorVR };

    if (cachedByConfig) {
        cachedByConfig.set(cacheKey, computed);
    } else {
        periodDataCache.set(agencyConfig, new Map([[cacheKey, computed]]));
    }

    return computed;
}

/**
 * Calcula a remuneracao base total
 */
export async function calculateBase(params: IAgencyCalculationParams): Promise<number> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config, params.simularDerrubadaVeto);

    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;
    const funcaoValor = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);

    // AQ - Adicional de Qualificacao
    let aqTituloVal = 0;
    let aqTreinoVal = 0;

    if (params.periodo >= 1) {
        if (params.aqTituloVR > 10 || params.aqTreinoVR > 10) {
            console.error('Multiplicadores AQ incorretos.', {
                aqTituloVR: params.aqTituloVR,
                aqTreinoVR: params.aqTreinoVR,
                valorVR,
                periodo: params.periodo
            });
        }

        aqTituloVal = valorVR * params.aqTituloVR;
        aqTreinoVal = valorVR * params.aqTreinoVR;
    } else {
        aqTituloVal = baseVencimento * normalizeAQPercent(params.aqTituloPerc);
        aqTreinoVal = baseVencimento * normalizeAQPercent(params.aqTreinoPerc);
    }

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * payrollRules.specificGratificationRate;
    } else {
        gratVal = params.gratEspecificaValor || 0;
    }

    const extras = (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

    return baseVencimento + gaj + funcaoValor + aqTituloVal + aqTreinoVal + gratVal + extras;
}

/**
 * Calcula componentes individuais da base para breakdown detalhado
 */
export async function calculateBaseComponents(params: IAgencyCalculationParams) {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config, params.simularDerrubadaVeto);

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
    } else {
        gratVal = params.gratEspecificaValor || 0;
    }

    return {
        vencimento: baseVencimento,
        gaj,
        funcaoValor,
        aqTitulo: aqTituloVal,
        aqTreino: aqTreinoVal,
        gratEspecifica: gratVal,
        vpniLei: params.vpni_lei || 0,
        vpniDecisao: params.vpni_decisao || 0,
        ats: params.ats || 0
    };
}
