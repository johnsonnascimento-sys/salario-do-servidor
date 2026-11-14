import { IrEaCompetencias, getDefaultEaCompetencia } from '../IrEaCompetencias';
import React from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { SubstitutionEntry } from '../../../types';

interface SubstitutionCardProps {
    entry: SubstitutionEntry;
    updateEntry: (id: string, patch: Partial<SubstitutionEntry>) => void;
    functionKeys: string[];
    competenciaReferencia: string;
    styles: any;
}

export const SubstitutionCard: React.FC<SubstitutionCardProps> = ({ entry, updateEntry, functionKeys, competenciaReferencia, styles }) => {
    const updateDays = (key: string, days: number) => {
        updateEntry(entry.id, { dias: { ...entry.dias, [key]: days } });
    };

    return (
        <div className="space-y-4">
            <div className={styles.innerBox}>
                <div className="space-y-4">
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
            <details className="group pt-1" open={entry.isEA || entry.excluirIR || entry.pssIsEA || undefined}>
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-1.5 text-body-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary rounded">
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Opções Tributárias Avançadas & Exercícios Anteriores (EA)</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-2.5 p-3.5 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.isEA}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, {
                                        isEA: checked,
                                        excluirIR: checked ? false : entry.excluirIR,
                                        competenciasEA: checked && (!entry.competenciasEA || entry.competenciasEA.length === 0)
                                            ? [getDefaultEaCompetencia(competenciaReferencia)]
                                            : entry.competenciasEA
                                    });
                                }}
                            />
                            <span>Incluir na base do IR de Exercício Anterior (IR-EA / RRA)</span>
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

                    {entry.isEA && (
                        <IrEaCompetencias
                            tipo="substituicao"
                            value={entry.competenciasEA}
                            onChange={competenciasEA => updateEntry(entry.id, { competenciasEA })}
                            styles={styles}
                            competenciaReferencia={competenciaReferencia}
                        />
                    )}

                    {entry.isEA && <label className={styles.label}>Valor bruto documentado da substituição (opcional)
                        <input type="number" min="0" step="0.01" className={styles.input} value={entry.valorBrutoManual ?? ''} onChange={event => updateEntry(entry.id, { valorBrutoManual: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0) })} />
                    </label>}
                </div>
            </details>
        </div>
    );
};
