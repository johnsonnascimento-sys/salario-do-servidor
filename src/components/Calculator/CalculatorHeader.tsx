import React from 'react';
import { ArrowLeftRight, Landmark } from 'lucide-react';

interface CalculatorHeaderProps {
    navigate: (path: string) => void;
    agencyName?: string;
}

export const CalculatorHeader: React.FC<CalculatorHeaderProps> = ({ navigate, agencyName }) => (
    <header className="mb-3 min-[960px]:mb-6 min-[960px]:space-y-4">
        <h1 className="sr-only text-h2 font-bold tracking-tight text-neutral-900 dark:text-white min-[960px]:not-sr-only">Simulador de remuneração</h1>
        <button type="button" onClick={() => navigate('/beta-access')} aria-label={`Trocar órgão: ${agencyName ?? ''}`}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-body-sm font-semibold dark:border-neutral-700 dark:bg-neutral-800 min-[960px]:hidden">
            <Landmark className="h-5 w-5 shrink-0 text-secondary-700 dark:text-secondary-300" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">{agencyName}</span>
            <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
        <div className="hidden min-[960px]:block">
            <p className="mb-2 text-body font-semibold text-neutral-600 dark:text-neutral-300">Órgão selecionado</p>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
                <div className="flex min-w-0 items-center gap-3">
                    <Landmark className="h-6 w-6 shrink-0 text-secondary-700 dark:text-secondary-300" aria-hidden="true" />
                    <span className="break-words text-body-lg font-semibold text-neutral-900 dark:text-neutral-100">{agencyName}</span>
                </div>
                <button type="button" onClick={() => navigate('/beta-access')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-secondary-700 px-4 py-2 text-body font-semibold text-secondary-800 hover:bg-secondary-50 dark:border-secondary-400 dark:text-secondary-300 dark:hover:bg-secondary-900/30">
                    <ArrowLeftRight size={16} aria-hidden="true" /> Trocar órgão
                </button>
            </div>
        </div>
    </header>
);
