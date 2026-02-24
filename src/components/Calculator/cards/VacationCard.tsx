import React, { useEffect } from 'react';
import { Palmtree } from 'lucide-react';
import { CalculatorState } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface VacationCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

const parseCurrencyInput = (value: string) => {
    const raw = value.replace(/\D/g, '');
    return Number(raw) / 100;
};

export const VacationCard: React.FC<VacationCardProps> = ({ state, update, styles }) => {
    useEffect(() => {
        if (!state.feriasAntecipadas || state.feriasDescManual) {
            return;
        }

        const proximoDesconto = Math.round((state.ferias1_3 || 0) * 100) / 100;
        if (Math.abs((state.feriasDesc || 0) - proximoDesconto) > 0.009) {
            update('feriasDesc', proximoDesconto);
        }
    }, [state.feriasAntecipadas, state.feriasDescManual, state.ferias1_3, state.feriasDesc, update]);

    const handleFeriasAntecipadasChange = (checked: boolean) => {
        update('feriasAntecipadas', checked);

        if (!checked) {
            update('feriasDescManual', false);
            update('feriasDesc', 0);
            return;
        }

        if (!state.feriasDescManual) {
            update('feriasDesc', Math.round((state.ferias1_3 || 0) * 100) / 100);
        }
    };

    const handleFeriasDescManualChange = (checked: boolean) => {
        update('feriasDescManual', checked);

        if (!checked) {
            update('feriasDesc', Math.round((state.ferias1_3 || 0) * 100) / 100);
        } else if ((state.feriasDesc || 0) <= 0) {
            update('feriasDesc', Math.round((state.ferias1_3 || 0) * 100) / 100);
        }
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Palmtree className="w-4 h-4" />
                Ferias (1/3 Constitucional)
            </h3>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className={styles.label}>Adicional 1/3 Ferias</label>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={state.manualFerias}
                            onChange={e => update('manualFerias', e.target.checked)}
                            className={styles.checkbox}
                        />
                        Manual
                    </label>
                </div>

                {state.manualFerias ? (
                    <div className="relative">
                        <input
                            type="text"
                            className={styles.input}
                            data-calculator="true"
                            value={state.ferias1_3 ? state.ferias1_3.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                            onChange={e => update('ferias1_3', parseCurrencyInput(e.target.value))}
                            placeholder="0,00"
                        />
                    </div>
                ) : (
                    <div
                        className={styles.innerBox + ' cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'}
                        onClick={() => update('ferias1_3', state.ferias1_3 > 0 ? 0 : 1)}
                    >
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={state.ferias1_3 > 0}
                                readOnly
                                className={styles.checkbox}
                            />
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300">Receber adicional</span>
                                    <span className={styles.valueDisplay}>{formatCurrency(state.ferias1_3)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={state.feriasAntecipadas}
                            onChange={e => handleFeriasAntecipadasChange(e.target.checked)}
                            className={styles.checkbox}
                        />
                        Recebido 1/3 de ferias em um mes anterior
                    </label>
                    <p className="text-label text-neutral-400 mt-1 ml-6">
                        Marque se recebeu o pagamento no contracheque anterior.
                    </p>

                    {state.feriasAntecipadas && (
                        <div className="mt-3 ml-6 space-y-2">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={state.feriasDescManual}
                                    onChange={e => handleFeriasDescManualChange(e.target.checked)}
                                    className={styles.checkbox}
                                />
                                Alterar valor do desconto manualmente
                            </label>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-label text-neutral-500 dark:text-neutral-400">
                                    Desconto aplicado
                                </span>
                                <span className={styles.valueDisplay}>
                                    {formatCurrency(state.feriasDescManual ? state.feriasDesc : state.ferias1_3)}
                                </span>
                            </div>
                            {state.feriasDescManual && (
                                <input
                                    type="text"
                                    className={styles.input}
                                    data-calculator="true"
                                    value={state.feriasDesc ? state.feriasDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                    onChange={e => update('feriasDesc', parseCurrencyInput(e.target.value))}
                                    placeholder="0,00"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
