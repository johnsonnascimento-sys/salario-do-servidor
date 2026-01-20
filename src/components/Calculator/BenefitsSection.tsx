
import React from 'react';
import { Plane, Bus, Baby, Calculator } from 'lucide-react';
import { CalculatorState } from '../../types';

interface BenefitsSectionProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const BenefitsSection: React.FC<BenefitsSectionProps> = ({ state, update, styles }) => {
    return (
        <div className="space-y-6">
            {/* Auxílios */}
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Baby className="w-4 h-4" /> Auxílios e Indenizações
                </h3>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Pré-Escolar e Transporte</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>Qtd. Dependentes (Pré-Escolar)</label>
                                <input type="number" className={styles.input} value={state.auxPreEscolarQtd} onChange={e => update('auxPreEscolarQtd', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className={styles.label}>Cota-Parte Pré-Escolar</label>
                                <input type="number" className={styles.input} value={state.cotaPreEscolar} onChange={e => update('cotaPreEscolar', Number(e.target.value))} />
                            </div>
                        </div>
                        <div>
                            <label className={styles.label}>Gasto Mensal Transporte (R$)</label>
                            <input type="number" className={styles.input} value={state.auxTransporteGasto} onChange={e => update('auxTransporteGasto', Number(e.target.value))} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Diárias */}
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Plane className="w-4 h-4" /> Diárias
                </h3>
                <div className={styles.innerBox}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className={styles.label}>Integral</label>
                                <input type="number" className={styles.input} value={state.diariasQtd} onChange={e => update('diariasQtd', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className={styles.label}>Meia</label>
                                <input type="number" className={styles.input} value={state.diariasMeiaQtd} onChange={e => update('diariasMeiaQtd', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className={styles.label}>Embarque</label>
                                <input type="number" className={styles.input} value={state.diariasEmbarque} onChange={e => update('diariasEmbarque', Number(e.target.value))} />
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <p className={styles.label}>Descontos em Diárias</p>
                            <div className="flex gap-4 flex-wrap">
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" className={styles.checkbox} checked={state.diariasDescontarAlimentacao} onChange={e => update('diariasDescontarAlimentacao', e.target.checked)} />
                                    <span>Aux. Alimentação</span>
                                </label>
                                <label className={styles.checkboxLabel}>
                                    <input type="checkbox" className={styles.checkbox} checked={state.diariasDescontarTransporte} onChange={e => update('diariasDescontarTransporte', e.target.checked)} />
                                    <span>Aux. Transporte</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
