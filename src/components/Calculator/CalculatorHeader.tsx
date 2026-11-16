import React from 'react';
import { ArrowLeftRight, Landmark } from 'lucide-react';

interface CalculatorHeaderProps {
    navigate: (path: string) => void;
    agencyName?: string;
}

export const CalculatorHeader: React.FC<CalculatorHeaderProps> = ({ navigate, agencyName }) => (
    <header className="mb-6 space-y-4">
        <h1 className="text-h2 font-bold tracking-tight text-neutral-900 dark:text-white">Simulador de remuneração</h1>
        <div>
            <p className="mb-2 text-body font-semibold text-neutral-600 dark:text-neutral-300">Órgão selecionado</p>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="flex min-w-0 items-center gap-3">
                    <Landmark className="h-6 w-6 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                    <span className="break-words text-body-lg font-semibold text-neutral-900 dark:text-neutral-100">{agencyName}</span>
                </div>
                <button type="button" onClick={() => navigate('/beta-access')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary-700 px-4 py-2 text-body font-semibold text-primary-800 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-300 dark:hover:bg-primary-900/30">
                    <ArrowLeftRight size={16} aria-hidden="true" /> Trocar órgão
                </button>
            </div>
        </div>
    </header>
);
