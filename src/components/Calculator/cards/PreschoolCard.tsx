import React from 'react';
import { Baby } from 'lucide-react';
import { CalculatorState } from '../../../types';

interface PreschoolCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const PreschoolCard: React.FC<PreschoolCardProps> = ({ state, update, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Baby className="w-4 h-4" /> Auxilios e Pre-Escolar
            </h3>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Pre-Escolar e Transporte</h4>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={styles.label}>Qtd. Dependentes (Pre-Escolar)</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.auxPreEscolarQtd}
                                onChange={e => update('auxPreEscolarQtd', Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Cota-Parte Pre-Escolar</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.cotaPreEscolar}
                                onChange={e => update('cotaPreEscolar', Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={styles.label}>Gasto Mensal Transporte (R$)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={state.auxTransporteGasto}
                            onChange={e => update('auxTransporteGasto', Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
