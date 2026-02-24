import React from 'react';
import { Gift } from 'lucide-react';
import { CalculatorState } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface ThirteenthCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

const parseCurrencyInput = (value: string) => {
    const raw = value.replace(/\D/g, '');
    return Number(raw) / 100;
};

export const ThirteenthCard: React.FC<ThirteenthCardProps> = ({ state, update, styles }) => {
    const renderAutoToggle = (enabled: boolean, amount: number, label: string, onToggle: () => void) => (
        <div
            className={styles.innerBox + ' cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    checked={enabled}
                    readOnly
                    className={styles.checkbox}
                />
                <div className="flex-1">
                    <div className="flex justify-between">
                        <span className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300">{label}</span>
                        <span className="text-body-xs font-mono text-neutral-500">{formatCurrency(amount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Gift className="w-4 h-4" />
                Gratificacao Natalina
            </h3>

            <div className="space-y-4">
                <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                    1a parcela sem IR/PSS. Na 2a parcela, IR e PSS sobre o total (1a + 2a), sem PSS sobre FC/CJ, com abatimento da 1a parcela.
                </p>

                <div className="flex justify-end">
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={state.manualAdiant13}
                            onChange={e => update('manualAdiant13', e.target.checked)}
                            className={styles.checkbox}
                        />
                        Controles manuais
                    </label>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>Adiant. 1a Parcela (Vencimento)</label>
                        {state.manualAdiant13 ? (
                            <input
                                type="text"
                                className={styles.input}
                                value={state.adiant13Venc ? state.adiant13Venc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => update('adiant13Venc', parseCurrencyInput(e.target.value))}
                                placeholder="0,00"
                            />
                        ) : (
                            renderAutoToggle(
                                state.adiant13Venc > 0,
                                state.adiant13Venc,
                                'Receber adiantamento',
                                () => {
                                    const nextEnabled = !(state.adiant13Venc > 0);
                                    if (nextEnabled) {
                                        update('adiant13Venc', 1);
                                        return;
                                    }
                                    update('adiant13Venc', 0);
                                    if (state.segunda13Venc > 0) {
                                        update('segunda13Venc', 0);
                                    }
                                }
                            )
                        )}
                    </div>

                    <div>
                        <label className={styles.label}>Adiant. 1a Parcela (FC/CJ)</label>
                        {state.manualAdiant13 ? (
                            <input
                                type="text"
                                className={styles.input}
                                value={state.adiant13FC ? state.adiant13FC.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => update('adiant13FC', parseCurrencyInput(e.target.value))}
                                placeholder="0,00"
                            />
                        ) : (
                            renderAutoToggle(
                                state.adiant13FC > 0,
                                state.adiant13FC,
                                'Receber adiantamento',
                                () => {
                                    const nextEnabled = !(state.adiant13FC > 0);
                                    if (nextEnabled) {
                                        update('adiant13FC', 1);
                                        return;
                                    }
                                    update('adiant13FC', 0);
                                    if (state.segunda13FC > 0) {
                                        update('segunda13FC', 0);
                                    }
                                }
                            )
                        )}
                    </div>

                    <div>
                        <label className={styles.label}>2a Parcela (Vencimento)</label>
                        {state.manualAdiant13 ? (
                            <input
                                type="text"
                                className={styles.input}
                                value={state.segunda13Venc ? state.segunda13Venc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => update('segunda13Venc', parseCurrencyInput(e.target.value))}
                                placeholder="0,00"
                            />
                        ) : (
                            renderAutoToggle(
                                state.segunda13Venc > 0,
                                state.segunda13Venc,
                                'Receber segunda parcela',
                                () => {
                                    const nextEnabled = !(state.segunda13Venc > 0);
                                    if (nextEnabled) {
                                        update('segunda13Venc', 1);
                                        if (state.adiant13Venc <= 0) {
                                            update('adiant13Venc', 1);
                                        }
                                        return;
                                    }
                                    update('segunda13Venc', 0);
                                }
                            )
                        )}
                    </div>

                    <div>
                        <label className={styles.label}>2a Parcela (FC/CJ)</label>
                        {state.manualAdiant13 ? (
                            <input
                                type="text"
                                className={styles.input}
                                value={state.segunda13FC ? state.segunda13FC.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => update('segunda13FC', parseCurrencyInput(e.target.value))}
                                placeholder="0,00"
                            />
                        ) : (
                            renderAutoToggle(
                                state.segunda13FC > 0,
                                state.segunda13FC,
                                'Receber segunda parcela',
                                () => {
                                    const nextEnabled = !(state.segunda13FC > 0);
                                    if (nextEnabled) {
                                        update('segunda13FC', 1);
                                        if (state.adiant13FC <= 0) {
                                            update('adiant13FC', 1);
                                        }
                                        return;
                                    }
                                    update('segunda13FC', 0);
                                }
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
