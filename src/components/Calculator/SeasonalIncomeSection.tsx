import React, { useEffect } from 'react';
import { CalculatorState } from '../../types';
import { Calendar, Gift, Palmtree } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface SeasonalIncomeSectionProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const SeasonalIncomeSection: React.FC<SeasonalIncomeSectionProps> = ({ state, update, styles }) => {

    const handleAdiantamentoToggle = (field: 'adiant13Venc' | 'adiant13FC', checked: boolean) => {
        if (checked) {
            if (field === 'adiant13Venc') {
                update(field, state.vencimento / 2);
            } else {
                update(field, 0.01);
            }
        } else {
            update(field, 0);
        }
    };

    return (
        <div className="grid grid-cols-1 gap-6">

            {/* CARD 1: FÉRIAS */}
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Palmtree className="w-4 h-4" />
                    Férias (1/3 Constitucional)
                </h3>

                <div className="space-y-4">

                    {/* Manual Toggle */}
                    <div className="flex items-center justify-between">
                        <label className={styles.label}>Adicional 1/3 Férias</label>
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

                    {/* Value Input (Visible only if Manual) */}
                    {state.manualFerias ? (
                        <div className="relative">
                            <input
                                type="text"
                                className={styles.input}
                                value={state.ferias1_3 ? state.ferias1_3.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    update('ferias1_3', Number(raw) / 100);
                                }}
                                placeholder="0,00"
                            />
                        </div>
                    ) : (
                        <div className={styles.innerBox}>
                            <div className="flex justify-between items-center">
                                <span className={styles.internalTotalLabel}>Calculado</span>
                                <span className={styles.valueDisplay}>{formatCurrency(state.ferias1_3)}</span>
                            </div>
                        </div>
                    )}

                    {/* Antecipacao Toggle */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.feriasAntecipadas}
                                onChange={e => update('feriasAntecipadas', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Antecipar 1/3 das férias?
                        </label>
                        <p className="text-label text-neutral-400 mt-1 ml-6">
                            Marque se recebeu o pagamento no contracheque anterior.
                        </p>
                    </div>

                </div>
            </div>

            {/* CARD 2: 13º SALÁRIO */}
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Gift className="w-4 h-4" />
                    Gratificação Natalina
                </h3>

                <div className="space-y-4">

                    {/* Manual Toggle */}
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

                    {/* Controls */}
                    <div className="space-y-4">

                        {/* Vencimento Part */}
                        <div>
                            <label className={styles.label}>Adiant. 1ª Parcela (Vencimento)</label>

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
                                <div className={styles.innerBox + " cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"} onClick={() => update('adiant13Venc', state.adiant13Venc > 0 ? 0 : (state.vencimento + state.gaj + state.aqTituloValor) / 2)}>
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

                        {/* FC Part */}
                        <div>
                            <label className={styles.label}>Adiant. 1ª Parcela (FC/CJ)</label>

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
                                <div className={styles.innerBox + " cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"} onClick={() => update('adiant13FC', state.adiant13FC > 0 ? 0 : 1)}>
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
        </div>
    );
};
