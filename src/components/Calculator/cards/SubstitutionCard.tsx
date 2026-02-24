import React from 'react';
import { Briefcase } from 'lucide-react';
import { CalculatorState } from '../../../types';

interface SubstitutionCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    updateSubstDays: (key: string, days: number) => void;
    functionKeys: string[];
    styles: any;
}

export const SubstitutionCard: React.FC<SubstitutionCardProps> = ({ state, update, updateSubstDays, functionKeys, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Briefcase className="w-4 h-4" /> Substituição de Função
            </h3>
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.substIsEA}
                                onChange={e => update('substIsEA', e.target.checked)}
                            />
                            <span>Incluir na base do IR (Exercício Anterior - EA)</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.substPssIsEA}
                                onChange={e => update('substPssIsEA', e.target.checked)}
                            />
                            <span>Incluir na base do PSS (Exercício Anterior - EA)</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {functionKeys.map((key) => (
                            <div key={key}>
                                <label className={styles.label}>{key.toUpperCase()}</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={state.substDias[key] || 0}
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
