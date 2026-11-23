import type { SubstitutionPeriod } from '../types';

export const getSubstitutionMonthBounds = (competencia = '') => {
    const iso = /^(\d{4})-(\d{2})$/.exec(competencia);
    const reference = /^(\d{2})\/(\d{4})$/.exec(competencia);
    const year = iso?.[1] ?? reference?.[2];
    const month = iso?.[2] ?? reference?.[1];
    if (!year || !month || Number(year) < 1000 || Number(month) < 1 || Number(month) > 12) return null;

    const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
    return { min: `${year}-${month}-01`, max: `${year}-${month}-${lastDay}` };
};

export const resolveSubstitutionPeriod = (
    { dataInicio, dataFim }: Pick<SubstitutionPeriod, 'dataInicio' | 'dataFim'>,
    competencia?: string
): { dias: number; error?: never } | { dias?: never; error: string } => {
    if (!dataInicio || !dataFim) return { error: 'Informe as datas de início e fim.' };

    const bounds = getSubstitutionMonthBounds(competencia);
    const inMonth = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && bounds && date >= bounds.min && date <= bounds.max;
    if (!inMonth(dataInicio) || !inMonth(dataFim)) return { error: 'Informe datas válidas dentro do mês da competência.' };
    if (dataFim < dataInicio) return { error: 'A data de fim deve ser igual ou posterior à data de início.' };

    return { dias: Number(dataFim.slice(-2)) - Number(dataInicio.slice(-2)) + 1 };
};
