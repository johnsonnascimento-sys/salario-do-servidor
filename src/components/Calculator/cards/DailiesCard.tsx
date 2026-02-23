import React from 'react';
import { Plane } from 'lucide-react';
import { CalculatorState } from '../../../types';

interface DailiesCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const DailiesCard: React.FC<DailiesCardProps> = ({ state, update, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Plane className="w-4 h-4" /> Diárias
            </h3>

            <div className="space-y-6">
                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Diárias de Viagem</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>Qtd. Dias</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={state.diariasQtd || ''}
                                    onChange={e => update('diariasQtd', Number(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Dia de Embarque</label>
                                <select
                                    className={styles.input}
                                    value={state.diariasEmbarque}
                                    onChange={e => update('diariasEmbarque', e.target.value)}
                                >
                                    <option value="nenhum">Nenhum</option>
                                    <option value="metade">Meia Diária</option>
                                    <option value="completo">Diária Completa</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Descontos Internos</h4>
                    <div className="flex gap-4 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.diariasDescontarAlimentacao}
                                onChange={e => update('diariasDescontarAlimentacao', e.target.checked)}
                            />
                            <span>Aux. Alimentação</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={state.diariasDescontarTransporte}
                                onChange={e => update('diariasDescontarTransporte', e.target.checked)}
                            />
                            <span>Aux. Transporte</span>
                        </label>
                    </div>
                </div>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Auxílios Recebidos (Glosar)</h4>
                    <div className="space-y-2">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.diariasExtHospedagem}
                                onChange={e => update('diariasExtHospedagem', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Hospedagem Fornecida
                        </label>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.diariasExtAlimentacao}
                                onChange={e => update('diariasExtAlimentacao', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Alimentação Fornecida
                        </label>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.diariasExtTransporte}
                                onChange={e => update('diariasExtTransporte', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Transporte Fornecido
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
