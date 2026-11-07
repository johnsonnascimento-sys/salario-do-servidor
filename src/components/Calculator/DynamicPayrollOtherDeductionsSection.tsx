import React from 'react';
import { RotateCcw } from 'lucide-react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { toPositiveNumber } from './dynamicPayrollForm.helpers';

interface DynamicPayrollOtherDeductionsSectionProps {
    styles: Record<string, string>;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
}

export const DynamicPayrollOtherDeductionsSection: React.FC<DynamicPayrollOtherDeductionsSectionProps> = ({
    styles,
    state,
    update,
}) => {
    const totalOutrosDescontos = (Number(state.planoSaude) || 0) +
        (Number(state.emprestimos) || 0) +
        (Number(state.pensao) || 0);

    const handleClear = () => {
        update('planoSaude', 0);
        update('emprestimos', 0);
        update('pensao', 0);
    };

    return (
        <div className={styles.innerBox}>
            <div className={styles.innerBoxTitle}>
                <span>Outros descontos em folha</span>
                <div className="flex items-center gap-2 font-normal lowercase tracking-normal">
                    {totalOutrosDescontos > 0 && (
                        <>
                            <span className="text-body-xs font-mono font-bold text-error-600 dark:text-error-400">
                                {formatCurrency(totalOutrosDescontos)}
                            </span>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="inline-flex items-center gap-1 text-label font-bold text-neutral-400 hover:text-error-500 uppercase tracking-wider ml-1 transition-colors"
                                title="Zerar outros descontos"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Zerar
                            </button>
                        </>
                    )}
                </div>
            </div>

            <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Descontos facultativos ou judiciais (plano de saúde, empréstimos consignados e pensão alimentícia).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className={styles.label}>
                        Plano de Saúde / Odonto (R$)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={styles.input}
                        value={state.planoSaude || ''}
                        placeholder="0,00"
                        onChange={(e) => update('planoSaude', toPositiveNumber(e.target.value))}
                    />
                </div>
                <div>
                    <label className={styles.label}>
                        Consignações / Empréstimos (R$)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={styles.input}
                        value={state.emprestimos || ''}
                        placeholder="0,00"
                        onChange={(e) => update('emprestimos', toPositiveNumber(e.target.value))}
                    />
                </div>
                <div>
                    <label className={styles.label}>
                        Pensão Alimentícia (R$)
                    </label>
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={styles.input}
                        value={state.pensao || ''}
                        placeholder="0,00"
                        onChange={(e) => update('pensao', toPositiveNumber(e.target.value))}
                    />
                </div>
            </div>
        </div>
    );
};
