import React from 'react';
import { CalculatorState } from '../../types';
import { Plane, Briefcase } from 'lucide-react';

interface IndemnitySectionProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const IndemnitySection: React.FC<IndemnitySectionProps> = ({ state, update, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Plane className="w-4 h-4" />
                Indenizações e Diárias
            </h3>

            <div className="space-y-6">

                {/* Diárias Block */}
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

                        {/* Deduções (Glosas) */}
                        <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                            <label className={styles.label + " mb-2"}>Auxílios Recebidos (Glosar)</label>

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

                {/* Licença Block */}
                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Licença Compensatória</h4>
                    <div className="space-y-4">
                        <div>
                            <label className={styles.label}>Qtd. Dias a Indenizar</label>
                            <input
                                type="number"
                                className={styles.input}
                                value={state.licencaDias || ''}
                                onChange={e => update('licencaDias', Number(e.target.value))}
                                placeholder="0"
                            />
                        </div>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.incluirAbonoLicenca}
                                onChange={e => update('incluirAbonoLicenca', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Incluir Abono na Base?
                        </label>
                    </div>
                </div>

            </div>
        </div>
    );
};
