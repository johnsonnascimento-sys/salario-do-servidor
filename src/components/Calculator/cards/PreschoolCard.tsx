import React from 'react';
import { formatCurrency } from '../../../utils/calculations';

interface PreschoolCardProps {
    dependents: number;
    onDependentsChange: (quantity: number) => void;
    quota?: number;
    total?: number;
    styles: { label: string; input: string };
}

const stepButtonClass = 'h-11 w-11 shrink-0 rounded-lg border border-neutral-300 font-semibold focus-visible:outline focus-visible:outline-2 disabled:opacity-50 dark:border-neutral-700';

export function PreschoolCard({ dependents, onDependentsChange, quota, total, styles }: PreschoolCardProps) {
    const fieldId = React.useId();
    const updateDependents = (quantity: number) => {
        onDependentsChange(Number.isFinite(quantity) ? Math.max(0, Math.trunc(quantity)) : 0);
    };

    return (
        <>
            <div className="w-full max-w-xs">
                <label htmlFor={fieldId} className={styles.label}>Quantidade de dependentes elegíveis</label>
                <div className="flex items-center gap-2">
                    <button type="button" aria-label="Diminuir quantidade de dependentes elegíveis" className={stepButtonClass}
                        disabled={dependents <= 0} onClick={() => updateDependents(dependents - 1)}>−</button>
                    <input id={fieldId} type="number" min="0" step="1" inputMode="numeric"
                        className={`${styles.input} text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                        value={dependents} onChange={e => updateDependents(e.currentTarget.valueAsNumber)} />
                    <button type="button" aria-label="Aumentar quantidade de dependentes elegíveis" className={stepButtonClass}
                        onClick={() => updateDependents(dependents + 1)}>+</button>
                </div>
            </div>
            <dl className="space-y-2 text-body-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-neutral-600 dark:text-neutral-300">Cota por dependente</dt>
                    <dd className="font-mono font-semibold">{quota === undefined ? '—' : formatCurrency(quota)}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <dt className="text-neutral-600 dark:text-neutral-300">Valor na simulação</dt>
                    <dd className="font-mono font-semibold">{total === undefined ? '—' : formatCurrency(total)}</dd>
                </div>
            </dl>
        </>
    );
}
