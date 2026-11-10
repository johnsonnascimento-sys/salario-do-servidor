import React, { ReactNode, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';
import { PresetGrossLine, isDiscountLabel } from './dynamicPayrollForm.helpers';

interface PresetGrossSummaryProps {
    lines: PresetGrossLine[];
    children?: ReactNode;
}

export const PresetGrossSummary: React.FC<PresetGrossSummaryProps> = ({ lines, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const lastLinesRef = useRef<PresetGrossLine[]>(lines);

    if (lines.length > 0) {
        lastLinesRef.current = lines;
    }

    const displayLines = lines.length > 0 ? lines : lastLinesRef.current;

    if (displayLines.length === 0) {
        return null;
    }

    return (
        <details
            open={isOpen}
            onToggle={(e) => {
                setIsOpen(e.currentTarget.open);
            }}
            className="group rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/30"
        >
            <summary
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen((prev) => !prev);
                }}
                className="flex cursor-pointer list-none items-center justify-between gap-3 select-none"
            >
                <p className="text-label font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Resumo calculado
                </p>
                <ChevronDown
                    className={`h-4 w-4 text-neutral-400 transition-transform duration-200 dark:text-neutral-500 ${isOpen ? 'rotate-180' : ''}`}
                />
            </summary>
            <div className="space-y-1.5 pt-2">
                {displayLines.map((line, index) => {
                    const isDiscount = Boolean(line.isDiscount || isDiscountLabel(line.label));
                    return (
                        <div key={`${line.label}-${index}`} className="flex items-center justify-between gap-3 text-body-xs">
                            <span className="text-neutral-600 dark:text-neutral-300">{line.label}</span>
                            <span className={`font-mono font-semibold ${isDiscount ? 'text-error-600 dark:text-error-400' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                {line.displayValue ?? formatCurrency(line.value || 0)}
                            </span>
                        </div>
                    );
                })}
                {children}
            </div>
        </details>
    );
};
