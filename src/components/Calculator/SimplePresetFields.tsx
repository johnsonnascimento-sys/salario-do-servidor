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
    const fieldId = React.useId();
    if (presetId === 'aq') {
        const groups = isNovoAQ ? [
            { label: 'Títulos (VR)', field: 'aqTituloVR' as const, options: [[0, 'Nenhum'], [1, 'Especialização (1,0x VR)'], [2, '2 especializações (2,0x VR)'], [3.5, 'Mestrado (3,5x VR)'], [5, 'Doutorado (5,0x VR)']] as const },
            { label: 'Treinamento (VR)', field: 'aqTreinoVR' as const, options: [[0, 'Nenhum'], [0.2, '120h (0,2x VR)'], [0.4, '240h (0,4x VR)'], [0.6, '360h (0,6x VR)']] as const }
        ] : [
            { label: 'Títulos (%)', field: 'aqTituloPerc' as const, options: [[0, 'Nenhum'], [0.05, 'Graduação (5%)'], [0.075, 'Especialização (7,5%)'], [0.1, 'Mestrado (10%)'], [0.125, 'Doutorado (12,5%)']] as const },
            { label: 'Treinamento (%)', field: 'aqTreinoPerc' as const, options: [[0, 'Nenhum'], [0.01, '120h (1%)'], [0.02, '240h (2%)'], [0.03, '360h (3%)']] as const }
        ];
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {groups.map(group => (
                    <div key={group.field}>
                        <label htmlFor={`${fieldId}-${group.field}`} className={styles.label}>{group.label}</label>
                        <select id={`${fieldId}-${group.field}`} className={styles.input} value={state[group.field]} onChange={e => update(group.field, Number(e.target.value))}>
                            {group.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                ))}
            </div>
        );
    }

    if (presetId === 'gratificacao') {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor={`${fieldId}-field-5`} className={styles.label}>Tipo</label>
                        <select id={`${fieldId}-field-5`} className={styles.input} value={state.gratEspecificaTipo} onChange={e => update('gratEspecificaTipo', e.target.value)}>
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
                        <label htmlFor={`${fieldId}-field-6`} className={styles.label}>VPNI (Lei)</label>
                        <input id={`${fieldId}-field-6`} type="number" className={styles.input} value={state.vpni_lei} onChange={e => update('vpni_lei', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label htmlFor={`${fieldId}-field-7`} className={styles.label}>VPNI (Decisao)</label>
                        <input id={`${fieldId}-field-7`} type="number" className={styles.input} value={state.vpni_decisao} onChange={e => update('vpni_decisao', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label htmlFor={`${fieldId}-field-8`} className={styles.label}>ATS</label>
                        <input id={`${fieldId}-field-8`} type="number" className={styles.input} value={state.ats} onChange={e => update('ats', toPositiveNumber(e.target.value))} />
                    </div>
                </div>
            </div>
        );
    }

    if (presetId === 'abono') {
        return (
            <div className="space-y-3">
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={state.recebeAbono}
                        onChange={e => {
                            update('recebeAbono', e.target.checked);
                            if (e.target.checked) {
                                update('gaactaIncideAbono', true);
                                update('decimoIncideAbono', true);
                                update('feriasIncideAbono', true);
                            }
                        }}
                    />
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
                        <label htmlFor={`${fieldId}-field-9`} className={styles.label}>Qtd. dependentes</label>
                        <input id={`${fieldId}-field-9`} type="number" className={styles.input} value={state.auxPreEscolarQtd} onChange={e => update('auxPreEscolarQtd', toPositiveNumber(e.target.value))} />
                    </div>
                    <div>
                        <label htmlFor={`${fieldId}-field-10`} className={styles.label}>Cota pre-escolar</label>
                        <input id={`${fieldId}-field-10`} type="number" className={styles.input} value={state.cotaPreEscolar} onChange={e => update('cotaPreEscolar', toPositiveNumber(e.target.value))} />
                    </div>
                </div>
            </div>
        );
    }

    if (presetId === 'aux_transporte') {
        return (
            <div className="space-y-3">
                <div>
                    <label htmlFor={`${fieldId}-field-11`} className={styles.label}>Gasto mensal de transporte</label>
                    <input id={`${fieldId}-field-11`} type="number" className={styles.input} value={state.auxTransporteGasto} onChange={e => update('auxTransporteGasto', toPositiveNumber(e.target.value))} />
                </div>
            </div>
        );
    }

    return null;
};
