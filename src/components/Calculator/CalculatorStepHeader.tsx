import React from 'react';
import type { Ref } from 'react';
import type { LucideIcon } from 'lucide-react';
import { calculatorTargetClass } from './hooks/useCalculatorTargetFocus';

interface CalculatorStepHeaderProps {
    title: string;
    Icon: LucideIcon;
    description: string;
    headingRef: Ref<HTMLHeadingElement>;
    mobileStep: string;
    mobileAction: React.ReactNode;
}

export function CalculatorStepHeader({ title, Icon, description, headingRef, mobileStep, mobileAction }: CalculatorStepHeaderProps) {
    return (
        <header className="mb-3 flex items-center gap-3 border-b border-neutral-200 py-2 dark:border-neutral-700 min-[960px]:mb-5 min-[960px]:rounded-2xl min-[960px]:border min-[960px]:border-secondary-100 min-[960px]:bg-secondary-50 min-[960px]:px-6 min-[960px]:py-4 dark:min-[960px]:border-secondary-800/40 dark:min-[960px]:bg-secondary-950/40">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200 min-[960px]:flex">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
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
