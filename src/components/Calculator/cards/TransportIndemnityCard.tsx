import React from 'react';
import type { CalculatorState, CalendarDaySelection, CourtConfig } from '../../../types';
import { Minus, Plus } from 'lucide-react';
import { getCalendarMonthBounds, resolveCalendarDays } from '../../../utils/calendarDaySelection';
import { getTransportServiceCompetence } from '../../../services/agency/engine/modules/transportIndemnityCalculations';
import { CalendarDayEditor, CalendarDayModes } from './CalendarDayEditor';

interface Props {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
}

export const TransportIndemnityCard: React.FC<Props> = ({ state, update, styles, competenciaReferencia, courtConfig }) => {
    const fieldId = React.useId();
    const memory = state.transporteIndenizacaoMemory;
    const payment = getCalendarMonthBounds(competenciaReferencia)?.min.slice(0, 7) ?? '';
    const service = getTransportServiceCompetence(courtConfig?.transportIndemnity, payment);
    const bounds = getCalendarMonthBounds(service);
    const maxDays = Number(bounds?.max.slice(-2)) || memory?.maxDays || 31;
    const period: CalendarDaySelection = state.transporteIndenizacaoSelecao ?? { modo: 'dias', dataInicio: '', dataFim: '' };
    const updatePeriod = (patch: Partial<CalendarDaySelection>) => update('transporteIndenizacaoSelecao', { ...period, ...patch });
    const selected = period.modo !== 'dias' ? resolveCalendarDays(period, service, { serviceMonthOnly: true }) : null;

    return (
        <div className="space-y-3">
            {memory?.transitionWarning && (
                <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-body-sm text-warning-700 dark:border-warning-700 dark:bg-warning-950 dark:text-warning-200">
                    {memory.transitionWarning}
                </p>
            )}
            {(memory?.status === 'unavailable' || (memory?.status === 'invalid' && !selected?.error)) && (
                <p role="status" className="text-body-sm text-warning-700">
                    {memory?.reason || 'Não há configuração aplicável para esta competência.'}
                </p>
            )}

            <CalendarDayModes name={`${fieldId}-modo`} mode={period.modo} onChange={modo => updatePeriod({ modo })} styles={styles} />
            {selected ? <div className="space-y-2">
                {service && <p className="text-body-xs font-semibold text-neutral-700 dark:text-neutral-200">
                    Mês de serviço: {service.split('-').reverse().join('/')}
                </p>}
                <CalendarDayEditor period={period} update={updatePeriod} fieldPrefix={fieldId} monthEnd={bounds?.max}
                    restrictToMonth disabled={!bounds} styles={styles} />
                <p id={`${fieldId}-periodo-status`} role="status" className="text-body-xs text-neutral-600 dark:text-neutral-300">
                    {selected.error ?? `${selected.dias} ${selected.dias === 1 ? 'dia de serviço selecionado' : 'dias de serviço selecionados'}`}
                </p>
            </div> : <div className="max-w-xs">
                <label htmlFor="transporte-indenizacao-dias" className={styles.label}>
                    Dias de serviço externo no mês
                </label>
                <div className="flex items-center gap-2">
                <button type="button" aria-label="Diminuir dias de serviço externo" disabled={(state.transporteIndenizacaoDias || 0) <= 0} onClick={() => update('transporteIndenizacaoDias', Math.max(0, (state.transporteIndenizacaoDias || 0) - 1))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-300"><Minus className="h-4 w-4" /></button>
                <input
                    id="transporte-indenizacao-dias"
                    type="number"
                    min="0"
                    max={maxDays}
                    step="1"
                    inputMode="numeric"
                    className={`${styles.input} text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    value={state.transporteIndenizacaoDias || ''}
                    placeholder="0"
                    onChange={e => {
                        const raw = e.target.value;
                        if (raw === '') { update('transporteIndenizacaoDias', 0); return; }
                        if (!/^\d+$/.test(raw)) return;
                        const value = Number(raw);
                        if (Number.isSafeInteger(value) && value <= maxDays) update('transporteIndenizacaoDias', value);
                    }}
                />
                <button type="button" aria-label="Aumentar dias de serviço externo" disabled={(state.transporteIndenizacaoDias || 0) >= maxDays} onClick={() => update('transporteIndenizacaoDias', Math.min(maxDays, (state.transporteIndenizacaoDias || 0) + 1))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 text-neutral-600 disabled:opacity-40 dark:border-neutral-600 dark:text-neutral-300"><Plus className="h-4 w-4" /></button>
                </div>
            </div>}

            <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                Conte os dias em que houve diligência externa, e não a quantidade de mandados. Várias diligências na mesma data contam como um dia.
            </p>

        </div>
    );
};
