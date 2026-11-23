/**
 * Calculos de Substituicao - JMU
 * 
 * Responsavel por calcular:
 * - Substituicao de funcao
 * - Total de substituicao
 */

import type { AdjustmentScheduleEntry, CourtConfig, SubstitutionEntry } from '../../../../types';
import type { CalculatedSubstitutionEntry, SubstitutionFunctionDetail } from '../../../../types/irEa';
import { isSubstitutionCalendarDate, resolveSubstitutionPeriod } from '../../../../utils/substitutionPeriod';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

export interface SubstitutionResult {
    total: number;
    entries: CalculatedSubstitutionEntry[];
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const getConfiguredSchedule = (config: CourtConfig): AdjustmentScheduleEntry[] => {
    const configured = config.adjustment_schedule ?? config.values?.adjustment_schedule ?? config.values?.reajustes;
    return Array.isArray(configured) ? configured : [];
};

type DatedAdjustment = AdjustmentScheduleEntry & { date: string };

const getHistoricalSchedule = (config: CourtConfig): DatedAdjustment[] => {
    const configured = getConfiguredSchedule(config);
    const actual = configured.filter(item => item && !item.vetoed &&
        (item.status === undefined || item.status === 'promulgated'));
    if (!actual.every((item): item is DatedAdjustment => isSubstitutionCalendarDate(item.date) &&
        Number.isInteger(item.period) && item.period >= 0 && Number.isFinite(item.percentage))) return [];

    const ordered = actual.sort((a, b) => a.date.localeCompare(b.date));
    // As tabelas do motor acumulam reajustes na ordem do período.
    return ordered.every((item, index) => index === 0 ||
        ordered[index - 1].date < item.date && ordered[index - 1].period < item.period) ? ordered : [];
};

type PeriodTables = Awaited<ReturnType<typeof getDataForPeriod>>;

// Concilia a memória com o total já arredondado, sem mudar o valor da rubrica.
const reconcileDetailCents = (details: SubstitutionFunctionDetail[], total: number) => {
    const allocations = details.map(detail => {
        const cents = detail.subtotal * 100;
        return { detail, cents: Math.floor(cents), remainder: cents - Math.floor(cents) };
    });
    let remaining = Math.round(total * 100) - allocations.reduce((sum, item) => sum + item.cents, 0);
    const ranked = allocations.filter(item => item.detail.subtotal > 0).sort((a, b) =>
        b.remainder - a.remainder || (a.detail.funcao < b.detail.funcao ? -1 : a.detail.funcao > b.detail.funcao ? 1 : 0)
    );
    for (const item of ranked) {
        if (remaining <= 0) break;
        item.cents += 1;
        remaining -= 1;
    }
    for (const item of allocations) item.detail.subtotal = item.cents / 100;
};

/**
 * Calcula Substituicao de Funcao
 */
export async function calculateSubstitution(params: IAgencyCalculationParams): Promise<SubstitutionResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const folha = await getDataForPeriod(params.periodo, config);
    const hasGratification = params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas';
    const noFunction = isNoFunction(params.funcao, config);
    const getBaseAbatimento = ({ funcoes, salario }: PeriodTables) => {
        const gratification = hasGratification ? (salario[params.cargo]?.[params.padrao] || 0) * payrollRules.specificGratificationRate : 0;
        return (noFunction ? 0 : (funcoes[params.funcao] || 0)) + gratification;
    };
    const baseFolha = getBaseAbatimento(folha);
    const substitutionEntries = params.substitutionEntries || [];
    const funcoesSubstituicaoElegiveis = Object.keys(folha.funcoes).filter(key => Boolean(folha.funcoes[key]) && folha.funcoes[key] > baseFolha);
    const folhaSchedule = getConfiguredSchedule(config).find(item => item?.period === params.periodo);
    let historicalConfig: (CourtConfig & { adjustment_schedule: DatedAdjustment[] }) | undefined;
    const getHistoricalTables = async (dataInicio: string, dataFim: string, funcKey: string) => {
        historicalConfig ??= { ...config, adjustment_schedule: getHistoricalSchedule(config) };
        const schedule = historicalConfig.adjustment_schedule;
        const vigente = schedule.filter(item => item.date <= dataInicio).pop();
        if (!vigente) return { error: 'Tabela remuneratória indisponível no mês de exercício. Informe o valor bruto documentado.' } as const;
        if (schedule.some(item => item.date > dataInicio && item.date <= dataFim)) {
            return { error: 'A tabela muda dentro do período. Separe os dias em cards distintos ou informe o valor bruto documentado.' } as const;
        }
        const tables = await getDataForPeriod(vigente.period, historicalConfig);
        const validValue = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value >= 0;
        if (!validValue(tables.funcoes[funcKey]) || (!noFunction && !validValue(tables.funcoes[params.funcao])) ||
            (hasGratification && (!(tables.salario[params.cargo]?.[params.padrao] > 0) ||
                !validValue(tables.salario[params.cargo]?.[params.padrao]) || !validValue(payrollRules.specificGratificationRate))) ||
            !Number.isFinite(payrollRules.monthDayDivisor) || payrollRules.monthDayDivisor <= 0) {
            return { error: 'Faltam valores ou parâmetros para calcular na tabela do mês de exercício. Informe o valor bruto documentado.' } as const;
        }
        return { tables, vigente } as const;
    };
    const calculateDaysMemory = async (dias: Record<string, number>, entry?: SubstitutionEntry) => {
        let rawTotal = 0;
        const detalhamentoPorFuncao: SubstitutionFunctionDetail[] = [];
        for (const [funcKey, days] of Object.entries(dias)) {
            const input = entry?.periodosPorFuncao?.[funcKey];
            let safeDays = Math.max(0, Number(days || 0));
            let period: SubstitutionFunctionDetail['periodo'];
            let tabela: SubstitutionFunctionDetail['tabelaRemuneratoria'];
            let tables = folha;
            let baseAbatimento = baseFolha;
            if (input?.modo === 'datas') {
                const range = resolveSubstitutionPeriod(input, params.competencia);
                if (range.error !== undefined) {
                    if (entry?.valorBrutoManual !== undefined) continue;
                    throw new Error(`Substituição (${funcKey.toUpperCase()}): ${range.error}`);
                }
                safeDays = range.dias;
                period = { dataInicio: input.dataInicio, dataFim: input.dataFim };
                if (range.competenciaExercicio !== params.competencia) {
                    const historical = await getHistoricalTables(input.dataInicio, input.dataFim, funcKey);
                    if (historical.error !== undefined) {
                        if (entry?.valorBrutoManual !== undefined) continue;
                        throw new Error(`Substituição (${funcKey.toUpperCase()}): ${historical.error}`);
                    }
                    tables = historical.tables;
                    baseAbatimento = getBaseAbatimento(tables);
                    tabela = { periodo: historical.vigente.period, vigencia: historical.vigente.date,
                        rotulo: historical.vigente.label, referencia: 'exercicio' };
                } else {
                    tabela = { periodo: params.periodo, vigencia: folhaSchedule?.date, rotulo: folhaSchedule?.label, referencia: 'folha' };
                }
            }
            const valorDestino = tables.funcoes[funcKey] || 0;
            const elegivel = Boolean(valorDestino) && valorDestino > baseAbatimento;
            const diferencaMensal = elegivel ? valorDestino - baseAbatimento : 0;
            const subtotal = safeDays > 0 && elegivel
                ? (diferencaMensal / payrollRules.monthDayDivisor) * safeDays : 0;
            rawTotal += subtotal;
            detalhamentoPorFuncao.push({
                funcao: funcKey, elegivel, dias: safeDays, valorDestino, baseAbatimento,
                diferencaMensal, divisor: payrollRules.monthDayDivisor, subtotal,
                ...(period && { periodo: period }),
                ...(tabela && { tabelaRemuneratoria: tabela })
            });
        }
        const totalPorDias = roundCurrency(rawTotal);
        reconcileDetailCents(detalhamentoPorFuncao, totalPorDias);
        return { totalPorDias, detalhamentoPorFuncao };
    };

    if (substitutionEntries.length > 0) {
        const entries = await Promise.all(substitutionEntries.map(async (entry, index): Promise<CalculatedSubstitutionEntry> => {
            const memory = await calculateDaysMemory(entry.dias || {}, entry);
            let entryTotal = memory.totalPorDias;

            if (entry.valorBrutoManual !== undefined) {
                if (!Number.isFinite(entry.valorBrutoManual) || entry.valorBrutoManual < 0) {
                    throw new Error('IR-EA: valor bruto manual de substituição inválido.');
                }
                entryTotal = entry.valorBrutoManual;
            }

            return {
                id: entry.id || `subst-${index}`,
                total: Math.round(entryTotal * 100) / 100,
                isEA: Boolean(entry.isEA),
                excluirIR: Boolean(entry.excluirIR),
                pssIsEA: Boolean(entry.pssIsEA),
                funcoesSubstituicaoElegiveis,
                ...memory,
                origemValor: entry.valorBrutoManual !== undefined ? 'manual' : 'dias'
            };
        }));

        const total = Math.round(entries.reduce((acc, item) => acc + item.total, 0) * 100) / 100;
        return { total, entries };
    }

    const memory = await calculateDaysMemory(params.substDias || {});
    const total = memory.totalPorDias;
    return {
        total,
        entries: [
            {
                id: 'legacy-subst',
                total,
                isEA: Boolean(params.substIsEA),
                excluirIR: Boolean(params.substExcluirIR),
                pssIsEA: Boolean(params.substPssIsEA),
                funcoesSubstituicaoElegiveis,
                ...memory,
                origemValor: 'dias'
            }
        ]
    };
}
