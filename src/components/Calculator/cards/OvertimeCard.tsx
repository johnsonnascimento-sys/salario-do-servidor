import React from 'react';
import { Clock } from 'lucide-react';
import { OvertimeEntry } from '../../../types';

interface OvertimeCardProps {
    entry: OvertimeEntry;
    updateEntry: (id: string, patch: Partial<OvertimeEntry>) => void;
    styles: any;
}

export const OvertimeCard: React.FC<OvertimeCardProps> = ({ entry, updateEntry, styles }) => {
    const handleCompetenciaChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 6);
        if (digits.length <= 2) {
            updateEntry(entry.id, { competenciaRef: digits });
            return;
        }
        updateEntry(entry.id, { competenciaRef: `${digits.slice(0, 2)}/${digits.slice(2)}` });
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Clock className="w-4 h-4" /> Serviço Extraordinário (HE)
            </h3>
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.isEA}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, { isEA: checked, excluirIR: checked ? false : entry.excluirIR });
                                }}
                            />
                            <span>Incluir na base do IR (Exercício Anterior - EA)</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.excluirIR}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, { excluirIR: checked, isEA: checked ? false : entry.isEA });
                                }}
                            />
                            <span>Excluir da base do IR</span>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={styles.label}>Qtd. Horas (50%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                min={0}
                                value={entry.qtd50}
                                onChange={e => updateEntry(entry.id, { qtd50: Math.max(0, Number(e.target.value) || 0) })}
                            />
                        </div>
                        <div>
                            <label className={styles.label}>Qtd. Horas (100%)</label>
                            <input
                                type="number"
                                className={styles.input}
                                min={0}
                                value={entry.qtd100}
                                onChange={e => updateEntry(entry.id, { qtd100: Math.max(0, Number(e.target.value) || 0) })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={styles.label}>Competencia da rubrica (MM/AAAA) - informativo</label>
                        <input
                            type="text"
                            className={styles.input}
                            inputMode="numeric"
                            maxLength={7}
                            placeholder="MM/AAAA"
                            value={entry.competenciaRef || ''}
                            onChange={e => handleCompetenciaChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
