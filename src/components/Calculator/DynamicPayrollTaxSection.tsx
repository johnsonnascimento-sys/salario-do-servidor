import React from 'react';
import { CalculatorState, CourtConfig } from '../../types';
import { toDecimalRateFromPercentInput, toPercentLabel, toPositiveNumber } from './dynamicPayrollForm.helpers';

interface DynamicPayrollTaxSectionProps {
    styles: Record<string, string>;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    handleRegimePrevChange: (value: string) => void;
    showFunprespSection: boolean;
    previdenciaComplementar: CourtConfig['previdenciaComplementar'];
    funprespNormalOptions: number[];
    handleFunprespParticipacaoChange: (value: 'nao' | 'patrocinado') => void;
    funprespValidationError?: string;
}

export const DynamicPayrollTaxSection: React.FC<DynamicPayrollTaxSectionProps> = ({
    styles,
    state,
    update,
    handleRegimePrevChange,
    showFunprespSection,
    previdenciaComplementar,
    funprespNormalOptions,
    handleFunprespParticipacaoChange,
    funprespValidationError
}) => (
    <div className={styles.innerBox}>
        <h4 className={styles.innerBoxTitle}>Configuracoes tributarias</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className={styles.label}>Regime previdenciario</label>
                <select className={styles.input} value={state.regimePrev} onChange={e => handleRegimePrevChange(e.target.value)}>
                    <option value="antigo">RPPS - sem teto</option>
                    <option value="novo_antigo">RPPS - novo sem migracao</option>
                    <option value="migrado">RPPS migrado (com teto)</option>
                    <option value="rpc">RPC (com teto)</option>
                </select>
            </div>
            <div>
                <label className={styles.label}>Dependentes (IR)</label>
                <input type="number" className={styles.input} value={state.dependentes} onChange={e => update('dependentes', toPositiveNumber(e.target.value))} />
            </div>
            <div className="flex flex-col justify-end gap-3">
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox} checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} />
                    <span>PSS sobre FC/CJ</span>
                </label>
            </div>
        </div>

        {showFunprespSection && previdenciaComplementar && (
            <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
                <h5 className="text-label font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-300">
                    Previdencia Complementar (Funpresp)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Participa Funpresp</label>
                        <select
                            className={styles.input}
                            value={state.funprespParticipacao}
                            onChange={e => handleFunprespParticipacaoChange(e.target.value as 'nao' | 'patrocinado')}
                        >
                            <option value="nao">Nao</option>
                            <option value="patrocinado">Sim (Patrocinado)</option>
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Contribuicao normal patrocinada</label>
                        <select
                            className={styles.input}
                            value={state.funprespAliq}
                            onChange={e => update('funprespAliq', Number(e.target.value))}
                            disabled={state.funprespParticipacao !== 'patrocinado'}
                        >
                            {funprespNormalOptions.map(rate => (
                                <option key={rate} value={rate}>{toPercentLabel(rate)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Contribuicao facultativa (%)</label>
                        <input
                            type="number"
                            className={styles.input}
                            min={0}
                            max={previdenciaComplementar.facultativeRate.max * 100}
                            step={previdenciaComplementar.facultativeRate.step * 100}
                            value={Number((state.funprespFacul * 100).toFixed(1))}
                            onChange={e => update('funprespFacul', toDecimalRateFromPercentInput(e.target.value))}
                            disabled={state.funprespParticipacao !== 'patrocinado'}
                        />
                    </div>
                </div>
                {funprespValidationError && (
                    <p className="text-body-xs text-error-600 dark:text-error-400">{funprespValidationError}</p>
                )}
            </div>
        )}
    </div>
);
