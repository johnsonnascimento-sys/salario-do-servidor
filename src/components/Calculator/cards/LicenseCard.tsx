import React from 'react';
import { CalculatorState } from '../../../types';

interface LicenseCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
}

export const LicenseCard: React.FC<LicenseCardProps> = ({ state, update, styles }) => {
    return (
        <div className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-body-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Norma JMU:</span> Resolução STM nº 376, de 06/08/2025 —{' '}
                <strong className="text-red-600 dark:text-red-400">Revogada expressamente pela Resolução STM nº 397, de 19/06/2026</strong>.
            </div>
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>Qtd. Dias a indenizar</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            className={styles.input}
                            value={state.licencaDias || ''}
                            onChange={e => {
                                const val = e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value) || 0));
                                update('licencaDias', val);
                            }}
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
                        <span>Incluir abono na base?</span>
                    </label>
                </div>
            </div>
        </div>
    );
};
