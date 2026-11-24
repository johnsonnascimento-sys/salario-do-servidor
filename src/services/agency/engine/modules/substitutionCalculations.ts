/**
 * Calculos de Substituicao - JMU
 * 
 * Responsavel por calcular:
 * - Substituicao de funcao
 * - Total de substituicao
 */

import type { AdjustmentScheduleEntry, CalendarDayRange, CourtConfig, SubstitutionEntry } from '../../../../types';
import type { CalculatedSubstitutionEntry, SubstitutionFunctionDetail } from '../../../../types/irEa';
import { countCalendarRangeDaysInMonth, isCalendarDate, resolveCalendarDays, shiftCalendarDate } from '../../../../utils/calendarDaySelection';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';
import { resolveCommissionAlternativePay } from './commissionContext';

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
    if (!actual.every((item): item is DatedAdjustment => isCalendarDate(item.date) &&
        Number.isInteger(item.period) && item.period >= 0 && Number.isFinite(item.percentage))) return [];

    const ordered = actual.sort((a, b) => a.date.localeCompare(b.date));
    // As tabelas do motor acumulam reajustes na ordem do período.
    return ordered.every((item, index) => index === 0 ||
        ordered[index - 1].date < item.date && ordered[index - 1].period < item.period) ? ordered : [];
};

type PeriodTables = Awaited<ReturnType<typeof getDataForPeriod>>;

const splitByHistoricalTable = (ranges: CalendarDayRange[], schedule: DatedAdjustment[]) => {
    const groups = new Map<DatedAdjustment | undefined, CalendarDayRange[]>();
    for (const range of ranges) {
        let start = range.dataInicio;
        while (true) {
            const nextIndex = schedule.findIndex(item => item.date > start);
            const active = schedule[nextIndex < 0 ? schedule.length - 1 : nextIndex - 1];
            const next = schedule[nextIndex];
            const end = next && next.date <= range.dataFim ? shiftCalendarDate(next.date, -1) : range.dataFim;
            const group = groups.get(active) ?? [];
            group.push({ dataInicio: start, dataFim: end });
            groups.set(active, group);
            if (end === range.dataFim) break;
            start = next.date;
        }
    }
    return groups;
};

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
    const isCommissionProfile = Boolean(params.commissionProfile);
    const baseFolha = isCommissionProfile ? resolveCommissionAlternativePay(params, params.funcao)?.funcaoValor ?? 0 : getBaseAbatimento(folha);
    const substitutionEntries = params.substitutionEntries || [];
    const currentFunctionPay = (key: string) => isCommissionProfile
        ? resolveCommissionAlternativePay(params, key)?.funcaoValor ?? 0 : folha.funcoes[key] || 0;
    const funcoesSubstituicaoElegiveis = Object.keys(folha.funcoes).filter(key => currentFunctionPay(key) > baseFolha);
    const folhaSchedule = getConfiguredSchedule(config).find(item => item?.period === params.periodo);
    let historicalConfig: (CourtConfig & { adjustment_schedule: DatedAdjustment[] }) | undefined;
    const hasHistoricalValues = (tables: PeriodTables, funcKey: string) => {
        const validValue = (value: number | undefined) => value !== undefined && Number.isFinite(value) && value >= 0;
        const salary = tables.salario[params.cargo]?.[params.padrao];
        return validValue(tables.funcoes[funcKey]) && (noFunction || validValue(tables.funcoes[params.funcao])) &&
            (!hasGratification || (validValue(salary) && salary > 0 && validValue(payrollRules.specificGratificationRate))) &&
            Number.isFinite(payrollRules.monthDayDivisor) && payrollRules.monthDayDivisor > 0;
    };
    const calculateDaysMemory = async (dias: Record<string, number>, entry?: SubstitutionEntry) => {
        let rawTotal = 0;
        const detalhamentoPorFuncao: SubstitutionFunctionDetail[] = [];
        const pushDetail = (funcKey: string, safeDays: number, tables: PeriodTables, extra?: Partial<SubstitutionFunctionDetail>) => {
            let baseAbatimento = tables === folha ? baseFolha : getBaseAbatimento(tables);
            let valorDestino = tables.funcoes[funcKey] || 0;
            if (isCommissionProfile && safeDays > 0) {
                const competence = extra?.competenciaExercicio ?? params.competencia;
                try {
                    const destination = resolveCommissionAlternativePay(params, funcKey, competence);
                    const current = resolveCommissionAlternativePay(params, params.funcao, competence);
                    if (!destination || !current) throw new Error('a substituição muda a modalidade da retribuição.');
                    baseAbatimento = current.funcaoValor;
                    valorDestino = destination.funcaoValor;
                    extra = { ...extra, tabelaRemuneratoria: { periodo: params.periodo,
                        rotulo: destination.memory?.source, referencia: competence === params.competencia ? 'folha' : 'exercicio' } };
                } catch (error) {
                    if (entry?.valorBrutoManual !== undefined) return;
                    const detail = error instanceof Error ? error.message : '';
                    throw new Error(`Substituição (${funcKey.toUpperCase()}): informe o bruto documentado. ${detail}`);
                }
            } else if (isCommissionProfile) {
                valorDestino = currentFunctionPay(funcKey);
            }
            const elegivel = Boolean(valorDestino) && valorDestino > baseAbatimento;
            const diferencaMensal = elegivel ? valorDestino - baseAbatimento : 0;
            const subtotal = safeDays > 0 && elegivel
                ? (diferencaMensal / payrollRules.monthDayDivisor) * safeDays : 0;
            rawTotal += subtotal;
            detalhamentoPorFuncao.push({
                funcao: funcKey, elegivel, dias: safeDays, valorDestino, baseAbatimento,
                diferencaMensal, divisor: payrollRules.monthDayDivisor, subtotal,
                ...extra
            });
        };
        for (const [funcKey, days] of Object.entries(dias)) {
            const input = entry?.periodosPorFuncao?.[funcKey];
            if (input?.modo !== 'datas' && input?.modo !== 'avulsos') {
                pushDetail(funcKey, Math.max(0, Number(days || 0)), folha);
                continue;
            }
            const selection = resolveCalendarDays(input, params.competencia);
            if (selection.error !== undefined) {
                if (entry?.valorBrutoManual !== undefined) continue;
                throw new Error(`Substituição (${funcKey.toUpperCase()}): ${selection.error}`);
            }
            for (const month of selection.meses) {
                const pushMonthDetail = (ranges: CalendarDayRange[], tables: PeriodTables, table: NonNullable<SubstitutionFunctionDetail['tabelaRemuneratoria']>) => {
                    pushDetail(funcKey, ranges.reduce((total, range) => total + countCalendarRangeDaysInMonth(range), 0), tables, {
                        competenciaExercicio: month.competencia,
                        ...(ranges.length === 1 ? { periodo: ranges[0] } : { intervalos: ranges }),
                        tabelaRemuneratoria: table
                    });
                };
                if (month.competencia === params.competencia) {
                    pushMonthDetail(month.intervalos, folha, { periodo: params.periodo,
                        vigencia: folhaSchedule?.date, rotulo: folhaSchedule?.label, referencia: 'folha' });
                    continue;
                }
                if (isCommissionProfile) {
                    pushMonthDetail(month.intervalos, folha, { periodo: params.periodo, referencia: 'exercicio' });
                    continue;
                }
                historicalConfig ??= { ...config, adjustment_schedule: getHistoricalSchedule(config) };
                const groups = splitByHistoricalTable(month.intervalos, historicalConfig.adjustment_schedule);
                for (const [active, ranges] of groups) {
                    const tables = active && await getDataForPeriod(active.period, historicalConfig);
                    if (!active || !tables || !hasHistoricalValues(tables, funcKey)) {
                        if (entry?.valorBrutoManual !== undefined) continue;
                        const problem = tables ? 'Faltam valores ou parâmetros para calcular na tabela do mês de exercício'
                            : 'Tabela remuneratória indisponível no mês de exercício';
                        const [year, monthNumber] = month.competencia.split('-');
                        throw new Error(`Substituição (${funcKey.toUpperCase()}): ${problem} (${monthNumber}/${year}). Informe o valor bruto documentado.`);
                    }
                    pushMonthDetail(ranges, tables, { periodo: active.period, vigencia: active.date,
                        rotulo: active.label, referencia: 'exercicio' });
                }
            }
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
