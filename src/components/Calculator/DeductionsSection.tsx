import React from 'react';
import { Minus } from 'lucide-react';
import { CalculatorState } from '../../types';

interface DeductionsSectionProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const DeductionsSection: React.FC<DeductionsSectionProps> = ({ state, update, styles }) => {
    return (
        <div className="space-y-6">
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Minus className="w-4 h-4" />Descontos / Retencoes
                </h3>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Previdencia & IR</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>Regime Prev.</label>
                                <select className={styles.input} value={state.regimePrev} onChange={e => update('regimePrev', e.target.value)}>
                                    <option value="antigo">RPPS (Antigo)</option>
                                    <option value="rpc">RPC (Teto INSS)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Dependentes (IR)</label>
                                <input type="number" className={styles.input} value={state.dependentes} onChange={e => update('dependentes', Number(e.target.value))} />
                            </div>
                        </div>

                        {state.regimePrev === 'rpc' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={styles.label}>Participacao Funpresp</label>
                                    <select className={styles.input} value={state.funprespParticipacao} onChange={e => update('funprespParticipacao', e.target.value)}>
                                        <option value="nao">Nao</option>
                                        <option value="patrocinado">Sim (Patrocinado)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={styles.label}>Contrib. Normal</label>
                                    <select className={styles.input} value={state.funprespAliq} onChange={e => update('funprespAliq', Number(e.target.value))}>
                                        <option value={0.065}>6.5%</option>
                                        <option value={0.07}>7.0%</option>
                                        <option value={0.075}>7.5%</option>
                                        <option value={0.08}>8.0%</option>
                                        <option value={0.085}>8.5%</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={styles.label}>Contrib. Facultativa (%)</label>
                                    <input
                                        type="number"
                                        className={styles.input}
                                        value={Number((state.funprespFacul * 100).toFixed(1))}
                                        onChange={e => update('funprespFacul', Number(e.target.value) / 100)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Outros Descontos</h4>
                    <div className="space-y-3">
                        <div>
                            <label className={styles.label}>Saude / Odonto (Titular + Dep.)</label>
                            <input type="number" className={styles.input} value={state.planoSaude} onChange={e => update('planoSaude', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className={styles.label}>Pensao Alimenticia (R$)</label>
                            <input type="number" className={styles.input} value={state.pensao} onChange={e => update('pensao', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className={styles.label}>Emprestimos / Consignados</label>
                            <input type="number" className={styles.input} value={state.emprestimos} onChange={e => update('emprestimos', Number(e.target.value))} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
