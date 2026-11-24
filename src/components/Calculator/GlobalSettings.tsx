import React, { useEffect, useMemo, useRef } from 'react';
import { Scale } from 'lucide-react';
import { AdjustmentScheduleEntry, CalculatorState, CourtConfig } from '../../types';
import { CalculatorCardHeading } from './CalculatorCardHeading';
import { resolveConstitutionalCeiling } from '../../services/config/constitutionalCeiling';
import { formatCurrency } from '../../utils/calculations';
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
    preserveRestoredGlobals?: boolean;
}

const getMonthLabel = (monthIndex: number) =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long' })
        .format(new Date(2024, monthIndex, 1))
        .toUpperCase();

const monthLabelByNumber = (monthNumber: number) => getMonthLabel(Math.max(0, Math.min(11, monthNumber - 1)));

const PJU_CAREER_LAW = 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm';
const PJU_2026_ADJUSTMENT_LAW = 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15293.htm';
const PJU_VETO_SOURCE = 'https://www.congressonacional.leg.br/materias/vetos/-/veto/detalhe/17869';
const isOfficialLink = (source?: string): source is string => Boolean(source && /^https:\/\//i.test(source));
const formatScheduleDate = (date: string) => date.split('-').reverse().join('/');
// The date identifies the legacy PJU entry for citation. The schedule still selects the table.
const isLaw15293Entry = (entry: AdjustmentScheduleEntry) =>
    entry.status_source === PJU_2026_ADJUSTMENT_LAW || (!entry.status_source && entry.date === '2026-07-01');

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
    courtConfig,
    styles,
    preserveRestoredGlobals = false,
}) => {

    const schedules = useMemo(
        () => [...(courtConfig.adjustment_schedule || [])].sort((a, b) => a.period - b.period),
        [courtConfig.adjustment_schedule]
    );

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

        const nextPeriod = pickPeriodFromScheduleByReference(
            schedules,
            clampedReference.year,
            clampedReference.month,
            !!state.simularDerrubadaVeto
        );
        if (nextPeriod !== null && nextPeriod !== state.periodo) {
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

    const currentScheduleEntry = schedules.find(entry => entry.period === state.periodo);
    const currentScheduleDate = currentScheduleEntry?.date;
    const vetoedSchedules = schedules.filter(entry => entry.vetoed);
    const firstVetoReference = pickMinReferencePoint(vetoedSchedules.flatMap(entry => {
        const reference = parseReferencePointFromDate(entry.date || '');
        return reference ? [reference] : [];
    }));
    const showProjectionControl = firstVetoReference !== null && clampedReference.year >= firstVetoReference.year;
    const projectionApplied = Boolean(currentScheduleEntry?.vetoed || currentScheduleEntry?.status === 'projected');
    const isPju = courtConfig.powerName === 'PJU';
    const pjuAdjustment = isPju ? schedules.find(isLaw15293Entry) : undefined;
    const pjuAdjustmentReference = parseReferencePointFromDate(pjuAdjustment?.date || '');
    const beforePjuAdjustment = pjuAdjustmentReference && compareReferencePoints(clampedReference, pjuAdjustmentReference) < 0;
    const scheduleSource = currentScheduleEntry?.status_source;
    const normativeSource = isOfficialLink(scheduleSource) ? scheduleSource : undefined;
    const vetoSource = normativeSource ?? (isPju ? PJU_VETO_SOURCE : undefined);
    const selectedCompetence = `${String(clampedReference.month).padStart(2, '0')}/${clampedReference.year}`;

    const ceiling = resolveConstitutionalCeiling(
        courtConfig.constitutionalCeilingReference,
        clampedReference.year,
        clampedReference.month,
    );

    return (
        <div className={styles.formSection}>
            <CalculatorCardHeading help={{ label: 'Enquadramento normativo da competência', content: (
                <div className="space-y-2" aria-live="polite">
                    <p><strong>Enquadramento normativo de {selectedCompetence}</strong></p>
                    {projectionApplied ? (
                        <p>
                            A tabela salarial inclui uma <strong>projeção de reajuste</strong>{currentScheduleDate && ` com efeitos simulados a partir de ${formatScheduleDate(currentScheduleDate)}`}.
                            {currentScheduleEntry?.vetoed && ' A parcela integra um cenário de eventual derrubada do veto.'}
                            {currentScheduleEntry?.vetoed && vetoSource && <> <a className="underline" href={vetoSource} target="_blank" rel="noreferrer">{isPju ? 'Veto nº 45/2025' : 'Fonte do veto'}</a>.</>}
                        </p>
                    ) : pjuAdjustment && currentScheduleEntry === pjuAdjustment ? (
                        <p>
                            A simulação usa os valores de vencimento básico, cargos em comissão e funções comissionadas reajustados pela{' '}
                            <a className="underline" href={PJU_2026_ADJUSTMENT_LAW} target="_blank" rel="noreferrer">Lei nº 15.293/2025</a>,
                            que alterou a <a className="underline" href={PJU_CAREER_LAW} target="_blank" rel="noreferrer">Lei nº 11.416/2006</a>{' '}
                            {currentScheduleDate && `com efeitos remuneratórios a partir de ${formatScheduleDate(currentScheduleDate)}`}.
                        </p>
                    ) : (
                        <p>
                            A simulação usa a tabela salarial do órgão para esta competência
                            {currentScheduleDate && `, com referência em ${formatScheduleDate(currentScheduleDate)}`}.
                            {isPju && <> As carreiras são regidas pela <a className="underline" href={PJU_CAREER_LAW} target="_blank" rel="noreferrer">Lei nº 11.416/2006</a>.</>}
                            {normativeSource && <> <a className="underline" href={normativeSource} target="_blank" rel="noreferrer">Fonte da tabela aplicada</a>.</>}
                            {beforePjuAdjustment && pjuAdjustment?.date && <> O reajuste da <a className="underline" href={PJU_2026_ADJUSTMENT_LAW} target="_blank" rel="noreferrer">Lei nº 15.293/2025</a> começa em {formatScheduleDate(pjuAdjustment.date)}.</>}
                        </p>
                    )}
                </div>
            ) }}>
                <label htmlFor="payroll-month" className="text-body-sm font-semibold">Competência do holerite</label>
            </CalculatorCardHeading>
            <div className="flex max-w-md gap-2">
                <select
                    id="payroll-month"
                    aria-label="Mês da folha"
                    className={`${styles.input} min-w-0 flex-1`}
                    value={monthLabelByNumber(clampedReference.month)}
                    onChange={e => update('mesRef', e.target.value)}
                >
                    {allowedMonths.map(item => (
                        <option key={item.label} value={item.label}>{item.label}</option>
                    ))}
                </select>

                <select
                    id="payroll-year"
                    aria-label="Ano da folha"
                    className={`${styles.input} !w-24 shrink-0 font-mono font-semibold sm:!w-28`}
                    value={clampedReference.year}
                    onChange={e => update('anoRef', Number(e.target.value))}
                >
                    {allowedYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
            <p className="mt-1.5 text-body-xs text-neutral-500 dark:text-neutral-400">
                Seleciona automaticamente as tabelas salariais, faixas de IR, PSS e auxílios da época.
            </p>

            <p className="mt-2 text-body-sm text-neutral-600 dark:text-neutral-300" aria-live="polite">
                {ceiling ? (
                    <>
                        Teto federal de referência <strong>{formatCurrency(ceiling.amount)}</strong>
                        {' · '}
                        <a className="underline" href={ceiling.source} target="_blank" rel="noreferrer">Fonte oficial</a>
                    </>
                ) : 'Referência indisponível para esta competência'}
            </p>

            {(showProjectionControl || projectionApplied) && (
                <div className="relative z-10 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <Scale className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-body-sm font-bold text-amber-800 dark:text-amber-300">
                                {isPju ? 'Veto nº 45/2025 (Lei nº 15.293/2025)' : 'Projeção de reajuste salarial'}
                            </h4>
                            <p className="text-body-xs text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                                {showProjectionControl
                                    ? 'As parcelas vetadas entram na simulação somente no modo de projeção e a partir das datas previstas no projeto.'
                                    : 'Os valores desta competência incluem uma projeção de reajuste salarial.'}
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between flex-wrap gap-3">
                        {showProjectionControl && <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={!!state.simularDerrubadaVeto}
                                onChange={(e) => update('simularDerrubadaVeto', e.target.checked)}
                                className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500/30"
                            />
                            <span className="text-body-xs font-semibold text-amber-800 dark:text-amber-200">
                                    Simular projeção com eventual derrubada do veto
                            </span>
                        </label>}

                        {projectionApplied && (
                            <span className="text-body-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full">
                                Projeção ativa nesta competência
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
