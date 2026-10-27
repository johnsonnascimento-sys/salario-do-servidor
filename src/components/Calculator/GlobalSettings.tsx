import React, { useEffect, useMemo, useRef, useId } from 'react';
import { Calendar, Scale, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';
import { getSalarySchedule, isProjectedSalaryAdjustment, isSalaryProjection, resolveSalaryPeriod } from '../../utils/salaryScenario';
import {
    MONTH_TOKEN_TO_INDEX,
    compareReferencePoints,
    normalizeReferenceToken,
    parseReferencePointFromDate,
    parseReferencePointFromKey,
    pickBestMenuOptionByReference,
    pickMaxReferencePoint,
    pickMinReferencePoint,
    toReferenceMonthIndex
} from './referenceDateUtils';

interface GlobalSettingsProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    updateMany?: (patch: Partial<CalculatorState>) => void;
    courtConfig: CourtConfig;
    styles: any;
    preserveRestoredGlobals?: boolean;
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

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({
    state,
    update,
    updateMany,
    courtConfig,
    styles,
    preserveRestoredGlobals = false,
}) => {
    const compactInput = `${styles.input} py-2 px-3 text-body`;
    const compactLabel = 'block text-label font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1';

    const schedules = useMemo(
        () => getSalarySchedule(courtConfig, true),
        [courtConfig]
    );

    const projection = isSalaryProjection(state, courtConfig);
    const projectionOptions = schedules.filter(isProjectedSalaryAdjustment);
    const projectionId = useId();
    const apply = (patch: Partial<CalculatorState>) => {
        if (updateMany) updateMany(patch);
        else Object.entries(patch).forEach(([key, value]) => update(key as keyof CalculatorState, value));
    };

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

        const minPoint = salaryReferenceMin || strictMin;
        const maxPoint = strictMax;

        return {
            min: compareReferencePoints(minPoint, maxPoint) <= 0 ? minPoint : maxPoint,
            max: maxPoint
        };
    }, [pssKeys, irKeys, foodAllowanceOptions, preschoolAllowanceOptions, schedules]);

    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, idx) => getMonthLabel(idx)), []);
    const lastReferenceKeyRef = useRef('');
    const preserveRestoredGlobalsRef = useRef(preserveRestoredGlobals);

    useEffect(() => {
        preserveRestoredGlobalsRef.current = preserveRestoredGlobals;
        if (preserveRestoredGlobals) {
            lastReferenceKeyRef.current = '';
        }
    }, [preserveRestoredGlobals]);

    const rawReferenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
    const rawReferenceYear = Number.isFinite(state.anoRef) ? state.anoRef : new Date().getFullYear();
    const restoredReferenceRef = useRef(`${state.anoRef}:${state.mesRef}`);
    const preserveSavedReference = preserveRestoredGlobals &&
        restoredReferenceRef.current === `${state.anoRef}:${state.mesRef}`;
    const clampedReference = preserveSavedReference
        ? { year: rawReferenceYear, month: rawReferenceMonth }
        : clampReference(
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
        if (!years.includes(clampedReference.year)) {
            years.push(clampedReference.year);
            years.sort((a, b) => a - b);
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
            .filter((item) => (item.month >= minMonth && item.month <= maxMonth) ||
                (preserveSavedReference && item.month === clampedReference.month));
    }, [referenceBounds.min, referenceBounds.max, clampedReference.year, clampedReference.month, monthOptions, preserveSavedReference]);

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
        const referenceKey = `${clampedReference.year}-${clampedReference.month}-${state.simularDerrubadaVeto ? '1' : '0'}-${schedules.length}-${foodAllowanceOptions.length}-${preschoolAllowanceOptions.length}`;
        if (lastReferenceKeyRef.current === referenceKey) {
            return;
        }
        lastReferenceKeyRef.current = referenceKey;

        if (preserveRestoredGlobalsRef.current) {
            preserveRestoredGlobalsRef.current = false;
            return;
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
        state.simularDerrubadaVeto,
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

    // Reopening is an explicit recalculation: period follows competence and the explicit scenario flag.
    // Saved tax tables, benefits and reference dates retain their independent restoration guards above.
    useEffect(() => {
        const patch: Partial<CalculatorState> = {};
        if (state.simularDerrubadaVeto === undefined) patch.simularDerrubadaVeto = false;
        const next = resolveSalaryPeriod({ ...state, simularDerrubadaVeto: projection }, courtConfig, clampedReference.year, clampedReference.month);
        if (next !== state.periodo) patch.periodo = next;
        const selected = projectionOptions.find(entry => entry.period === next);
        const label = selected?.scenarioLabel || selected?.label;
        if (projection && label && state.salaryProjectionLabel !== label) patch.salaryProjectionLabel = label;
        if (Object.keys(patch).length) apply(patch);
    }, [projection, state.simularDerrubadaVeto, state.periodo, state.salaryProjectionLabel, courtConfig,
        clampedReference.year, clampedReference.month, update, updateMany]);

    const resolvedPeriod = resolveSalaryPeriod({ ...state, simularDerrubadaVeto: projection }, courtConfig, clampedReference.year, clampedReference.month);
    const currentScheduleEntry = schedules.find(entry => entry.period === resolvedPeriod);
    const activeProjection = projection && !!currentScheduleEntry && isProjectedSalaryAdjustment(currentScheduleEntry);
    const scheduleLabel = currentScheduleEntry?.label || `Período ${resolvedPeriod}`;
    const legalReference = currentScheduleEntry?.legalReference || currentScheduleEntry?.veto_reference;
    const sourceUrl = currentScheduleEntry?.sourceUrl;
    const scenarioReferences = [...new Set(projectionOptions.map(entry => entry.veto_reference || entry.legalReference).filter(Boolean))];

    return (
        <section className="mb-6 relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 px-6 py-5 shadow-sm space-y-5" aria-labelledby={`${projectionId}-heading`}>
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary-500/5 dark:bg-primary-500/10 rounded-full -mr-8 -mt-8 blur-2xl pointer-events-none" aria-hidden="true"></div>
            <div className="flex items-center justify-between gap-4 flex-wrap relative z-10 border-b border-neutral-100 dark:border-neutral-700/60 pb-3">
                <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden="true" /><h3 id={`${projectionId}-heading`} className="text-body font-bold text-neutral-800 dark:text-neutral-100">Mês e ano da folha</h3></div>
                <div role="status" className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-full text-body-xs font-semibold ${activeProjection ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'}`}>
                    {activeProjection ? <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> : <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{activeProjection ? 'Cenário projetado' : 'Tabela salarial aplicada'}</span><span aria-hidden="true">•</span><span className="font-normal">{scheduleLabel}</span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <fieldset className="min-w-0"><legend className={compactLabel}>Competência do holerite</legend><div className="flex gap-2">
                    <label className="min-w-0 flex-1"><span className="sr-only">Mês da folha</span><select id={`${projectionId}-month`} className={`${compactInput} min-w-0 w-full`} value={monthLabelByNumber(clampedReference.month)} onChange={e => update('mesRef', e.target.value)}>{allowedMonths.map(item => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
                    <label><span className="sr-only">Ano da folha</span><select id={`${projectionId}-year`} className={`${compactInput} w-28 font-mono font-semibold`} value={clampedReference.year} onChange={e => update('anoRef', Number(e.target.value))}>{allowedYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
                </div><p className="mt-1.5 text-body-xs text-neutral-500 dark:text-neutral-400">A competência seleciona a tabela salarial e as referências históricas de impostos e benefícios.</p></fieldset>
                <div className="flex flex-col justify-center rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-700/60 p-3.5"><div className="flex items-start gap-2"><Info className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" aria-hidden="true" /><div className="text-body-xs text-neutral-600 dark:text-neutral-300"><span className="font-semibold text-neutral-800 dark:text-neutral-200">Enquadramento da tabela: </span>{legalReference || (activeProjection ? 'Projeção configurada; aplicação condicionada à alteração normativa.' : 'Referência publicada para a competência selecionada.')}{sourceUrl && /^https:\/\//.test(sourceUrl) && <a href={sourceUrl} className="block underline mt-1" target="_blank" rel="noopener noreferrer">Consultar fundamento</a>}</div></div></div>
            </div>
            {(projectionOptions.length > 0 || projection) && <div className="relative z-10 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4 space-y-3">
                <div className="flex items-start gap-3"><Scale className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" /><div className="space-y-1"><h4 className="text-body-sm font-bold text-amber-800 dark:text-amber-300">Cenários de projeção</h4><p className="text-body-xs text-amber-700/90 dark:text-amber-300/80 leading-relaxed">As parcelas projetadas cadastradas ficam fora do cálculo normal. Sua simulação depende de seleção explícita e da competência informada.</p>{scenarioReferences.length > 0 && <p className="text-body-xs text-amber-700 dark:text-amber-300">{scenarioReferences.join(' · ')}</p>}</div></div>
                <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between flex-wrap gap-3"><label htmlFor={projectionId} className="flex min-h-11 items-center gap-2 cursor-pointer select-none"><input id={projectionId} type="checkbox" checked={projection} onChange={event => {
                    const enabled = event.target.checked;
                    const next = resolveSalaryPeriod({ ...state, simularDerrubadaVeto: enabled }, courtConfig, clampedReference.year, clampedReference.month);
                    const selected = schedules.find(entry => entry.period === next);
                    apply({ simularDerrubadaVeto: enabled, periodo: next, salaryProjectionLabel: enabled && selected && isProjectedSalaryAdjustment(selected) ? selected.scenarioLabel || selected.label : undefined });
                }} className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500/30" /><span className="text-body-xs font-semibold text-amber-800 dark:text-amber-200">Incluir parcelas projetadas na simulação</span></label>
                {projection && <span className="text-body-xs font-semibold text-amber-700 dark:text-amber-300">{activeProjection ? 'Projeção ativa — cenário condicionado' : 'Nenhuma parcela projetada aplicável à competência'}</span>}</div>
            </div>}
        </section>
    );
};
