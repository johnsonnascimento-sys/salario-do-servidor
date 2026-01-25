
import React from 'react';
import { DollarSign } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';
import { formatCurrency, getTablesForPeriod } from '../../utils/calculations';

interface IncomeSectionProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    courtConfig: CourtConfig | null;
    styles: any;
    isNovoAQ: boolean;
}

export const IncomeSection: React.FC<IncomeSectionProps> = ({ state, update, courtConfig, styles, isNovoAQ }) => {
    const currentTables = getTablesForPeriod(state.periodo, courtConfig || undefined);

    return (
        <div className="space-y-6">
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <DollarSign className="w-4 h-4" />Rendimentos Fixos
                </h3>

                {/* Cargo Grouped Box */}
                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>
                        Dados Funcionais
                    </h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>Cargo</label>
                                <select className={styles.input} value={state.cargo} onChange={e => update('cargo', e.target.value)}>
                                    <option value="tecnico">Técnico</option>
                                    <option value="analista">Analista</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Classe/Padrão</label>
                                <select className={styles.input} value={state.padrao} onChange={e => update('padrao', e.target.value)}>
                                    {Object.keys(currentTables.salario[state.cargo]).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className={styles.label}>FC / CJ</label>
                            <select className={styles.input} value={state.funcao} onChange={e => update('funcao', e.target.value)}>
                                <option value="0">Sem Função / Manual</option>
                                {Object.keys(currentTables.funcoes).map(f => (
                                    <option key={f} value={f}>{f.toUpperCase()} - {formatCurrency(currentTables.funcoes[f])}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* AQ Section */}
                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>
                        Adicional Qualificação
                        <span className="text-label bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">{isNovoAQ ? 'LEI 15.292/2026' : 'REGRA ATUAL'}</span>
                    </h4>

                    {isNovoAQ ? (
                        <div className="space-y-3">
                            <div>
                                <label className={styles.label}>Títulos (Base: VR = R$ 714,39)</label>
                                <select className={styles.input} value={state.aqTituloVR} onChange={e => update('aqTituloVR', Number(e.target.value))}>
                                    <option value={0}>Nenhum</option>
                                    <option value={1.0}>Especialização (1.0x VR)</option>
                                    <option value={2.0}>2x Especialização (2.0x VR)</option>
                                    <option value={3.5}>Mestrado (3.5x VR)</option>
                                    <option value={5.0}>Doutorado (5.0x VR)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Treinamento (Base: VR)</label>
                                <select className={styles.input} value={state.aqTreinoVR} onChange={e => update('aqTreinoVR', Number(e.target.value))}>
                                    <option value={0}>Nenhum</option>
                                    <option value={0.2}>120h (0.2x VR)</option>
                                    <option value={0.4}>240h (0.4x VR)</option>
                                    <option value={0.6}>360h (0.6x VR)</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={styles.label}>Títulos %</label>
                                    <select className={styles.input} value={state.aqTituloPerc} onChange={e => update('aqTituloPerc', Number(e.target.value))}>
                                        <option value={0}>0%</option>
                                        <option value={0.075}>7.5% (Especialização)</option>
                                        <option value={0.10}>10% (Mestrado)</option>
                                        <option value={0.125}>12.5% (Doutorado)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={styles.label}>Treinamento %</label>
                                    <select className={styles.input} value={state.aqTreinoPerc} onChange={e => update('aqTreinoPerc', Number(e.target.value))}>
                                        <option value={0}>0%</option>
                                        <option value={1}>1% (120h)</option>
                                        <option value={2}>2% (240h)</option>
                                        <option value={3}>3% (360h)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Other Income (VPNI, GAS/GAE) */}
                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Outros Adicionais</h4>
                    <div className="space-y-3">
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" className={styles.checkbox} checked={state.recebeAbono} onChange={e => update('recebeAbono', e.target.checked)} />
                            <span>Abono de Permanência</span>
                        </label>

                        <div>
                            <label className={styles.label}>GAS / GAE</label>
                            <select className={styles.input} value={state.gratEspecificaTipo} onChange={e => update('gratEspecificaTipo', e.target.value)}>
                                <option value="nenhum">Nenhuma</option>
                                <option value="gae">GAE (Oficial de Justiça) - 35%</option>
                                <option value="gas">GAS (Agente de Polícia) - 35%</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>VPNI (Lei)</label>
                                <input type="number" className={styles.input} value={state.vpni_lei} onChange={e => update('vpni_lei', Number(e.target.value))} />
                            </div>
                            <div>
                                <label className={styles.label}>VPNI (Decisão)</label>
                                <input type="number" className={styles.input} value={state.vpni_decisao} onChange={e => update('vpni_decisao', Number(e.target.value))} />
                            </div>
                        </div>

                        <div>
                            <label className={styles.label}>Anuênios (ATS) - Valor</label>
                            <input type="number" className={styles.input} value={state.ats} onChange={e => update('ats', Number(e.target.value))} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
