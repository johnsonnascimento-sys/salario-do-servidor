import React from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

export const IR_OPTIONS = [
    { value: 'mensal', label: 'Mensal' },
    { value: 'rra', label: 'Exercícios anteriores (RRA)' },
    { value: 'excluir', label: 'Sem incidência' }
];

export const IR_SUMMARY = { mensal: 'IR mensal', rra: 'IR em RRA', excluir: 'Sem IR' } as const;

export function TaxChoices({ title, name, value, options, onChange }: {
    title: string;
    name: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <fieldset className="min-w-0">
            <legend className="mb-2 text-body-xs font-semibold text-neutral-800 dark:text-neutral-200">{title}</legend>
            <div className={`grid grid-cols-1 gap-2 ${options.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                {options.map(option => (
                    <label key={option.value}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-body-xs text-neutral-700 has-[:checked]:border-secondary-600 has-[:checked]:bg-secondary-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:has-[:checked]:border-secondary-400 dark:has-[:checked]:bg-secondary-900/40">
                        <input type="radio" name={name} value={option.value} checked={value === option.value}
                            className="h-4 w-4 shrink-0 accent-secondary-800 dark:accent-secondary-400"
                            onChange={() => onChange(option.value)} />
                        {option.label}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

export function TaxAdjustmentPanel({ open, onToggle, summary, children }: {
    open: boolean;
    onToggle: (open: boolean) => void;
    summary: string;
    children: React.ReactNode;
}) {
    return (
        <details className="group/tax border-t border-neutral-200 pt-1 dark:border-neutral-700"
            open={open} onToggle={event => onToggle(event.currentTarget.open)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded py-2 text-body text-neutral-700 dark:text-neutral-300 [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700">
                <span className="inline-flex items-center gap-2 font-semibold">
                    <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Ajustar tributação
                </span>
                <span className="ml-auto text-right text-body-xs text-neutral-500 dark:text-neutral-400">
                    {summary}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 group-open/tax:rotate-180" aria-hidden="true" />
            </summary>
            <div className="my-2 space-y-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/40 sm:p-4">
                {children}
            </div>
        </details>
    );
}
