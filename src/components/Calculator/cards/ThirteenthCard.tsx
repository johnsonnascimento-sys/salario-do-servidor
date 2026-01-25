import React from 'react';
import { Gift } from 'lucide-react';
import { CalculatorState } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface ThirteenthCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const ThirteenthCard: React.FC<ThirteenthCardProps> = ({ state, update, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Gift className="w-4 h-4" />
                Gratificacao Natalina
            </h3>

            <div className="space-y-4">
                <div className="flex justify-end">
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={state.manualAdiant13}
                            onChange={e => update('manualAdiant13', e.target.checked)}
                            className={styles.checkbox}
                        />
                        Controles Manuais
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
                                onChange={e => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    update('adiant13Venc', Number(raw) / 100);
                                }}
                                placeholder="0,00"
                            />
                        ) : (
                            <div
                                className={styles.innerBox + ' cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'}
                                onClick={() => update('adiant13Venc', state.adiant13Venc > 0 ? 0 : (state.vencimento + state.gaj + state.aqTituloValor) / 2)}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={state.adiant13Venc > 0}
                                        readOnly
                                        className={styles.checkbox}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300">Receber Adiantamento</span>
                                            <span className="text-body-xs font-mono text-neutral-500">{formatCurrency(state.adiant13Venc)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={styles.label}>Adiant. 1a Parcela (FC/CJ)</label>

                        {state.manualAdiant13 ? (
                            <input
                                type="text"
                                className={styles.input}
                                value={state.adiant13FC ? state.adiant13FC.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    update('adiant13FC', Number(raw) / 100);
                                }}
                                placeholder="0,00"
                            />
                        ) : (
                            <div
                                className={styles.innerBox + ' cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'}
                                onClick={() => update('adiant13FC', state.adiant13FC > 0 ? 0 : 1)}
                            >
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={state.adiant13FC > 0}
                                        readOnly
                                        className={styles.checkbox}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300">Receber Adiantamento</span>
                                            <span className="text-body-xs font-mono text-neutral-500">{formatCurrency(state.adiant13FC)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
