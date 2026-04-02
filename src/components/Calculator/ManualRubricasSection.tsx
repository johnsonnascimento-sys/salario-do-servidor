import React from 'react';
import { DollarSign, Minus, Plus, Trash2 } from 'lucide-react';
import { Rubrica } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface ManualRubricasSectionProps {
    rubricas: Rubrica[];
    styles: any;
    totalCreditos: number;
    totalDescontos: number;
    addRubrica: (tipo?: Rubrica['tipo']) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    toPositiveNumber: (value: string) => number;
}

export const ManualRubricasSection: React.FC<ManualRubricasSectionProps> = ({
    rubricas,
    styles,
    totalCreditos,
    totalDescontos,
    addRubrica,
    removeRubrica,
    updateRubrica,
    toPositiveNumber
}) => {
    return (
        <>
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <DollarSign className="w-4 h-4" />
                    Rubricas Manuais
                </h3>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                        Cada rubrica manual adicionada aparece em um card independente abaixo.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => addRubrica('C')}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-success-500/10 text-success-700 dark:text-success-400 border border-success-500/20 hover:bg-success-500/20 transition-colors text-body-xs font-bold uppercase tracking-wider"
                        >
                            <Plus className="w-4 h-4" />
                            Incluir credito
                        </button>
                        <button
                            type="button"
                            onClick={() => addRubrica('D')}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-error-500/10 text-error-700 dark:text-error-400 border border-error-500/20 hover:bg-error-500/20 transition-colors text-body-xs font-bold uppercase tracking-wider"
                        >
                            <Minus className="w-4 h-4" />
                            Incluir desconto
                        </button>
                    </div>
                </div>

                {rubricas.length === 0 && (
                    <p className="text-body text-neutral-400 italic py-4">
                        Nenhuma rubrica manual adicionada.
                    </p>
                )}

                {rubricas.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="rounded-xl border border-success-500/20 bg-success-500/5 px-4 py-3">
                            <p className="text-label font-bold uppercase tracking-widest text-success-700 dark:text-success-400">Total Creditos Dinamicos</p>
                            <p className="text-body font-bold font-mono text-success-700 dark:text-success-400">{formatCurrency(totalCreditos)}</p>
                        </div>
                        <div className="rounded-xl border border-error-500/20 bg-error-500/5 px-4 py-3">
                            <p className="text-label font-bold uppercase tracking-widest text-error-700 dark:text-error-400">Total Descontos Dinamicos</p>
                            <p className="text-body font-bold font-mono text-error-700 dark:text-error-400">{formatCurrency(totalDescontos)}</p>
                        </div>
                    </div>
                )}
            </div>

            {rubricas.map((rubrica, index) => (
                <div key={rubrica.id} className={`${styles.card} space-y-4`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span
                                className={`px-2.5 py-1 rounded-full text-body-xs font-bold ${rubrica.tipo === 'C'
                                    ? 'bg-success-500/10 text-success-700 dark:text-success-400'
                                    : 'bg-error-500/10 text-error-700 dark:text-error-400'
                                    }`}
                            >
                                {rubrica.tipo === 'C' ? 'Credito' : 'Desconto'} #{index + 1}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeRubrica(rubrica.id)}
                            className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            aria-label="Remover rubrica"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className={styles.label}>Tipo</label>
                            <select className={styles.input} value={rubrica.tipo} onChange={e => updateRubrica(rubrica.id, 'tipo', e.target.value as Rubrica['tipo'])}>
                                <option value="C">Credito (+)</option>
                                <option value="D">Desconto (-)</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className={styles.label}>Descricao</label>
                            <input type="text" className={styles.input} value={rubrica.descricao} onChange={e => updateRubrica(rubrica.id, 'descricao', e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>Valor</label>
                            <input type="number" className={styles.input} value={rubrica.valor || ''} onChange={e => updateRubrica(rubrica.id, 'valor', toPositiveNumber(e.target.value))} />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={rubrica.incideIR}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateRubrica(rubrica.id, 'incideIR', checked);
                                    if (checked) {
                                        updateRubrica(rubrica.id, 'isEA', false);
                                    }
                                }}
                            />
                            <span>Incluir na base do IR</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={rubrica.isEA}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateRubrica(rubrica.id, 'isEA', checked);
                                    if (checked) {
                                        updateRubrica(rubrica.id, 'incideIR', false);
                                    }
                                }}
                            />
                            <span>Incluir na base do IR (Exercicio Anterior - EA)</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={rubrica.incidePSS}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateRubrica(rubrica.id, 'incidePSS', checked);
                                    if (checked) {
                                        updateRubrica(rubrica.id, 'pssCompetenciaSeparada', false);
                                    }
                                }}
                            />
                            <span>Incluir na base do PSS</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={rubrica.pssCompetenciaSeparada}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateRubrica(rubrica.id, 'pssCompetenciaSeparada', checked);
                                    if (checked) {
                                        updateRubrica(rubrica.id, 'incidePSS', false);
                                    }
                                }}
                            />
                            <span>Incluir na base do PSS (Exercicio Anterior - EA)</span>
                        </label>
                    </div>
                </div>
            ))}
        </>
    );
};
