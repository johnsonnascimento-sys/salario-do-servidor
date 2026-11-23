import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { SubstitutionPeriod } from '../../../types';
import { getSubstitutionIntervals, getSubstitutionMonthBounds, isSubstitutionCalendarDate, shiftSubstitutionDate } from '../../../utils/substitutionPeriod';

interface Props {
    period: SubstitutionPeriod;
    update: (patch: Partial<SubstitutionPeriod>) => void;
    fieldPrefix: string;
    paymentEnd?: string;
    disabled: boolean;
    styles: any;
}

const formatDate = (date: string) => date.split('-').reverse().join('/');

const SubstitutionDayCalendar: React.FC<Props> = ({ period, update, fieldPrefix, paymentEnd, disabled, styles }) => {
    const selectedDays = Array.isArray(period.diasAvulsos) ? period.diasAvulsos : [];
    const lastMonth = paymentEnd?.slice(0, 7);
    const [visibleMonth, setVisibleMonth] = useState(() => selectedDays.filter(isSubstitutionCalendarDate).sort().pop()?.slice(0, 7));
    const month = lastMonth && visibleMonth && visibleMonth <= lastMonth ? visibleMonth : lastMonth;
    const bounds = getSubstitutionMonthBounds(month);
    if (!bounds || !paymentEnd || !lastMonth) return <p className="text-body-xs">Selecione o mês do pagamento para abrir o calendário.</p>;

    const offset = new Date(`${bounds.min}T00:00:00Z`).getUTCDay();
    const size = Number(bounds.max.slice(-2));
    const selected = new Set(selectedDays);
    const unavailable = [...selected].filter(day => !isSubstitutionCalendarDate(day) || day > paymentEnd);
    const toggle = (date: string) => {
        if (selected.has(date)) selected.delete(date);
        else selected.add(date);
        update({ diasAvulsos: [...selected].sort() });
    };
    const navStyle = 'flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 disabled:opacity-40 dark:border-neutral-600';
    return <fieldset className="max-w-md space-y-2" disabled={disabled} aria-describedby={`${fieldPrefix}-periodo-status`}>
        <legend className={styles.label}>Marque os dias de substituição</legend>
        <div className="flex items-center gap-2">
            <button type="button" className={navStyle} aria-label="Mês anterior" disabled={month === '1000-01'}
                onClick={() => setVisibleMonth(shiftSubstitutionDate(bounds.min, -1).slice(0, 7))}><ChevronLeft className="h-4 w-4" /></button>
            <input type="month" className={`${styles.input} min-w-0`} aria-label="Mês de exercício" value={month} min="1000-01" max={lastMonth}
                onChange={event => {
                    const value = event.target.value;
                    if (getSubstitutionMonthBounds(value) && value <= lastMonth) setVisibleMonth(value);
                }} />
            <button type="button" className={navStyle} aria-label="Próximo mês" disabled={month === lastMonth}
                onClick={() => setVisibleMonth(shiftSubstitutionDate(bounds.max, 1).slice(0, 7))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        {unavailable.length > 0 && <div className="space-y-1 text-body-xs">
            <p>Revise os dias indisponíveis nesta folha.</p>
            {unavailable.map(day => <button key={String(day)} type="button" className="mr-3 min-h-11 text-error-700 hover:underline dark:text-error-300"
                onClick={() => update({ diasAvulsos: selectedDays.filter(item => item !== day) })}>
                Remover {isSubstitutionCalendarDate(day) ? formatDate(day) : 'data inválida'}
            </button>)}
        </div>}
        <div className="grid grid-cols-7 gap-1 text-center text-body-xs">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <span key={day} className="py-1 text-neutral-500 dark:text-neutral-400" aria-hidden="true">{day}</span>)}
            {Array.from({ length: offset }, (_, index) => <span key={`offset-${index}`} aria-hidden="true" />)}
            {Array.from({ length: size }, (_, index) => {
                const day = index + 1;
                const date = `${month}-${String(day).padStart(2, '0')}`;
                const pressed = selected.has(date);
                return <button key={date} type="button" aria-label={formatDate(date)} aria-pressed={pressed}
                    className="min-h-11 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 aria-pressed:border-secondary-700 aria-pressed:bg-secondary-50 aria-pressed:font-semibold dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:aria-pressed:bg-secondary-950"
                    onClick={() => toggle(date)}>{day}</button>;
            })}
        </div>
    </fieldset>;
};

export const SubstitutionDateEditor: React.FC<Props> = props => {
    const { period, update, fieldPrefix, paymentEnd, disabled, styles } = props;
    if (period.modo === 'avulsos') return <SubstitutionDayCalendar {...props} />;

    const intervals = getSubstitutionIntervals(period);
    const replaceIntervals = (value: typeof intervals) => update({ intervalos: value, dataInicio: undefined, dataFim: undefined });
    return <fieldset className="space-y-3" disabled={disabled} aria-describedby={`${fieldPrefix}-periodo-status`}>
        <legend className="sr-only">Períodos de substituição</legend>
        {intervals.map((range, index) => {
            const id = index === 0 ? fieldPrefix : `${fieldPrefix}-${index + 1}`;
            return <div key={index} className="space-y-1">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(['dataInicio', 'dataFim'] as const).map(field => {
                        const start = field === 'dataInicio';
                        const fieldId = `${id}-${start ? 'inicio' : 'fim'}`;
                        return <div key={field} className="min-w-0">
                            <label htmlFor={fieldId} className={styles.label}>{start ? 'Data de início' : 'Data de fim'}</label>
                            <input type="date" id={fieldId} className={styles.input} value={range?.[field] ?? ''} max={paymentEnd}
                                aria-label={`${start ? 'Data de início' : 'Data de fim'}, período ${index + 1}`}
                                onChange={event => replaceIntervals(intervals.map((item, position) => position === index
                                    ? { ...item, [field]: event.target.value } : item))} />
                        </div>;
                    })}
                </div>
                <button type="button" aria-label={`Remover período ${index + 1}`} onClick={() => replaceIntervals(intervals.filter((_, position) => position !== index))}
                    className="min-h-11 text-body-xs text-error-700 hover:underline dark:text-error-300">Remover período</button>
            </div>;
        })}
        <button type="button" aria-label="Adicionar período" onClick={() => replaceIntervals([...intervals, { dataInicio: '', dataFim: '' }])}
            className="inline-flex min-h-11 items-center gap-2 text-body-xs font-semibold text-secondary-800 hover:underline dark:text-secondary-300">
            <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar período
        </button>
    </fieldset>;
};
