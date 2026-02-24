import React, { useEffect, useMemo, useRef } from 'react';
import { Settings } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';
import {
    MONTH_TOKEN_TO_INDEX,
    normalizeReferenceToken,
    pickBestMenuOptionByReference,
    pickPeriodFromScheduleByReference,
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

const parseDatedLabel = (label: string) => {
    const normalized = normalizeReferenceToken(label);
    const match = normalized.match(/(19|20)\d{2}_([a-z]+)(\d{2})?/);
    if (!match) return null;

    const year = Number(match[0].slice(0, 4));
    const monthToken = match[2];
    const dayToken = match[3] || '01';
    const month = MONTH_TOKEN_TO_INDEX[monthToken] ?? 0;
    const day = Number(dayToken);

    if (!month || !Number.isFinite(day)) return null;
    return { year, month, day, label };
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ state, update, courtConfig, styles }) => {
    const compactInput = `${styles.input} py-2 px-3 text-body`;
    const compactLabel = 'block text-label font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1';
    const schedules = useMemo(
        () => [...(courtConfig.adjustment_schedule || [])].sort((a, b) => a.period - b.period),
        [courtConfig.adjustment_schedule]
    );
    const periodOptions = schedules.length > 0
        ? schedules
        : [{ period: state.periodo, percentage: 0, label: `Periodo ${state.periodo}` }];
    const foodAllowanceOptions = useMemo(
        () => courtConfig.menus?.food_allowance || [],
        [courtConfig.menus?.food_allowance]
    );
    const preschoolAllowanceOptions = useMemo(
        () => courtConfig.menus?.preschool_allowance || [],
        [courtConfig.menus?.preschool_allowance]
    );
    const referenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
    const referenceYear = Number.isFinite(state.anoRef) ? state.anoRef : new Date().getFullYear();
    const monthOptions = Array.from({ length: 12 }, (_, idx) => getMonthLabel(idx));
    const manualPeriodSelectionRef = useRef(false);
    const lastReferenceKeyRef = useRef('');

    useEffect(() => {
        const referenceKey = `${referenceYear}-${referenceMonth}-${schedules.length}-${foodAllowanceOptions.length}-${preschoolAllowanceOptions.length}`;
        if (lastReferenceKeyRef.current === referenceKey) {
            return;
        }
        lastReferenceKeyRef.current = referenceKey;

        const nextPeriod = pickPeriodFromScheduleByReference(schedules, referenceYear, referenceMonth);
        if (!manualPeriodSelectionRef.current && nextPeriod !== null && nextPeriod !== state.periodo) {
            update('periodo', nextPeriod);
        }

        const nextFoodAllowance = pickBestMenuOptionByReference(foodAllowanceOptions, referenceYear, referenceMonth);
        let nextFoodValue = nextFoodAllowance?.value ?? 0;
        let isFoodProportional = false;
        let foodDetail = '';

        const datedFoodOptions = foodAllowanceOptions
            .map(option => ({
                ...option,
                parsed: parseDatedLabel(option.label)
            }))
            .filter((entry): entry is typeof entry & { parsed: { year: number; month: number; day: number; label: string } } => !!entry.parsed)
            .sort((a, b) => {
                if (a.parsed.year !== b.parsed.year) return a.parsed.year - b.parsed.year;
                if (a.parsed.month !== b.parsed.month) return a.parsed.month - b.parsed.month;
                return a.parsed.day - b.parsed.day;
            });

        const transitionIndex = datedFoodOptions.findIndex(entry =>
            entry.parsed.year === referenceYear && entry.parsed.month === referenceMonth
        );

        // STM rule observed in 02/2026: proporcional em 22 avos (4/22 antigo + 18/22 novo).
        if (
            referenceYear === 2026 &&
            referenceMonth === 2 &&
            transitionIndex > 0
        ) {
            const previousValue = datedFoodOptions[transitionIndex - 1].value;
            const currentValue = datedFoodOptions[transitionIndex].value;
            nextFoodValue = round2(((previousValue * 4) + (currentValue * 18)) / 22);
            isFoodProportional = true;
            foodDetail = 'AUXILIO-ALIMENTACAO PROPORCIONAL STM (4/22 ANTIGO + 18/22 NOVO)';
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
            referenceYear,
            referenceMonth
        );
        if (nextPreschoolAllowance && Math.abs((state.cotaPreEscolar || 0) - nextPreschoolAllowance.value) > 0.009) {
            update('cotaPreEscolar', nextPreschoolAllowance.value);
        }
    }, [
        schedules,
        foodAllowanceOptions,
        preschoolAllowanceOptions,
        referenceYear,
        referenceMonth,
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
                Configuracoes Globais
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
                                {entry.label || `Periodo ${entry.period} (${(entry.percentage * 100).toFixed(2)}%)`}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={compactLabel}>Mês de Referência (traz valores históricos de IR, PSS, Alimentação...)</label>
                    <div className="flex gap-2">
                        <select
                            className={compactInput}
                            value={state.mesRef}
                            onChange={e => update('mesRef', e.target.value)}
                        >
                            {monthOptions.map(mes => (
                                <option key={mes}>{mes}</option>
                            ))}
                        </select>

                        <input
                            type="number"
                            className={`${compactInput} w-24`}
                            value={state.anoRef}
                            onChange={e => update('anoRef', Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
