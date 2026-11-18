import React from 'react';
import type { Ref } from 'react';
import type { LucideIcon } from 'lucide-react';
import { calculatorTargetClass } from './hooks/useCalculatorTargetFocus';

interface CalculatorStepHeaderProps {
    title: string;
    Icon: LucideIcon;
    description: string;
    headingRef: Ref<HTMLHeadingElement>;
}

export function CalculatorStepHeader({ title, Icon, description, headingRef }: CalculatorStepHeaderProps) {
    return (
        <header className="mb-5 flex items-center gap-3 rounded-2xl border border-secondary-100 bg-secondary-50 px-6 py-4 dark:border-secondary-800/40 dark:bg-secondary-950/40">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className={`${calculatorTargetClass} w-fit max-w-full break-words rounded text-h3 font-bold text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-700 dark:text-white dark:focus-visible:outline-secondary-300`}
                >
                    {title}
                </h2>
                <p className="mt-1 text-body text-neutral-700 dark:text-neutral-200">{description}</p>
            </div>
        </header>
    );
}
