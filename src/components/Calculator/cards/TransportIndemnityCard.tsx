import React from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { Minus, Plus } from 'lucide-react';

interface Props {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatServiceCompetence = (comp?: string): string => {
    if (!comp || !/^\d{4}-(0[1-9]|1[0-2])$/.test(comp)) return '';
    const [year, month] = comp.split('-').map(Number);
    return `${MONTH_NAMES[month - 1]}/${year}`;
};

export const TransportIndemnityCard: React.FC<Props> = ({ state, update, competenciaReferencia, styles }) => {
    const memory = state.transporteIndenizacaoMemory;
    const maxDays = memory?.maxDays || 31;
    const isDualCompetence = Boolean(memory?.serviceCompetence && memory.serviceCompetence !== memory.competence);

    return (
        <div className={`${styles.innerBox} space-y-3`}>
            {isDualCompetence ? (
                <div className="space-y-1">
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
                        Mês da folha de pagamento: <strong>{competenciaReferencia}</strong>
                    </p>
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
                        Mês de execução do serviço externo: <strong>{formatServiceCompetence(memory?.serviceCompetence)}</strong>
                    </p>
                    <p className="text-body-xs text-neutral-500">
                        O pagamento é efetuado no mês seguinte ao da execução do serviço (art. 56 da Resolução CJF nº 4/2008).
                    </p>
                </div>
            ) : (
                <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
                    Competência da folha: <strong>{competenciaReferencia}</strong>
                </p>
            )}

            {memory?.transitionWarning && (
                <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-body-sm text-warning-700 dark:border-warning-700 dark:bg-warning-950 dark:text-warning-200">
                    {memory.transitionWarning}
                </p>
            )}
            {(!memory || memory.status === 'unavailable' || memory.status === 'invalid') && (
                <p role="status" className="text-body-sm text-warning-700">
                    {memory?.reason || 'Não há configuração aplicável para esta competência.'}
                </p>
            )}

            <div>
                <label htmlFor="transporte-indenizacao-dias" className={styles.label}>
                    Dias de serviço externo no mês{isDualCompetence ? ` (${formatServiceCompetence(memory?.serviceCompetence)})` : ''}
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
            </div>

            <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                Conte os dias em que houve diligência externa, e não a quantidade de mandados. Várias diligências na mesma data contam como um dia.
            </p>

        </div>
    );
};
