import { DailiesConfig } from '../types';

export interface DailiesDiscountRules {
    foodDivisor: number;
    transportDivisor: number;
    excludeWeekendsAndHolidays: boolean;
    holidays: string[];
    halfDailyOnBusinessReturnDay?: boolean;
    halfDiscountOnBusinessReturnDay?: boolean;
    holidayCalendarLabel?: string;
    holidayCalendarReference?: string;
    holidayCalendarVersion?: string;
}

export interface DailiesRangeSummary {
    totalDays: number;
    deductibleDays: number;
    excludedDays: number;
    weekendDays: number;
    weekdayHolidayDays: number;
    weekendHolidayDays: number;
    weekendExcludedDates: string[];
    holidayExcludedDates: string[];
}

export interface DailiesPeriodModeSummary extends DailiesRangeSummary {
    payableDays: number;
    discountDays: number;
    returnDate: string;
    returnDateIsWeekend: boolean;
    returnDateIsHoliday: boolean;
    returnDateIsBusinessDay: boolean;
    halfDailyApplied: boolean;
    halfDiscountApplied: boolean;
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

export type DiariasAutoridadeAssistida =
    | 'ministro_cjf'
    | 'ministro_stm'
    | 'desembargador_trf'
    | 'juiz_federal'
    | 'juiz_militar';

export interface ResolveDailyRateInput {
    dailiesConfig: DailiesConfig | undefined;
    cargo: string;
    funcao?: string;
    hasCommissionRole?: boolean;
    assessoramentoMagistrado?: boolean;
    autoridadeAssistida?: DiariasAutoridadeAssistida;
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

const normalizeKey = (value: string) =>
    String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

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

export const resolveRateKeyCandidates = (
    cargo: string,
    funcao?: string,
    hasCommissionRole?: boolean
): string[] => {
    const candidates: string[] = [];
    const rawFuncao = normalizeKey(funcao || '');
    const cleanFuncao = rawFuncao.replace(/[\s\-_]/g, '');
    const isCommission = Boolean(hasCommissionRole || cleanFuncao.startsWith('cj'));

    if (isCommission) {
        if (cleanFuncao) {
            candidates.push(cleanFuncao);
        }
        candidates.push('cj', 'cargo_comissao', 'comissao');
    } else if (cleanFuncao) {
        candidates.push(cleanFuncao);
    }

    const normalizedCargo = normalizeKey(cargo);
    if (normalizedCargo.includes('desembargador')) {
        candidates.push('desembargador', 'juiz', 'magistrado');
    } else if (normalizedCargo.includes('substituto')) {
        candidates.push('juiz_substituto', 'juiz', 'magistrado');
    } else if (normalizedCargo.includes('juiz') || normalizedCargo.includes('magistrado')) {
        candidates.push('juiz_titular', 'juiz', 'magistrado');
    } else if (normalizedCargo.includes('analista')) {
        candidates.push('analista', 'analista_judiciario');
    } else if (normalizedCargo.includes('tecnico')) {
        candidates.push('tecnico', 'tecnico_judiciario');
    } else if (normalizedCargo.includes('auxiliar')) {
        candidates.push('auxiliar', 'auxiliar_judiciario');
    } else if (normalizedCargo) {
        candidates.push(normalizedCargo);
    }

    return Array.from(new Set(candidates));
};

const buildHolidaySet = (rules: DailiesDiscountRules) => {
    return new Set(
        (rules.holidays || [])
            .map(normalizeIsoDate)
            .filter((value): value is string => !!value)
    );
};

export const resolveAssistedAuthorityDailyRate = (
    dailiesConfig: DailiesConfig | undefined,
    autoridade?: DiariasAutoridadeAssistida,
    orgSlug?: string
): { authorityRate: number; serverRate: number; authorityLabel: string } => {
    const derived = dailiesConfig?.derivedFromMinister;
    const ministerPerDiem = Math.max(0, Number(derived?.ministerPerDiem || 1466.95));
    const assistRatio = Number(derived?.assistancePercentage ?? 0.80);

    const isJmu = Boolean(
        orgSlug === 'jmu' ||
        orgSlug === 'stm' ||
        dailiesConfig?.branchId === 'jmu' ||
        dailiesConfig?.branchId === 'stm' ||
        dailiesConfig?.orgSlug === 'jmu' ||
        dailiesConfig?.orgSlug === 'stm' ||
        dailiesConfig?.normativeInfo?.localRuleLabel?.includes('STM') ||
        dailiesConfig?.normativeInfo?.localRuleLabel?.includes('JMU') ||
        dailiesConfig?.normativeInfo?.branchRuleLabel?.includes('STM') ||
        dailiesConfig?.normativeInfo?.branchRuleLabel?.includes('JMU') ||
        dailiesConfig?.normativeInfo?.notes?.some((n) => n.includes('STM') || n.includes('JMU')) ||
        autoridade === 'ministro_stm' ||
        autoridade === 'juiz_militar'
    );

    let authorityRate: number;
    let authorityLabel: string;

    if (autoridade === 'ministro_stm') {
        authorityRate = ministerPerDiem;
        authorityLabel = 'Ministro do STM';
    } else if (autoridade === 'ministro_cjf') {
        authorityRate = ministerPerDiem;
        authorityLabel = 'Ministro / Membro do CJF';
    } else if (autoridade === 'desembargador_trf') {
        const desembargadorPct = Number(derived?.ratesPercentages?.desembargador ?? 0.95);
        authorityRate = round2(ministerPerDiem * desembargadorPct);
        authorityLabel = 'Desembargador Federal / Membro do TRF';
    } else if (autoridade === 'juiz_militar' || (autoridade === 'juiz_federal' && isJmu)) {
        const juizPct = derived?.ratesPercentages?.juiz_titular !== undefined
            ? Number(derived.ratesPercentages.juiz_titular)
            : derived?.ratesPercentages?.juiz !== undefined
                ? Number(derived.ratesPercentages.juiz)
                : 0.95;
        authorityRate = round2(ministerPerDiem * juizPct);
        authorityLabel = 'Juiz Federal da Justiça Militar / Substituto';
    } else if (autoridade === 'juiz_federal') {
        const juizPct = derived?.ratesPercentages?.juiz_titular !== undefined
            ? Number(derived.ratesPercentages.juiz_titular)
            : derived?.ratesPercentages?.juiz !== undefined
                ? Number(derived.ratesPercentages.juiz)
                : 0.9025;
        authorityRate = round2(ministerPerDiem * juizPct);
        authorityLabel = 'Juiz Federal / Juiz Federal Substituto';
    } else {
        // Fallback quando não informada autoridade
        if (isJmu) {
            authorityRate = ministerPerDiem;
            authorityLabel = 'Ministro do STM';
        } else {
            const desembargadorPct = Number(derived?.ratesPercentages?.desembargador ?? 0.95);
            authorityRate = round2(ministerPerDiem * desembargadorPct);
            authorityLabel = 'Desembargador Federal / Membro do TRF';
        }
    }

    return {
        authorityRate,
        serverRate: round2(authorityRate * assistRatio),
        authorityLabel
    };
};

export const resolveDailiesDailyRate = ({
    dailiesConfig,
    cargo,
    funcao,
    hasCommissionRole,
    assessoramentoMagistrado,
    autoridadeAssistida
}: ResolveDailyRateInput): number => {
    const isCommission = hasCommissionRole ?? Boolean(funcao && normalizeKey(funcao).replace(/[\s\-_]/g, '').startsWith('cj'));
    const fallbackCandidates = resolveRateKeyCandidates(cargo, funcao, isCommission);
    const fallbackRate = pickCaseInsensitive(dailiesConfig?.rates, fallbackCandidates) ?? 0;

    const derived = dailiesConfig?.derivedFromMinister;
    if (!derived?.enabled) {
        return Math.max(0, fallbackRate);
    }

    const ministerPerDiem = Math.max(0, Number(derived.ministerPerDiem || 0));
    if (ministerPerDiem <= 0) {
        return Math.max(0, fallbackRate);
    }

    // Regra especial: assessoramento direto a magistrado (Res. CNJ 73/2009 art. 6º, § 4º c/c Res. CJF 340/2015 art. 10, § 3º)
    // O servidor recebe até 80% do valor da diária atribuído à autoridade assistida
    const isMagistrate = fallbackCandidates.some((c) =>
        ['desembargador', 'juiz_titular', 'juiz_substituto', 'juiz', 'magistrado'].includes(c)
    );

    if (!isMagistrate && assessoramentoMagistrado) {
        return resolveAssistedAuthorityDailyRate(dailiesConfig, autoridadeAssistida).serverRate;
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
        holidays: Array.isArray(rules?.holidays) ? rules!.holidays : [],
        halfDailyOnBusinessReturnDay: Boolean(rules?.halfDailyOnBusinessReturnDay),
        halfDiscountOnBusinessReturnDay: Boolean(rules?.halfDiscountOnBusinessReturnDay),
        holidayCalendarLabel: rules?.holidayCalendarLabel,
        holidayCalendarReference: rules?.holidayCalendarReference,
        holidayCalendarVersion: rules?.holidayCalendarVersion
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

const resolveNormalizedRange = (startDate: string, endDate: string): { start: Date; end: Date } | null => {
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

    return { start, end };
};

export interface RangeDayInfo {
    isoDate: string;
    dayNumber: number;
    dayOfWeek: number; // 0 = Dom, 6 = Sáb
    weekdayLabel: string;
    formattedDate: string;
    isWeekend: boolean;
}

export const enumerateDaysInRange = (startDate: string, endDate: string): RangeDayInfo[] => {
    const range = resolveNormalizedRange(startDate, endDate);
    if (!range) return [];

    const weekdayShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const result: RangeDayInfo[] = [];
    const cursor = new Date(range.start.getTime());

    while (cursor.getTime() <= range.end.getTime()) {
        const isoDate = toIsoDate(cursor);
        const dayOfWeek = cursor.getUTCDay();
        const dayOfMonth = String(cursor.getUTCDate()).padStart(2, '0');
        const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
        result.push({
            isoDate,
            dayNumber: cursor.getUTCDate(),
            dayOfWeek,
            weekdayLabel: weekdayShort[dayOfWeek],
            formattedDate: `${dayOfMonth}/${month}`,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
};

export const summarizeDailiesRange = (
    startDate: string,
    endDate: string,
    rules: DailiesDiscountRules
): DailiesRangeSummary | null => {
    const range = resolveNormalizedRange(startDate, endDate);
    if (!range) {
        return null;
    }

    const holidays = buildHolidaySet(rules);

    let totalDays = 0;
    let deductibleDays = 0;
    let excludedDays = 0;
    let weekendDays = 0;
    let weekdayHolidayDays = 0;
    let weekendHolidayDays = 0;
    const weekendExcludedDates: string[] = [];
    const holidayExcludedDates: string[] = [];

    const cursor = new Date(range.start.getTime());
    while (cursor.getTime() <= range.end.getTime()) {
        totalDays += 1;

        const iso = toIsoDate(cursor);
        const dayOfWeek = cursor.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.has(iso);

        if (isWeekend) {
            weekendDays += 1;
        }

        if (isHoliday && isWeekend) {
            weekendHolidayDays += 1;
        } else if (isHoliday) {
            weekdayHolidayDays += 1;
        }

        const shouldSkip = rules.excludeWeekendsAndHolidays && (isWeekend || isHoliday);
        if (shouldSkip) {
            excludedDays += 1;
            if (isWeekend) {
                weekendExcludedDates.push(iso);
            }
            if (isHoliday) {
                holidayExcludedDates.push(iso);
            }
        } else {
            deductibleDays += 1;
        }

        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
        totalDays,
        deductibleDays,
        excludedDays,
        weekendDays,
        weekdayHolidayDays,
        weekendHolidayDays,
        weekendExcludedDates,
        holidayExcludedDates
    };
};

export const summarizeDailiesPeriodMode = (
    startDate: string,
    endDate: string,
    rules: DailiesDiscountRules
): DailiesPeriodModeSummary | null => {
    const range = resolveNormalizedRange(startDate, endDate);
    if (!range) {
        return null;
    }

    const summary = summarizeDailiesRange(startDate, endDate, rules);
    if (!summary) {
        return null;
    }

    const returnDate = toIsoDate(range.end);
    const returnDay = toUtcDate(returnDate).getUTCDay();
    const returnDateIsWeekend = returnDay === 0 || returnDay === 6;
    const returnDateIsHoliday = buildHolidaySet(rules).has(returnDate);
    const returnDateIsBusinessDay = !returnDateIsWeekend && !returnDateIsHoliday;
    const halfDailyApplied = Boolean(rules.halfDailyOnBusinessReturnDay && summary.totalDays > 0);
    const halfDiscountApplied = Boolean(
        rules.excludeWeekendsAndHolidays &&
        rules.halfDiscountOnBusinessReturnDay &&
        returnDateIsBusinessDay
    );

    const payableDays = Math.max(0, round2(summary.totalDays - (halfDailyApplied ? 0.5 : 0)));
    const discountDays = Math.max(0, round2(summary.deductibleDays - (halfDiscountApplied ? 0.5 : 0)));

    return {
        ...summary,
        payableDays,
        discountDays,
        returnDate,
        returnDateIsWeekend,
        returnDateIsHoliday,
        returnDateIsBusinessDay,
        halfDailyApplied,
        halfDiscountApplied
    };
};

export const countDeductibleDaysInRange = (
    startDate: string,
    endDate: string,
    rules: DailiesDiscountRules
): number | null => {
    const summary = summarizeDailiesRange(startDate, endDate, rules);
    return summary ? summary.deductibleDays : null;
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
