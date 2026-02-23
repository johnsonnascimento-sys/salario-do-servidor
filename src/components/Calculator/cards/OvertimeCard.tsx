import React from 'react';
import { Clock } from 'lucide-react';
import { CalculatorState } from '../../../types';

interface OvertimeCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const OvertimeCard: React.FC<OvertimeCardProps> = ({ state, update, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Clock className="w-4 h-4" /> Serviço Extraordinário (HE)
            </h3>
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.heIsEA}
                                onChange={e => update('heIsEA', e.target.checked)}
                            />
                            <span>Exercício Anterior (EA)</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={styles.label}>Qtd. Horas (50%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.heQtd50}
                                onChange={e => update('heQtd50', Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Qtd. Horas (100%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.heQtd100}
                                onChange={e => update('heQtd100', Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
