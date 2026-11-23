import type { CalendarDayRange, CalendarDaySelection } from '../types';

export const getCalendarMonthBounds = (competencia = '') => {
    const iso = /^(\d{4})-(\d{2})$/.exec(competencia);
    const reference = /^(\d{2})\/(\d{4})$/.exec(competencia);
    const year = iso?.[1] ?? reference?.[2];
    const month = iso?.[2] ?? reference?.[1];
    if (!year || !month || Number(year) < 1000 || Number(month) < 1 || Number(month) > 12) return null;

    const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
    return { min: `${year}-${month}-01`, max: `${year}-${month}-${lastDay}` };
};

export const isCalendarDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const bounds = getCalendarMonthBounds(value.slice(0, 7));
    return Boolean(bounds && value >= bounds.min && value <= bounds.max);
};

export const getCalendarIntervals = (period: CalendarDaySelection): CalendarDayRange[] =>
    Array.isArray(period.intervalos) ? period.intervalos : (period.dataInicio !== undefined || period.dataFim !== undefined
        ? [{ dataInicio: period.dataInicio ?? '', dataFim: period.dataFim ?? '' }] : []);

export const shiftCalendarDate = (date: string, days: number) => {
    const utc = new Date(`${date}T00:00:00Z`);
    utc.setUTCDate(utc.getUTCDate() + days);
    return utc.toISOString().split('T')[0];
};

export const countCalendarRangeDaysInMonth = (range: CalendarDayRange) =>
    Number(range.dataFim.slice(-2)) - Number(range.dataInicio.slice(-2)) + 1;

export const formatCalendarRanges = (ranges: CalendarDayRange[]) => {
    const format = (date: string) => date.split('-').reverse().join('/');
    return ranges.map(({ dataInicio, dataFim }) => dataInicio === dataFim ? format(dataInicio)
        : `${format(dataInicio)} a ${format(dataFim)}`).join(', ');
};

interface CalendarMonthSelection {
    competencia: string;
    dias: number;
    intervalos: CalendarDayRange[];
}

export const resolveCalendarDays = (
    period: CalendarDaySelection, competencia?: string, { serviceMonthOnly = false, latestMonthLabel = 'mês do pagamento' } = {}
): { meses: CalendarMonthSelection[]; dias: number; error?: never } | { meses?: never; dias?: never; error: string } => {
    if ((period.modo === 'avulsos' && period.diasAvulsos !== undefined && !Array.isArray(period.diasAvulsos)) ||
        (period.modo === 'datas' && period.intervalos !== undefined && !Array.isArray(period.intervalos))) {
        return { error: 'Revise as datas selecionadas.' };
    }
    const ranges = period.modo === 'avulsos'
        ? (period.diasAvulsos ?? []).map(date => ({ dataInicio: date, dataFim: date }))
        : getCalendarIntervals(period);
    if (!ranges.length) return { error: period.modo === 'avulsos' ? 'Marque pelo menos um dia.' : 'Informe as datas de início e fim.' };
    const bounds = getCalendarMonthBounds(competencia);
    for (const range of ranges) {
        const start = range?.dataInicio;
        const end = range?.dataFim;
        if (!start || !end) return { error: 'Informe as datas de início e fim.' };
        if (!isCalendarDate(start) || !isCalendarDate(end)) return { error: 'Informe datas válidas.' };
        if (end < start) return { error: 'A data de fim deve ser igual ou posterior à data de início.' };
        if (serviceMonthOnly && (!bounds || start < bounds.min || end > bounds.max)) {
            return { error: 'Selecione datas dentro do mês de serviço indicado.' };
        }
        if (!bounds || end > bounds.max) return { error: `As datas devem ficar até o fim do ${latestMonthLabel}.` };
    }

    const merged: CalendarDayRange[] = [];
    for (const range of [...ranges].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))) {
        const last = merged[merged.length - 1];
        if (last && (range.dataInicio <= last.dataFim || range.dataInicio === shiftCalendarDate(last.dataFim, 1))) {
            if (range.dataFim > last.dataFim) last.dataFim = range.dataFim;
        } else {
            merged.push({ ...range });
        }
    }

    const months = new Map<string, CalendarMonthSelection>();
    let dias = 0;
    for (const range of merged) {
        let start = range.dataInicio;
        while (true) {
            const month = start.slice(0, 7);
            const last = getCalendarMonthBounds(month)!.max;
            const end = range.dataFim < last ? range.dataFim : last;
            const part = { dataInicio: start, dataFim: end };
            const count = countCalendarRangeDaysInMonth(part);
            const selected = months.get(month) ?? { competencia: month, dias: 0, intervalos: [] };
            selected.intervalos.push(part);
            selected.dias += count;
            dias += count;
            months.set(month, selected);
            if (end === range.dataFim) break;
            start = shiftCalendarDate(end, 1);
        }
    }
    return { meses: [...months.values()], dias };
};
