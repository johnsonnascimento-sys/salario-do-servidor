import type { SubstitutionDateRange, SubstitutionPeriod } from '../types';

export const getSubstitutionMonthBounds = (competencia = '') => {
    const iso = /^(\d{4})-(\d{2})$/.exec(competencia);
    const reference = /^(\d{2})\/(\d{4})$/.exec(competencia);
    const year = iso?.[1] ?? reference?.[2];
    const month = iso?.[2] ?? reference?.[1];
    if (!year || !month || Number(year) < 1000 || Number(month) < 1 || Number(month) > 12) return null;

    const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
    return { min: `${year}-${month}-01`, max: `${year}-${month}-${lastDay}` };
};

export const isSubstitutionCalendarDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const bounds = getSubstitutionMonthBounds(value.slice(0, 7));
    return Boolean(bounds && value >= bounds.min && value <= bounds.max);
};

export const getSubstitutionIntervals = (period: SubstitutionPeriod): SubstitutionDateRange[] =>
    Array.isArray(period.intervalos) ? period.intervalos : (period.dataInicio !== undefined || period.dataFim !== undefined
        ? [{ dataInicio: period.dataInicio ?? '', dataFim: period.dataFim ?? '' }] : []);

export const shiftSubstitutionDate = (date: string, days: number) => {
    const utc = new Date(`${date}T00:00:00Z`);
    utc.setUTCDate(utc.getUTCDate() + days);
    return utc.toISOString().split('T')[0];
};

export const countSubstitutionDaysInMonth = (range: SubstitutionDateRange) =>
    Number(range.dataFim.slice(-2)) - Number(range.dataInicio.slice(-2)) + 1;

export interface SubstitutionMonthSelection {
    competencia: string;
    dias: number;
    intervalos: SubstitutionDateRange[];
}

export const resolveSubstitutionDates = (
    period: SubstitutionPeriod, competencia?: string
): { meses: SubstitutionMonthSelection[]; dias: number; error?: never } | { meses?: never; dias?: never; error: string } => {
    if ((period.modo === 'avulsos' && period.diasAvulsos !== undefined && !Array.isArray(period.diasAvulsos)) ||
        (period.modo === 'datas' && period.intervalos !== undefined && !Array.isArray(period.intervalos))) {
        return { error: 'Revise as datas selecionadas.' };
    }
    const ranges = period.modo === 'avulsos'
        ? (period.diasAvulsos ?? []).map(date => ({ dataInicio: date, dataFim: date }))
        : getSubstitutionIntervals(period);
    if (!ranges.length) return { error: period.modo === 'avulsos' ? 'Marque pelo menos um dia.' : 'Informe as datas de início e fim.' };
    const payment = getSubstitutionMonthBounds(competencia);
    for (const range of ranges) {
        const start = range?.dataInicio;
        const end = range?.dataFim;
        if (!start || !end) return { error: 'Informe as datas de início e fim.' };
        if (!isSubstitutionCalendarDate(start) || !isSubstitutionCalendarDate(end)) return { error: 'Informe datas válidas.' };
        if (end < start) return { error: 'A data de fim deve ser igual ou posterior à data de início.' };
        if (!payment || end > payment.max) return { error: 'As datas devem ficar até o fim do mês do pagamento.' };
    }

    const merged: SubstitutionDateRange[] = [];
    for (const range of [...ranges].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))) {
        const last = merged[merged.length - 1];
        if (last && (range.dataInicio <= last.dataFim || range.dataInicio === shiftSubstitutionDate(last.dataFim, 1))) {
            if (range.dataFim > last.dataFim) last.dataFim = range.dataFim;
        } else {
            merged.push({ ...range });
        }
    }

    const months = new Map<string, SubstitutionMonthSelection>();
    let dias = 0;
    for (const range of merged) {
        let start = range.dataInicio;
        while (true) {
            const month = start.slice(0, 7);
            const last = getSubstitutionMonthBounds(month)!.max;
            const end = range.dataFim < last ? range.dataFim : last;
            const part = { dataInicio: start, dataFim: end };
            const count = countSubstitutionDaysInMonth(part);
            const selected = months.get(month) ?? { competencia: month, dias: 0, intervalos: [] };
            selected.intervalos.push(part);
            selected.dias += count;
            dias += count;
            months.set(month, selected);
            if (end === range.dataFim) break;
            start = shiftSubstitutionDate(end, 1);
        }
    }
    return { meses: [...months.values()], dias };
};
