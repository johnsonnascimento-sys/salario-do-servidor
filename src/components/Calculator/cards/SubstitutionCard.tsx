import { IrEaCompetencias } from '../IrEaCompetencias';
import React from 'react';
import { SubstitutionEntry } from '../../../types';

interface SubstitutionCardProps {
    entry: SubstitutionEntry;
    updateEntry: (id: string, patch: Partial<SubstitutionEntry>) => void;
    functionKeys: string[];
    competenciaReferencia: string;
    styles: any;
}

export const SubstitutionCard: React.FC<SubstitutionCardProps> = ({ entry, updateEntry, functionKeys, styles }) => {
    const updateDays = (key: string, days: number) => {
        updateEntry(entry.id, { dias: { ...entry.dias, [key]: days } });
    };

    return (
        <div className="space-y-4">
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.isEA}
                                onChange={e => updateEntry(entry.id, { isEA: e.target.checked, excluirIR: e.target.checked ? false : entry.excluirIR })}
                            />
                            <span>Incluir na base do IR (Exercício Anterior - EA)</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={Boolean(entry.excluirIR)}
                                onChange={e => updateEntry(entry.id, { excluirIR: e.target.checked, isEA: e.target.checked ? false : entry.isEA })}
                            />
                            <span>Excluir da base do IR</span>
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

                    {entry.isEA && <IrEaCompetencias value={entry.competenciasEA} onChange={competenciasEA => updateEntry(entry.id, { competenciasEA })} styles={styles} />}

                    {entry.isEA && <label className={styles.label}>Valor bruto documentado da substituição (opcional)
                        <input type="number" min="0" step="0.01" className={styles.input} value={entry.valorBrutoManual ?? ''} onChange={event => updateEntry(entry.id, { valorBrutoManual: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0) })} />
                    </label>}

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
