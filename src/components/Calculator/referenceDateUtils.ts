export const MONTH_TOKEN_TO_INDEX: Record<string, number> = {
    jan: 1,
    janeiro: 1,
    fev: 2,
    fevereiro: 2,
    mar: 3,
    marco: 3,
    abril: 4,
    abr: 4,
    mai: 5,
    maio: 5,
    jun: 6,
    junho: 6,
    jul: 7,
    julho: 7,
    ago: 8,
    agosto: 8,
    set: 9,
    setembro: 9,
    out: 10,
    outubro: 10,
    nov: 11,
    novembro: 11,
    dez: 12,
    dezembro: 12
};

interface ParsedReferenceKey {
    key: string;
    year: number;
    month: number;
}

export interface ReferencePoint {
    year: number;
    month: number;
}

interface LabeledValueOption {
    label: string;
    value: number;
}

interface ScheduleEntry {
    period: number;
    date?: string;
}

export const normalizeReferenceToken = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const parseReferenceKey = (key: string): ParsedReferenceKey | null => {
    const normalized = normalizeReferenceToken(key);
    const yearMatch = normalized.match(/(19|20)\d{2}/);
    if (!yearMatch) return null;

    const year = Number(yearMatch[0]);
    const monthToken = normalized
        .slice((yearMatch.index ?? 0) + yearMatch[0].length)
        .replace(/[^a-z]/g, '');
    const month = MONTH_TOKEN_TO_INDEX[monthToken] ?? 0;

    return { key, year, month };
};

export const parseReferencePointFromKey = (key: string): ReferencePoint | null => {
    const parsed = parseReferenceKey(key);
    if (!parsed) return null;
    return {
        year: parsed.year,
        month: parsed.month || 12
    };
};

const sortByReferenceDesc = (a: ParsedReferenceKey, b: ParsedReferenceKey) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.key.localeCompare(b.key);
};

export const toReferenceMonthIndex = (monthLabel: string) => {
    const normalized = normalizeReferenceToken(monthLabel);
    const compactToken = normalized.replace(/[^a-z]/g, '');
    return MONTH_TOKEN_TO_INDEX[compactToken] ?? MONTH_TOKEN_TO_INDEX[normalized] ?? 0;
};

export const pickBestKeyByReference = (
    options: string[],
    referenceYear: number,
    referenceMonth: number
) => {
    if (options.length === 0) return '';

    const parsed = options
        .map(parseReferenceKey)
        .filter((value): value is ParsedReferenceKey => value !== null);

    if (parsed.length === 0) return options[0];

    const sorted = parsed.sort(sortByReferenceDesc);
    const applicable = sorted.find((option) => (
        option.year < referenceYear ||
        (option.year === referenceYear && (option.month === 0 || option.month <= referenceMonth))
    ));

    return (applicable || sorted[sorted.length - 1]).key;
};

export const pickBestMenuOptionByReference = (
    options: LabeledValueOption[],
    referenceYear: number,
    referenceMonth: number
) => {
    if (options.length === 0) return null;

    const withParsed = options
        .map((option) => ({
            option,
            parsed: parseReferenceKey(option.label)
        }))
        .filter((entry): entry is { option: LabeledValueOption; parsed: ParsedReferenceKey } => entry.parsed !== null);

    if (withParsed.length === 0) return options[0];

    const sorted = withParsed.sort((a, b) => sortByReferenceDesc(a.parsed, b.parsed));
    const applicable = sorted.find((entry) => (
        entry.parsed.year < referenceYear ||
        (entry.parsed.year === referenceYear && (entry.parsed.month === 0 || entry.parsed.month <= referenceMonth))
    ));

    return (applicable || sorted[sorted.length - 1]).option;
};

export const pickPeriodFromScheduleByReference = (
    schedules: ScheduleEntry[],
    referenceYear: number,
    referenceMonth: number
) => {
    if (!Array.isArray(schedules) || schedules.length === 0) {
        return null;
    }

    const referenceTimestamp = new Date(referenceYear, Math.max(0, referenceMonth - 1), 1).getTime();
    const withDate = schedules
        .filter((entry) => !!entry.date)
        .map((entry) => ({
            period: entry.period,
            timestamp: new Date(`${entry.date}T12:00:00`).getTime(),
        }))
        .filter((entry) => Number.isFinite(entry.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp);

    if (withDate.length === 0) {
        return null;
    }

    const applicable = withDate.filter((entry) => entry.timestamp <= referenceTimestamp).pop();
    return (applicable || withDate[0]).period;
};

export const parseReferencePointFromDate = (dateValue: string): ReferencePoint | null => {
    if (!dateValue) return null;
    const date = new Date(`${dateValue}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return null;
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
    };
};

export const compareReferencePoints = (a: ReferencePoint, b: ReferencePoint) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
};

export const pickMinReferencePoint = (points: ReferencePoint[]) => {
    if (!points.length) return null;
    return points.reduce((min, current) => compareReferencePoints(current, min) < 0 ? current : min);
};

export const pickMaxReferencePoint = (points: ReferencePoint[]) => {
    if (!points.length) return null;
    return points.reduce((max, current) => compareReferencePoints(current, max) > 0 ? current : max);
};

