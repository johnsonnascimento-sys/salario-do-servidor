import React from 'react';
import { ArrowLeftRight, User } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';

interface CalculatorHeaderProps {
    courtConfig: CourtConfig | null;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    navigate: (path: string) => void;
    styles: any;
    isUserAuthenticated?: boolean;
    loggedUserName?: string;
    agencyName?: string;
    onSavePayslip?: () => void;
    onOpenPayslips?: () => void;
    savingPayslip?: boolean;
    onClearCalculator?: () => void;
    calculationReady?: boolean;
}

export const CalculatorHeader: React.FC<CalculatorHeaderProps> = ({
    state,
    update,
    navigate,
    styles,
    isUserAuthenticated,
    loggedUserName,
    agencyName,
    onOpenPayslips,
}) => {
    return (
        <header className="grid gap-6 mb-6 lg:grid-cols-2 lg:items-end">
            <div className="min-w-0">
                <div>
                    <h1 className="text-h2 font-bold tracking-tight text-neutral-900 dark:text-white">
                        Simulador de remuneração
                    </h1>
                    <p className="mt-2 text-body-lg text-neutral-600 dark:text-neutral-300">{agencyName}</p>
                    <button type="button" onClick={() => navigate('/beta-access')} className="mt-1 inline-flex min-h-11 items-center gap-2 text-body font-semibold text-primary-800 dark:text-primary-300">
                        <ArrowLeftRight size={16} aria-hidden="true" /> Trocar órgão
                    </button>
                </div>
            </div>

            <div className="w-full md:w-auto flex flex-col md:items-end gap-2">
                <div className="w-full lg:max-w-md">
                    <label htmlFor="calculator-print-name" className={styles.label}>Nome para impressão <span className="font-normal">(opcional)</span></label>
                    <input
                        id="calculator-print-name"
                        type="text"
                        placeholder={isUserAuthenticated ? (loggedUserName || 'Nome para impressão') : 'Nome para impressão (Opcional)'}
                        className={`${styles.input} w-full`}
                        value={state.nome}
                        onChange={e => update('nome', e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onOpenPayslips}
                        className="inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-body font-semibold text-neutral-700 dark:text-neutral-200"
                    >
                        <User className="w-4 h-4" />
                        Meus Holerites
                    </button>
                </div>
            </div>
        </header>
    );
};
