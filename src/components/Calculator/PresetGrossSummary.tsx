import React from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';
import { PresetGrossLine, isDiscountLabel } from './dynamicPayrollForm.helpers';

interface PresetGrossSummaryProps {
    lines: PresetGrossLine[];
}

export const PresetGrossSummary: React.FC<PresetGrossSummaryProps> = ({ lines }) => {
    if (lines.length === 0) {
        return null;
    }

    return (
        <details className="group rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <p className="text-label font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Resumo calculado
                </p>
                <ChevronDown className="h-4 w-4 text-neutral-400 transition-transform duration-200 group-open:rotate-180 dark:text-neutral-500" />
            </summary>
            <div className="space-y-1.5 pt-2">
                {lines.map((line) => {
                    const isDiscount = Boolean(line.isDiscount || isDiscountLabel(line.label));
                    return (
                        <div key={line.label} className="flex items-center justify-between gap-3 text-body-xs">
                            <span className="text-neutral-600 dark:text-neutral-300">{line.label}</span>
                            <span className={`font-mono font-semibold ${isDiscount ? 'text-error-600 dark:text-error-400' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                {formatCurrency(line.value || 0)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </details>
    );
};
