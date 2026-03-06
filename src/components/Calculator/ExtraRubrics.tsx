
import React from 'react';
import { List, Plus, Trash2 } from 'lucide-react';
import { CalculatorState, Rubrica } from '../../types';

interface ExtraRubricsProps {
    state: CalculatorState;
    addRubrica: (tipo?: Rubrica['tipo']) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    styles: any;
}

export const ExtraRubrics: React.FC<ExtraRubricsProps> = ({ state, addRubrica, removeRubrica, updateRubrica, styles }) => {
    return (
        <div className={`${styles.card} mt-8`}>
            <h3 className={styles.sectionTitle}>
                <List className="w-4 h-4" />Rubricas Manuais (Créditos / Débitos)
            </h3>
            <button
                onClick={addRubrica}
                className="w-full py-3 bg-secondary text-white rounded-xl text-body-xs font-bold uppercase hover:bg-secondary/90 shadow-lg shadow-secondary/20 transition-all flex items-center justify-center gap-2 mb-4"
            >
                <Plus className="h-4 w-4" /> Adicionar Crédito/Débito (Manual)
            </button>

            <div className="space-y-3">
                {state.rubricasExtras.map((rubrica) => (
                    <div key={rubrica.id} className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                        <div className="w-full md:w-32">
                            <select
                                className={styles.input}
                                value={rubrica.tipo}
                                onChange={e => updateRubrica(rubrica.id, 'tipo', e.target.value)}
                            >
                                <option value="C">Crédito (+)</option>
                                <option value="D">Débito (-)</option>
                            </select>
                        </div>
                        <input
                            type="text"
                            placeholder="Descrição"
                            className={`${styles.input} flex-1`}
                            value={rubrica.descricao}
                            onChange={e => updateRubrica(rubrica.id, 'descricao', e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="Valor"
                            className={`${styles.input} w-full md:w-32 text-right`}
                            value={rubrica.valor || ''}
                            onChange={e => updateRubrica(rubrica.id, 'valor', Number(e.target.value))}
                        />
                        <button onClick={() => removeRubrica(rubrica.id)} className="text-neutral-400 hover:text-error-500 p-2 rounded-lg hover:bg-neutral-50 dark:bg-transparent dark:hover:bg-neutral-900/60 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {state.rubricasExtras.length === 0 && (
                    <p className="text-center text-body text-neutral-400 italic py-4">Nenhuma rubrica manual adicionada.</p>
                )}
            </div>
        </div>
    );
};
