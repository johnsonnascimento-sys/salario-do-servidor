import React from 'react';
import { Briefcase } from 'lucide-react';
import { SubstitutionEntry } from '../../../types';

interface SubstitutionCardProps {
    entry: SubstitutionEntry;
    updateEntry: (id: string, patch: Partial<SubstitutionEntry>) => void;
    functionKeys: string[];
    styles: any;
}

export const SubstitutionCard: React.FC<SubstitutionCardProps> = ({ entry, updateEntry, functionKeys, styles }) => {
    const updateDays = (key: string, days: number) => {
        updateEntry(entry.id, { dias: { ...entry.dias, [key]: days } });
    };

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
                                checked={entry.isEA}
                                onChange={e => updateEntry(entry.id, { isEA: e.target.checked })}
                            />
                            <span>Incluir na base do IR (Exercício Anterior - EA)</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.pssIsEA}
                                onChange={e => updateEntry(entry.id, { pssIsEA: e.target.checked })}
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
                                    min={0}
                                    value={entry.dias[key] || 0}
                                    onChange={e => updateDays(key, Math.max(0, Number(e.target.value) || 0))}
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
