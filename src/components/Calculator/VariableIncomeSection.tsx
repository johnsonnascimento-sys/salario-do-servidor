
import React from 'react';
import { Clock, Briefcase } from 'lucide-react';
import { CalculatorState } from '../../types';

interface VariableIncomeSectionProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    updateSubstDays: (key: string, days: number) => void;
    styles: any;
}

export const VariableIncomeSection: React.FC<VariableIncomeSectionProps> = ({ state, update, updateSubstDays, styles }) => {
    return (
        <div className="space-y-6">
            {/* Substitution */}
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Briefcase className="w-4 h-4" /> Substituição de Função
                </h3>
                <div className={styles.innerBox}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" className={styles.checkbox} checked={state.substIsEA} onChange={e => update('substIsEA', e.target.checked)} />
                                <span>Exercício Anterior (EA)</span>
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

            {/* Licença Compensatória */}
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Briefcase className="w-4 h-4" /> Licença Compensatória
                </h3>
                <div className={styles.innerBox}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>Qtd. Dias Indenizados</label>
                                <input type="number" className={styles.input} value={state.licencaDias} onChange={e => update('licencaDias', Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Service Extraordinary */}
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Clock className="w-4 h-4" /> Serviço Extraordinário (HE)
                </h3>
                <div className={styles.innerBox}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" className={styles.checkbox} checked={state.heIsEA} onChange={e => update('heIsEA', e.target.checked)} />
                                <span>Exercício Anterior (EA)</span>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>Qtd. Horas (50%)</label>
                                <input type="number" className={styles.input} value={state.heQtd50} onChange={e => update('heQtd50', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className={styles.label}>Qtd. Horas (100%)</label>
                                <input type="number" className={styles.input} value={state.heQtd100} onChange={e => update('heQtd100', Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
