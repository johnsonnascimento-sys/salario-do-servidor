import React from 'react';
import { Briefcase } from 'lucide-react';
import { CalculatorState } from '../../../types';

interface SubstitutionCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    updateSubstDays: (key: string, days: number) => void;
    styles: any;
}

export const SubstitutionCard: React.FC<SubstitutionCardProps> = ({ state, update, updateSubstDays, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Briefcase className="w-4 h-4" /> Substituicao de Funcao
            </h3>
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.substIsEA}
                                onChange={e => update('substIsEA', e.target.checked)}
                            />
                            <span>Exercicio Anterior (EA)</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(state.substDias).map(([key, value]) => (
                            <div key={key}>
                                <label className={styles.label}>{key.toUpperCase()}</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={value}
                                    onChange={e => updateSubstDays(key, Number(e.target.value))}
                                    placeholder="Dias"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
