import React, { useEffect, useMemo, useRef } from 'react';
import { Settings } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';
import {
    MONTH_TOKEN_TO_INDEX,
    compareReferencePoints,
    normalizeReferenceToken,
    parseReferencePointFromDate,
    parseReferencePointFromKey,
    pickBestMenuOptionByReference,
    pickPeriodFromScheduleByReference,
    pickMaxReferencePoint,
    pickMinReferencePoint,
    toReferenceMonthIndex
} from './referenceDateUtils';

interface GlobalSettingsProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    courtConfig: CourtConfig;
    styles: any;
}

const getMonthLabel = (monthIndex: number) =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long' })
        .format(new Date(2024, monthIndex, 1))
        .toUpperCase();

const monthLabelByNumber = (monthNumber: number) => getMonthLabel(Math.max(0, Math.min(11, monthNumber - 1)));

const parseTransitionLabel = (label: string) => {
    const normalized = normalizeReferenceToken(label);
    const match = normalized.match(/(19|20)\d{2}_([a-z]+)(\d{2})?/);
    if (!match) return null;

    const year = Number(match[0].slice(0, 4));
    const monthToken = match[2];
    const dayToken = match[3] || '01';
    const month = MONTH_TOKEN_TO_INDEX[monthToken] ?? 0;
    const day = Number(dayToken);

    if (!month || !Number.isFinite(day)) return null;
    return { year, month, day };
};

const clampReference = (
    target: { year: number; month: number },
    minRef: { year: number; month: number } | null,
    maxRef: { year: number; month: number } | null
) => {
    let current = target;

    if (minRef && compareReferencePoints(current, minRef) < 0) {
        current = { ...minRef };
    }

    if (maxRef && compareReferencePoints(current, maxRef) > 0) {
        current = { ...maxRef };
    }

    return current;
};

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ state, update, courtConfig, styles }) => {
    const compactInput = `${styles.input} py-2 px-3 text-body`;
    const compactLabel = 'block text-label font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1';

    const schedules = useMemo(
        () => [...(courtConfig.adjustment_schedule || [])].sort((a, b) => a.period - b.period),
        [courtConfig.adjustment_schedule]
    );

    const periodOptions = schedules.length > 0
        ? schedules
        : [{ period: state.periodo, percentage: 0, label: `Período ${state.periodo}` }];

    const foodAllowanceOptions = useMemo(
        () => courtConfig.menus?.food_allowance || [],
        [courtConfig.menus?.food_allowance]
    );

    const preschoolAllowanceOptions = useMemo(
        () => courtConfig.menus?.preschool_allowance || [],
        [courtConfig.menus?.preschool_allowance]
    );

    const pssKeys = useMemo(() => Object.keys(courtConfig.historico_pss || {}), [courtConfig.historico_pss]);
    const irKeys = useMemo(() => Object.keys(courtConfig.historico_ir || {}), [courtConfig.historico_ir]);

    const referenceBounds = useMemo(() => {
        const pssPoints = pssKeys
            .map(parseReferencePointFromKey)
            .filter((v): v is { year: number; month: number } => !!v);
        const irPoints = irKeys
            .map(parseReferencePointFromKey)
            .filter((v): v is { year: number; month: number } => !!v);
        const foodPoints = foodAllowanceOptions
            .map(option => parseReferencePointFromKey(option.label))
            .filter((v): v is { year: number; month: number } => !!v);
        const preschoolPoints = preschoolAllowanceOptions
            .map(option => parseReferencePointFromKey(option.label))
            .filter((v): v is { year: number; month: number } => !!v);
        const schedulePoints = schedules
            .map(schedule => parseReferencePointFromDate(schedule.date || ''))
            .filter((v): v is { year: number; month: number } => !!v);

        const minSets = [pssPoints, irPoints, foodPoints, preschoolPoints, schedulePoints].filter(set => set.length > 0);
        const maxSetsPreferred = [pssPoints, foodPoints, preschoolPoints, schedulePoints].filter(set => set.length > 0);
        const maxSets = maxSetsPreferred.length ? maxSetsPreferred : minSets;

        if (!minSets.length || !maxSets.length) {
            return {
                min: null as { year: number; month: number } | null,
                max: null as { year: number; month: number } | null
            };
        }

        const minCandidates = minSets
            .map(set => pickMinReferencePoint(set))
            .filter((v): v is { year: number; month: number } => !!v);
        const maxCandidates = maxSets
            .map(set => pickMaxReferencePoint(set))
            .filter((v): v is { year: number; month: number } => !!v);

        const strictMin = pickMaxReferencePoint(minCandidates);
        const strictMax = pickMaxReferencePoint(maxCandidates);
        const salaryReferenceMin = pickMinReferencePoint(schedulePoints);

        if (!strictMin || !strictMax) {
            return {
                min: null as { year: number; month: number } | null,
                max: null as { year: number; month: number } | null
            };
        }

        // Floor of reference selector follows salary reference availability.
        const minPoint = salaryReferenceMin || strictMin;
        const maxPoint = strictMax;

        return {
            min: compareReferencePoints(minPoint, maxPoint) <= 0 ? minPoint : maxPoint,
            max: maxPoint
        };
    }, [pssKeys, irKeys, foodAllowanceOptions, preschoolAllowanceOptions, schedules]);

    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, idx) => getMonthLabel(idx)), []);
    const manualPeriodSelectionRef = useRef(false);
    const lastReferenceKeyRef = useRef('');

    const rawReferenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
    const rawReferenceYear = Number.isFinite(state.anoRef) ? state.anoRef : new Date().getFullYear();
    const clampedReference = clampReference(
        { year: rawReferenceYear, month: rawReferenceMonth },
        referenceBounds.min,
        referenceBounds.max
    );

    const allowedYears = useMemo(() => {
        if (!referenceBounds.min || !referenceBounds.max) {
            return [clampedReference.year];
        }

        const years: number[] = [];
        for (let year = referenceBounds.min.year; year <= referenceBounds.max.year; year += 1) {
            years.push(year);
        }
        return years;
    }, [referenceBounds.min, referenceBounds.max, clampedReference.year]);

    const allowedMonths = useMemo(() => {
        const minMonth = referenceBounds.min && clampedReference.year === referenceBounds.min.year
            ? referenceBounds.min.month
            : 1;
        const maxMonth = referenceBounds.max && clampedReference.year === referenceBounds.max.year
            ? referenceBounds.max.month
            : 12;

        return monthOptions
            .map((label, index) => ({ label, month: index + 1 }))
            .filter((item) => item.month >= minMonth && item.month <= maxMonth);
    }, [referenceBounds.min, referenceBounds.max, clampedReference.year, monthOptions]);

    useEffect(() => {
        if (clampedReference.year !== state.anoRef) {
            update('anoRef', clampedReference.year);
        }

        const monthLabel = monthLabelByNumber(clampedReference.month);
        if (state.mesRef !== monthLabel) {
            update('mesRef', monthLabel);
        }
    }, [clampedReference.year, clampedReference.month, state.anoRef, state.mesRef, update]);

    useEffect(() => {
        const referenceKey = `${clampedReference.year}-${clampedReference.month}-${schedules.length}-${foodAllowanceOptions.length}-${preschoolAllowanceOptions.length}`;
        if (lastReferenceKeyRef.current === referenceKey) {
            return;
        }
        lastReferenceKeyRef.current = referenceKey;

        const nextPeriod = pickPeriodFromScheduleByReference(schedules, clampedReference.year, clampedReference.month);
        if (!manualPeriodSelectionRef.current && nextPeriod !== null && nextPeriod !== state.periodo) {
            update('periodo', nextPeriod);
        }

        const nextFoodAllowance = pickBestMenuOptionByReference(foodAllowanceOptions, clampedReference.year, clampedReference.month);
        let nextFoodValue = nextFoodAllowance?.value ?? 0;
        let isFoodProportional = false;
        let foodDetail = '';

        const transitionEntries = foodAllowanceOptions
            .map((option) => ({
                value: option.value,
                parsed: parseTransitionLabel(option.label)
            }))
            .filter((entry): entry is { value: number; parsed: { year: number; month: number; day: number } } => !!entry.parsed)
            .sort((a, b) => {
                if (a.parsed.year !== b.parsed.year) return a.parsed.year - b.parsed.year;
                if (a.parsed.month !== b.parsed.month) return a.parsed.month - b.parsed.month;
                return a.parsed.day - b.parsed.day;
            });

        const monthlyTransitionIndex = transitionEntries.findIndex((entry) =>
            entry.parsed.year === clampedReference.year &&
            entry.parsed.month === clampedReference.month &&
            entry.parsed.day > 1
        );

        if (monthlyTransitionIndex > 0) {
            const payrollDays = Math.max(1, Number(courtConfig.payrollRules?.transportWorkdays || 22));
            const previousValue = transitionEntries[monthlyTransitionIndex - 1].value;
            const currentValue = transitionEntries[monthlyTransitionIndex].value;
            const oldDays = transitionEntries[monthlyTransitionIndex].parsed.day + 1;
            const newDays = payrollDays - oldDays;

            if (oldDays > 0 && newDays > 0 && Math.abs(previousValue - currentValue) > 0.009) {
                nextFoodValue = Math.round((((previousValue * oldDays) + (currentValue * newDays)) / payrollDays) * 100) / 100;
                isFoodProportional = true;
                foodDetail = `AUXILIO-ALIMENTACAO PROPORCIONAL STM (${oldDays}/${payrollDays} ANTIGO + ${newDays}/${payrollDays} NOVO)`;
            }
        }

        if (Math.abs((state.auxAlimentacao || 0) - nextFoodValue) > 0.009) {
            update('auxAlimentacao', nextFoodValue);
        }
        if (state.auxAlimentacaoProporcional !== isFoodProportional) {
            update('auxAlimentacaoProporcional', isFoodProportional);
        }
        if ((state.auxAlimentacaoDetalhe || '') !== foodDetail) {
            update('auxAlimentacaoDetalhe', foodDetail);
        }

        const nextPreschoolAllowance = pickBestMenuOptionByReference(
            preschoolAllowanceOptions,
            clampedReference.year,
            clampedReference.month
        );
        if (nextPreschoolAllowance && Math.abs((state.cotaPreEscolar || 0) - nextPreschoolAllowance.value) > 0.009) {
            update('cotaPreEscolar', nextPreschoolAllowance.value);
        }
    }, [
        clampedReference.year,
        clampedReference.month,
        schedules,
        foodAllowanceOptions,
        preschoolAllowanceOptions,
        state.periodo,
        state.auxAlimentacao,
        state.auxAlimentacaoProporcional,
        state.auxAlimentacaoDetalhe,
        state.cotaPreEscolar,
        update
    ]);

    return (
        <div className="mb-6 relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 px-6 py-5 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-8 -mt-8 blur-xl"></div>
            <h3 className={styles.sectionTitle}>
                <Settings className="w-4 h-4" />
                Configurações Globais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div>
                    <label className={compactLabel}>Ref. Salarial</label>
                    <select
                        className={compactInput}
                        value={state.periodo}
                        onChange={(e) => {
                            manualPeriodSelectionRef.current = true;
                            update('periodo', Number(e.target.value));
                        }}
                    >
                        {periodOptions.map((entry) => (
                            <option key={entry.period} value={entry.period}>
                                {entry.label || `Período ${entry.period} (${(entry.percentage * 100).toFixed(2)}%)`}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={compactLabel}>Mês de Referência (traz valores históricos de IR, PSS, Alimentação...)</label>
                    <div className="flex gap-2">
                        <select
                            className={compactInput}
                            value={monthLabelByNumber(clampedReference.month)}
                            onChange={e => update('mesRef', e.target.value)}
                        >
                            {allowedMonths.map(item => (
                                <option key={item.label}>{item.label}</option>
                            ))}
                        </select>

                        <select
                            className={`${compactInput} w-28`}
                            value={clampedReference.year}
                            onChange={e => update('anoRef', Number(e.target.value))}
                        >
                            {allowedYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
