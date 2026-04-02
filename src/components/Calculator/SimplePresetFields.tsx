import React from 'react';
import { CalculatorState } from '../../types';
import { PredefinedRubricId, toPositiveNumber } from './dynamicPayrollForm.helpers';

interface SimplePresetFieldsProps {
    presetId: PredefinedRubricId;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    isNovoAQ: boolean;
}

export const SimplePresetFields: React.FC<SimplePresetFieldsProps> = ({
    presetId,
    state,
    update,
    styles,
    isNovoAQ
}) => {
    if (presetId === 'aq') {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isNovoAQ ? (
                        <>
                            <div>
                                <label className={styles.label}>Titulos (VR)</label>
                                <select className={styles.input} value={state.aqTituloVR} onChange={e => update('aqTituloVR', Number(e.target.value))}>
                                    <option value={0}>Nenhum</option>
                                    <option value={1.0}>Especializacao (1.0x VR)</option>
                                    <option value={2.0}>2x Especializacao (2.0x VR)</option>
                                    <option value={3.5}>Mestrado (3.5x VR)</option>
                                    <option value={5.0}>Doutorado (5.0x VR)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Treinamento (VR)</label>
                                <select className={styles.input} value={state.aqTreinoVR} onChange={e => update('aqTreinoVR', Number(e.target.value))}>
                                    <option value={0}>Nenhum</option>
                                    <option value={0.2}>120h (0.2x VR)</option>
                                    <option value={0.4}>240h (0.4x VR)</option>
                                    <option value={0.6}>360h (0.6x VR)</option>
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className={styles.label}>Titulos (%)</label>
                                <select className={styles.input} value={state.aqTituloPerc} onChange={e => update('aqTituloPerc', Number(e.target.value))}>
                                    <option value={0}>0%</option>
                                    <option value={0.05}>5% (Graduacao)</option>
                                    <option value={0.075}>7.5% (Especializacao)</option>
                                    <option value={0.1}>10% (Mestrado)</option>
                                    <option value={0.125}>12.5% (Doutorado)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Treinamento (%)</label>
                                <select className={styles.input} value={state.aqTreinoPerc} onChange={e => update('aqTreinoPerc', Number(e.target.value))}>
                                    <option value={0}>0%</option>
                                    <option value={0.01}>1% (120h)</option>
                                    <option value={0.02}>2% (240h)</option>
                                    <option value={0.03}>3% (360h)</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (presetId === 'gratificacao') {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={styles.label}>Tipo</label>
                        <select className={styles.input} value={state.gratEspecificaTipo} onChange={e => update('gratEspecificaTipo', e.target.value)}>
                            <option value="0">Nenhuma</option>
                            <option value="gae">GAE (35%)</option>
                            <option value="gas">GAS (35%)</option>
                        </select>
                    </div>
                    <label className={`${styles.checkboxLabel} md:mt-8`}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={state.incidirPSSGrat}
                            onChange={e => update('incidirPSSGrat', e.target.checked)}
                        />
                        <span>Incluir na base do PSS</span>
                    </label>
                </div>
            </div>
        );
    }

    if (presetId === 'vantagens') {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>VPNI (Lei)</label>
                        <input type="number" className={styles.input} value={state.vpni_lei} onChange={e => update('vpni_lei', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label className={styles.label}>VPNI (Decisao)</label>
                        <input type="number" className={styles.input} value={state.vpni_decisao} onChange={e => update('vpni_decisao', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label className={styles.label}>ATS</label>
                        <input type="number" className={styles.input} value={state.ats} onChange={e => update('ats', toPositiveNumber(e.target.value))} />
                    </div>
                </div>
            </div>
        );
    }

    if (presetId === 'abono') {
        return (
            <div className="space-y-3">
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox} checked={state.recebeAbono} onChange={e => update('recebeAbono', e.target.checked)} />
                    <span>Recebe abono de permanencia</span>
                </label>
            </div>
        );
    }

    if (presetId === 'pre_escolar') {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={styles.label}>Qtd. dependentes</label>
                        <input type="number" className={styles.input} value={state.auxPreEscolarQtd} onChange={e => update('auxPreEscolarQtd', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label className={styles.label}>Cota pre-escolar</label>
                        <input type="number" className={styles.input} value={state.cotaPreEscolar} onChange={e => update('cotaPreEscolar', toPositiveNumber(e.target.value))} />
                    </div>
                </div>
            </div>
        );
    }

    if (presetId === 'aux_transporte') {
        return (
            <div className="space-y-3">
                <div>
                    <label className={styles.label}>Gasto mensal de transporte</label>
                    <input type="number" className={styles.input} value={state.auxTransporteGasto} onChange={e => update('auxTransporteGasto', toPositiveNumber(e.target.value))} />
                </div>
            </div>
        );
    }

    return null;
};
