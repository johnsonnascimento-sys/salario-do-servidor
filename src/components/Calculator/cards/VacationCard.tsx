import React from 'react';
import { Palmtree } from 'lucide-react';
import { CalculatorState } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface VacationCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const VacationCard: React.FC<VacationCardProps> = ({ state, update, styles }) => {
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

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={state.feriasAntecipadas}
                            onChange={e => update('feriasAntecipadas', e.target.checked)}
                            className={styles.checkbox}
                        />
                        Antecipar 1/3 das ferias?
                    </label>
                    <p className="text-label text-neutral-400 mt-1 ml-6">
                        Marque se recebeu o pagamento no contracheque anterior.
                    </p>
                </div>
            </div>
        </div>
    );
};
