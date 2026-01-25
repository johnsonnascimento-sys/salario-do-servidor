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

import { calcReajuste } from '../../../../../utils/calculations';
import { IJmuCalculationParams } from '../types';
import { CourtConfig } from '../../../../../types';

interface AdjustmentEntry {
    period: number;
    percentage: number;
}

const normalizePercentage = (value: number) => (value > 1 ? value / 100 : value);

const findCorrectionTable = (periodo: number, config: CourtConfig): AdjustmentEntry[] | null => {
    const schedule =
        (config as any).adjustment_schedule ||
        (config.values as any)?.adjustment_schedule ||
        (config.values as any)?.reajustes;

    if (!Array.isArray(schedule)) {
        return null;
    }

    return schedule
        .filter((entry: AdjustmentEntry) => Number.isFinite(entry?.period) && Number.isFinite(entry?.percentage))
        .filter((entry: AdjustmentEntry) => entry.period <= periodo)
        .sort((a: AdjustmentEntry, b: AdjustmentEntry) => a.period - b.period);
};

const applyCorrections = (base: number, periodo: number, config: CourtConfig): number => {
    const schedule = findCorrectionTable(periodo, config);
    if (!schedule || schedule.length === 0) {
        const steps = periodo >= 2 ? periodo - 1 : 0;
        return calcReajuste(base, steps);
    }

    return schedule.reduce((value, entry) => {
        return value * (1 + normalizePercentage(entry.percentage));
    }, base);
};

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Obtem dados ajustados para o periodo (bases salariais e VR)
 * usando a configuracao do orgao ja carregada.
 */
export async function getDataForPeriod(periodo: number, agencyConfig: CourtConfig) {
    const config = agencyConfig;

    const sal = JSON.parse(JSON.stringify(config.bases?.salario?.analista || {}));
    const salTecnico = JSON.parse(JSON.stringify(config.bases?.salario?.tec || {}));

    const salario: any = { analista: {}, tecnico: {} };
    for (let padrao in sal) {
        salario.analista[padrao] = applyCorrections(sal[padrao], periodo, config);
    }
    for (let padrao in salTecnico) {
        salario.tecnico[padrao] = applyCorrections(salTecnico[padrao], periodo, config);
    }

    const func = JSON.parse(JSON.stringify(config.bases?.funcoes || {}));
    const funcoes: any = {};
    for (let key in func) {
        funcoes[key] = applyCorrections(func[key], periodo, config);
    }

    const cj1Base = config.values?.cj1_integral_base || 0;
    const cj1Adjusted = applyCorrections(cj1Base, periodo, config);
    const valorVR = Math.round(cj1Adjusted * 0.065 * 100) / 100;

    return { salario, funcoes, valorVR };
}

/**
 * Calcula a remuneracao base total
 */
export async function calculateBase(params: IJmuCalculationParams): Promise<number> {
    const config = requireAgencyConfig(params);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);

    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * 1.40; // JMU Rule: GAJ is 140%
    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

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
        aqTituloVal = baseVencimento * params.aqTituloPerc;
        aqTreinoVal = baseVencimento * params.aqTreinoPerc;
    }

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    } else {
        gratVal = params.gratEspecificaValor || 0;
    }

    const extras = (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

    return baseVencimento + gaj + funcaoValor + aqTituloVal + aqTreinoVal + gratVal + extras;
}

/**
 * Calcula componentes individuais da base para breakdown detalhado
 */
export async function calculateBaseComponents(params: IJmuCalculationParams) {
    const config = requireAgencyConfig(params);
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
