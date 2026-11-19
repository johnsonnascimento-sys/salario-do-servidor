import React from 'react';
import type { Ref } from 'react';
import { calculatorTargetClass } from './hooks/useCalculatorTargetFocus';

interface CalculatorStepHeaderProps {
    title: string;
    description: string;
    headingRef: Ref<HTMLHeadingElement>;
    mobileStep: string;
    mobileAction: React.ReactNode;
}

export function CalculatorStepHeader({ title, description, headingRef, mobileStep, mobileAction }: CalculatorStepHeaderProps) {
    return (
        <header className="mb-3 flex items-center gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-700 min-[960px]:mb-5 min-[960px]:pb-5">
            <div className="min-w-0 flex-1">
                <p className="text-body-xs font-semibold text-neutral-600 dark:text-neutral-300 min-[960px]:hidden">{mobileStep}</p>
                <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className={`${calculatorTargetClass} w-fit max-w-full break-words rounded text-h3 font-bold text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-700 dark:text-white dark:focus-visible:outline-secondary-300`}
                >
                    {title}
                </h2>
                {description && <p className="mt-1 text-body-sm text-neutral-700 dark:text-neutral-200">{description}</p>}
            </div>
            {mobileAction}
        </header>
    );
}
