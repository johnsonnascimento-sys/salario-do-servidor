import React, { useMemo } from 'react';
import { ArrowLeft, Save, User } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';

interface CalculatorHeaderProps {
    courtConfig: CourtConfig | null;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    navigate: (path: string) => void;
    styles: any;
    setState: React.Dispatch<React.SetStateAction<CalculatorState>>;
    agencyName?: string;
    onSavePayslip?: () => void;
    onOpenPayslips?: () => void;
    savingPayslip?: boolean;
}

export const CalculatorHeader: React.FC<CalculatorHeaderProps> = ({
    courtConfig,
    state,
    update,
    navigate,
    styles,
    setState,
    agencyName,
    onSavePayslip,
    onOpenPayslips,
    savingPayslip,
}) => {
    const referenceSalaryLabel = useMemo(() => {
        const schedule = courtConfig?.adjustment_schedule || [];
        const selected = schedule.find((entry) => entry.period === state.periodo);
        return selected?.label || `Período ${state.periodo}`;
    }, [courtConfig?.adjustment_schedule, state.periodo]);

    return (
        <div className="md:flex md:items-center md:justify-between mb-8 gap-4">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
                <button
                    type="button"
                    aria-label="Voltar para página inicial"
                    onClick={() => navigate('/')}
                    className="bg-white dark:bg-neutral-800 p-2 rounded-xl text-neutral-500 hover:text-secondary shadow-sm border border-neutral-200 dark:border-neutral-700 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-h3 font-bold text-neutral-900 dark:text-white">
                        {agencyName || 'Simulador'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-secondary/10 text-secondary text-body-xs font-bold tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-secondary"></span>
                            {`Referência salarial: ${referenceSalaryLabel}`}
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-auto flex flex-col md:items-end gap-2">
                <div className="w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Nome para impressão (Opcional)"
                        className={`${styles.input} w-full`}
                        value={state.nome}
                        onChange={e => {
                            const val = e.target.value;
                            if (val === 'Johnson*') {
                                setState(prev => ({ ...prev, nome: val, planoSaude: 928.52, emprestimos: 3761.63 }));
                            } else {
                                update('nome', val);
                            }
                        }}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onOpenPayslips}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-body-xs font-semibold text-neutral-700 dark:text-neutral-200"
                    >
                        <User className="w-4 h-4" />
                        Meus Holerites
                    </button>
                    <button
                        type="button"
                        onClick={onSavePayslip}
                        disabled={savingPayslip}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary-600 text-white text-body-xs font-semibold disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {savingPayslip ? 'Salvando...' : 'Salvar na Minha Área'}
                    </button>
                </div>
            </div>
        </div>
    );
};
