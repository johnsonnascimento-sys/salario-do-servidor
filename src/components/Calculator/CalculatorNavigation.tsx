import React from 'react';

const sections = [
    { id: 'competencia', label: 'Competência' },
    { id: 'remuneracao', label: 'Remuneração e verbas' },
    { id: 'resultado', label: 'Resultado' },
];

export const CalculatorNavigation = () => (
    <nav aria-label="Seções da simulação" className="mb-6 grid gap-2 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800 sm:grid-cols-3">
        {sections.map((section, index) => (
            <a key={section.id} href={`#${section.id}`}
                onClick={() => document.getElementById(section.id)?.focus({ preventScroll: true })}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-body font-semibold text-neutral-700 hover:bg-white hover:text-primary-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-primary-200">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-primary-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-primary-200">{index + 1}</span>
                {section.label}
            </a>
        ))}
    </nav>
);
