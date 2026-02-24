import { DailiesConfig } from '../types';

export interface DailiesDiscountRules {
    foodDivisor: number;
    transportDivisor: number;
    excludeWeekendsAndHolidays: boolean;
    holidays: string[];
}

interface ResolveDiscountDaysInput {
    mode: 'periodo' | 'manual';
    startDate: string;
    endDate: string;
    manualFoodDays: number;
    manualTransportDays: number;
    applyFoodDiscount: boolean;
    applyTransportDiscount: boolean;
    fallbackDays: number;
    rules: DailiesDiscountRules;
}

interface LdoCapInput {
    dailiesQty: number;
    dailiesRate: number;
    embarkationAdditional: number;
    enabled: boolean;
    perDiemLimit: number;
}

interface ResolveDailyRateInput {
    dailiesConfig: DailiesConfig | undefined;
    cargo: string;
    hasCommissionRole: boolean;
}

interface ResolveEmbarkationInput {
    dailiesConfig: DailiesConfig | undefined;
    embarkationType: 'nenhum' | 'metade' | 'completo';
}

const normalizeIsoDate = (value: string): string | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const normalized = `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
    return normalized === value ? value : null;
};

const toUtcDate = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const toIsoDate = (date: Date) => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const normalizeKey = (value: string) => String(value || '').trim().toLowerCase();

const pickCaseInsensitive = (values: Record<string, number> | undefined, keyCandidates: string[]): number | null => {
    if (!values) return null;

    const normalizedMap = new Map(
        Object.entries(values).map(([key, value]) => [normalizeKey(key), Number(value)])
    );

    for (const key of keyCandidates) {
        const normalized = normalizeKey(key);
        if (!normalized) continue;
        const value = normalizedMap.get(normalized);
        if (Number.isFinite(value)) return Number(value);
    }

    return null;
};

const resolveRateKeyCandidates = (cargo: string, hasCommissionRole: boolean) => {
    if (hasCommissionRole) {
        return ['cj', 'cargo_comissao', 'comissao'];
    }

    const normalizedCargo = normalizeKey(cargo);
    if (!normalizedCargo) return [];
    if (normalizedCargo.includes('analista')) return ['analista'];
    if (normalizedCargo.includes('tecnico')) return ['tecnico'];
    if (normalizedCargo.includes('juiz')) return ['juiz'];
    return [normalizedCargo];
};

export const resolveDailiesDailyRate = ({
    dailiesConfig,
    cargo,
    hasCommissionRole
}: ResolveDailyRateInput): number => {
    const fallbackCandidates = resolveRateKeyCandidates(cargo, hasCommissionRole);
    const fallbackRate = pickCaseInsensitive(dailiesConfig?.rates, fallbackCandidates) ?? 0;

    const derived = dailiesConfig?.derivedFromMinister;
    if (!derived?.enabled) {
        return Math.max(0, fallbackRate);
    }

    const ministerPerDiem = Math.max(0, Number(derived.ministerPerDiem || 0));
    if (ministerPerDiem <= 0) {
        return Math.max(0, fallbackRate);
    }

    const percentage = pickCaseInsensitive(derived.ratesPercentages, fallbackCandidates) ?? 0;
    if (percentage <= 0) {
        return Math.max(0, fallbackRate);
    }

    return round2(ministerPerDiem * percentage);
};

export const resolveDailiesEmbarkationAdditional = ({
    dailiesConfig,
    embarkationType
}: ResolveEmbarkationInput): number => {
    if (embarkationType === 'nenhum') return 0;

    const fallback = embarkationType === 'completo'
        ? Number(dailiesConfig?.embarkationAdditional?.completo ?? 0)
        : Number(dailiesConfig?.embarkationAdditional?.metade ?? 0);

    const derived = dailiesConfig?.derivedFromMinister;
    if (!derived?.enabled) {
        return Math.max(0, fallback);
    }

    const ministerPerDiem = Math.max(0, Number(derived.ministerPerDiem || 0));
    if (ministerPerDiem <= 0) {
        return Math.max(0, fallback);
    }

    const fullPercentage = Math.max(0, Number(derived.embarkationPercentageFull || 0));
    const halfPercentage = derived.embarkationPercentageHalf !== undefined
        ? Math.max(0, Number(derived.embarkationPercentageHalf || 0))
        : fullPercentage / 2;

    const percentage = embarkationType === 'completo' ? fullPercentage : halfPercentage;
    if (percentage <= 0) {
        return Math.max(0, fallback);
    }

    return round2(ministerPerDiem * percentage);
};

export const resolveDailiesDiscountRules = (
    dailiesConfig: DailiesConfig | undefined,
    fallbackDivisor: number
): DailiesDiscountRules => {
    const fallback = Math.max(1, Number.isFinite(fallbackDivisor) ? fallbackDivisor : 22);
    const rules = dailiesConfig?.discountRules;
    const foodDivisorRaw = Number(rules?.foodDivisor);
    const transportDivisorRaw = Number(rules?.transportDivisor);
    const foodDivisor = Number.isFinite(foodDivisorRaw) && foodDivisorRaw > 0 ? foodDivisorRaw : fallback;
    const transportDivisor = Number.isFinite(transportDivisorRaw) && transportDivisorRaw > 0 ? transportDivisorRaw : fallback;

    return {
        foodDivisor,
        transportDivisor,
        excludeWeekendsAndHolidays: Boolean(rules?.excludeWeekendsAndHolidays),
        holidays: Array.isArray(rules?.holidays) ? rules!.holidays : []
    };
};

export const countCalendarDaysInRange = (
    startDate: string,
    endDate: string
): number | null => {
    const normalizedStart = normalizeIsoDate(startDate);
    const normalizedEnd = normalizeIsoDate(endDate);
    if (!normalizedStart || !normalizedEnd) {
        return null;
    }

    let start = toUtcDate(normalizedStart);
    let end = toUtcDate(normalizedEnd);
    if (start.getTime() > end.getTime()) {
        [start, end] = [end, start];
    }

    let days = 0;
    const cursor = new Date(start.getTime());
    while (cursor.getTime() <= end.getTime()) {
        days += 1;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
};

export const countDeductibleDaysInRange = (
    startDate: string,
    endDate: string,
    rules: DailiesDiscountRules
): number | null => {
    const normalizedStart = normalizeIsoDate(startDate);
    const normalizedEnd = normalizeIsoDate(endDate);
    if (!normalizedStart || !normalizedEnd) {
        return null;
    }

    let start = toUtcDate(normalizedStart);
    let end = toUtcDate(normalizedEnd);
    if (start.getTime() > end.getTime()) {
        [start, end] = [end, start];
    }

    const holidays = new Set(
        (rules.holidays || [])
            .map(normalizeIsoDate)
            .filter((value): value is string => !!value)
    );

    let deductibleDays = 0;
    const cursor = new Date(start.getTime());
    while (cursor.getTime() <= end.getTime()) {
        const iso = toIsoDate(cursor);
        const dayOfWeek = cursor.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.has(iso);

        const shouldSkip = rules.excludeWeekendsAndHolidays && (isWeekend || isHoliday);
        if (!shouldSkip) {
            deductibleDays += 1;
        }

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return deductibleDays;
};

export const resolveDailiesDiscountDays = ({
    mode,
    startDate,
    endDate,
    manualFoodDays,
    manualTransportDays,
    applyFoodDiscount,
    applyTransportDiscount,
    fallbackDays,
    rules
}: ResolveDiscountDaysInput) => {
    const normalizedFallbackDays = Math.max(0, Number(fallbackDays) || 0);
    const normalizedManualFoodDays = Math.max(0, Number(manualFoodDays) || 0);
    const normalizedManualTransportDays = Math.max(0, Number(manualTransportDays) || 0);

    if (mode === 'manual') {
        return {
            foodDays: applyFoodDiscount ? normalizedManualFoodDays : 0,
            transportDays: applyTransportDiscount ? normalizedManualTransportDays : 0
        };
    }

    const autoDays = countDeductibleDaysInRange(startDate, endDate, rules);
    const resolvedAutoDays = autoDays !== null ? autoDays : normalizedFallbackDays;

    return {
        foodDays: applyFoodDiscount ? resolvedAutoDays : 0,
        transportDays: applyTransportDiscount ? resolvedAutoDays : 0
    };
};

export const applyLdoCapToDailiesGross = ({
    dailiesQty,
    dailiesRate,
    embarkationAdditional,
    enabled,
    perDiemLimit
}: LdoCapInput) => {
    const normalizedQty = Math.max(0, Number(dailiesQty) || 0);
    const normalizedRate = Math.max(0, Number(dailiesRate) || 0);
    const normalizedEmbarkation = Math.max(0, Number(embarkationAdditional) || 0);
    const gross = round2((normalizedQty * normalizedRate) + normalizedEmbarkation);

    if (!enabled || perDiemLimit <= 0) {
        return {
            gross,
            maxAllowed: gross,
            cut: 0
        };
    }

    const normalizedLimit = Math.max(0, Number(perDiemLimit) || 0);
    const fullDays = Math.floor(normalizedQty);
    const partialQty = Math.max(0, normalizedQty - fullDays);
    const partialAmount = (partialQty * normalizedRate) + normalizedEmbarkation;
    const maxAllowed = round2((fullDays * normalizedLimit) + Math.min(partialAmount, normalizedLimit));
    const cut = round2(Math.max(0, gross - maxAllowed));

    return {
        gross,
        maxAllowed,
        cut
    };
};
