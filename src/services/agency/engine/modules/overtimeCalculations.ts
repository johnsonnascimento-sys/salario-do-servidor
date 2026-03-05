/**
 * Calculos de Hora Extra - JMU
 * 
 * Responsavel por calcular:
 * - Hora Extra 50%
 * - Hora Extra 100%
 * - Total de Hora Extra
 */

import { CourtConfig, OvertimeEntry } from '../../../../types';
import { calculatePss } from '../../../../core/calculations/taxUtils';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';
import { pickPeriodFromScheduleByReference } from '../../../../components/Calculator/referenceDateUtils';

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

type OvertimeBaseContext = {
    periodo: number;
    cargo: string;
    padrao: string;
    funcao: string;
    aqTituloPerc: number;
    aqTreinoPerc: number;
    aqTituloVR: number;
    aqTreinoVR: number;
    recebeAbono: boolean;
    gratEspecificaTipo: '0' | 'gae' | 'gas';
    vpni_lei: number;
    vpni_decisao: number;
    ats: number;
    regimePrev: IAgencyCalculationParams['regimePrev'];
    tabelaPSS: string;
    pssSobreFC: boolean;
    incidirPSSGrat: boolean;
};

const resolveEntryPeriod = (params: IAgencyCalculationParams, entry: OvertimeEntry) => {
    if (!entry.competenciaAno || !entry.competenciaMes) {
        return params.periodo;
    }

    const schedule = params.agencyConfig?.adjustment_schedule || [];
    const resolved = pickPeriodFromScheduleByReference(
        schedule,
        entry.competenciaAno,
        entry.competenciaMes
    );

    return resolved ?? params.periodo;
};

const buildContextFromParams = (params: IAgencyCalculationParams): OvertimeBaseContext => ({
    periodo: params.periodo,
    cargo: params.cargo,
    padrao: params.padrao,
    funcao: params.funcao,
    aqTituloPerc: params.aqTituloPerc,
    aqTreinoPerc: params.aqTreinoPerc,
    aqTituloVR: params.aqTituloVR,
    aqTreinoVR: params.aqTreinoVR,
    recebeAbono: params.recebeAbono,
    gratEspecificaTipo: params.gratEspecificaTipo,
    vpni_lei: params.vpni_lei || 0,
    vpni_decisao: params.vpni_decisao || 0,
    ats: params.ats || 0,
    regimePrev: params.regimePrev,
    tabelaPSS: params.tabelaPSS,
    pssSobreFC: params.pssSobreFC,
    incidirPSSGrat: params.incidirPSSGrat
});

const buildContextFromEntry = (params: IAgencyCalculationParams, entry: OvertimeEntry): OvertimeBaseContext => {
    const base = buildContextFromParams(params);
    if (!entry.usarDadosCompetencia || !entry.competenciaSnapshot) {
        return {
            ...base,
            periodo: resolveEntryPeriod(params, entry)
        };
    }

    const snapshot = entry.competenciaSnapshot;
    return {
        ...base,
        periodo: resolveEntryPeriod(params, entry),
        cargo: snapshot.cargo,
        padrao: snapshot.padrao,
        funcao: snapshot.funcao,
        aqTituloPerc: snapshot.aqTituloPerc,
        aqTreinoPerc: snapshot.aqTreinoPerc,
        aqTituloVR: snapshot.aqTituloVR,
        aqTreinoVR: snapshot.aqTreinoVR,
        recebeAbono: snapshot.recebeAbono,
        gratEspecificaTipo: snapshot.gratEspecificaTipo,
        vpni_lei: snapshot.vpni_lei || 0,
        vpni_decisao: snapshot.vpni_decisao || 0,
        ats: snapshot.ats || 0,
        regimePrev: snapshot.regimePrev,
        tabelaPSS: snapshot.tabelaPSS,
        pssSobreFC: snapshot.pssSobreFC,
        incidirPSSGrat: snapshot.incidirPSSGrat
    };
};

const calculateEntryBaseAndHourly = async (
    params: IAgencyCalculationParams,
    context: OvertimeBaseContext
) => {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(context.periodo, config);
    const baseVencimento = salario[context.cargo]?.[context.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;
    const funcaoValor = isNoFunction(context.funcao, config) ? 0 : (funcoes[context.funcao] || 0);

    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (context.periodo >= 1) {
        aqTituloVal = valorVR * context.aqTituloVR;
        aqTreinoVal = valorVR * context.aqTreinoVR;
    } else {
        aqTituloVal = baseVencimento * normalizeAQPercent(context.aqTituloPerc);
        aqTreinoVal = baseVencimento * normalizeAQPercent(context.aqTreinoPerc);
    }

    let gratVal = 0;
    if (context.gratEspecificaTipo === 'gae' || context.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * payrollRules.specificGratificationRate;
    }

    let baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
        funcaoValor + gratVal + (context.vpni_lei || 0) +
        (context.vpni_decisao || 0) + (context.ats || 0);

    if (context.recebeAbono) {
        let baseForPSS = baseHE;
        baseForPSS -= aqTreinoVal;
        if (!context.pssSobreFC) baseForPSS -= funcaoValor;
        if (!context.incidirPSSGrat) baseForPSS -= gratVal;

        const pssTable = config.historico_pss?.[context.tabelaPSS];
        const teto = pssTable?.teto_rgps || 0;
        const usaTeto = context.regimePrev === 'migrado' || context.regimePrev === 'rpc';

        if (pssTable) {
            if (usaTeto) {
                baseForPSS = Math.min(baseForPSS, teto);
            }
            const abonoEstimado = calculatePss(baseForPSS, pssTable);
            baseHE += abonoEstimado;
        }
    }

    return {
        baseHE,
        valorHora: baseHE / payrollRules.overtimeMonthHours
    };
};

/**
 * Calcula Hora Extra (50% e 100%)
 */
export async function calculateOvertime(params: IAgencyCalculationParams): Promise<OvertimeResult> {
    const overtimeEntries = params.overtimeEntries || [];

    if (overtimeEntries.length > 0) {
        const entries = await Promise.all(overtimeEntries.map(async (entry, index) => {
            const context = buildContextFromEntry(params, entry);
            const baseCalc = await calculateEntryBaseAndHourly(params, context);
            const qtd50 = Math.max(0, Number(entry.qtd50 || 0));
            const qtd100 = Math.max(0, Number(entry.qtd100 || 0));
            const heVal50 = baseCalc.valorHora * 1.5 * qtd50;
            const heVal100 = baseCalc.valorHora * 2.0 * qtd100;
            const heTotal = heVal50 + heVal100;

            return {
                id: entry.id || `he-${index}`,
                heVal50,
                heVal100,
                heTotal,
                isEA: Boolean(entry.isEA),
                excluirIR: Boolean(entry.excluirIR)
            };
        }));

        const heVal50 = entries.reduce((acc, item) => acc + item.heVal50, 0);
        const heVal100 = entries.reduce((acc, item) => acc + item.heVal100, 0);
        const heTotal = entries.reduce((acc, item) => acc + item.heTotal, 0);

        return { heVal50, heVal100, heTotal, entries };
    }

    const legacyContext = buildContextFromParams(params);
    const baseCalc = await calculateEntryBaseAndHourly(params, legacyContext);
    const valorHora = baseCalc.valorHora;

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
