import React from 'react';

const sections = ['Competência e perfil', 'Remuneração e verbas', 'Resultado'];

interface CalculatorNavigationProps {
    step: number;
    onChange: (step: number) => void;
}

export const CalculatorNavigation: React.FC<CalculatorNavigationProps> = ({ step, onChange }) => (
    <nav aria-label="Etapas da simulação" className="mb-6 grid gap-2 rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800 sm:grid-cols-3">
        {sections.map((label, index) => (
            <button key={label} type="button" onClick={() => onChange(index)} aria-current={step === index ? 'step' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700 ${step === index ? 'bg-primary-800 text-white' : 'text-neutral-700 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700'}`}>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-primary-800">{index + 1}</span>
                {label}
            </button>
        ))}
    </nav>
);
