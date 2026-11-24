import type { ConstitutionalCeilingReference, ConstitutionalCeilingVersion } from '../../types/constitutionalCeiling';

const isIsoDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isHttpsSource = (value: unknown): boolean => {
    if (typeof value !== 'string' || !/^https:\/\/\S+$/i.test(value)) return false;
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
};

export function resolveConstitutionalCeiling(
    reference: ConstitutionalCeilingReference | undefined,
    year: number,
    month: number,
): ConstitutionalCeilingVersion | undefined {
    if (!Array.isArray(reference?.versions) || !Number.isInteger(year) || year < 1 || year > 9999 ||
        !Number.isInteger(month) || month < 1 || month > 12) return undefined;

    const competence = String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-01';
    let applicable: ConstitutionalCeilingVersion | undefined;
    for (const version of reference.versions) {
        if (!version || !isIsoDate(version.valid_from) || !version.valid_from.endsWith('-01') ||
            (version.valid_to !== null && (!isIsoDate(version.valid_to) || version.valid_to < version.valid_from)) ||
            !Number.isFinite(version.amount) || version.amount <= 0 || !isHttpsSource(version.source)) return undefined;

        if (version.valid_from <= competence && (version.valid_to === null || competence <= version.valid_to)) {
            if (applicable) return undefined;
            applicable = version;
        }
    }
    return applicable;
}
