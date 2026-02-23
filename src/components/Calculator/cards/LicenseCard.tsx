import React from 'react';
import { Briefcase } from 'lucide-react';
import { CalculatorState } from '../../../types';

interface LicenseCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const LicenseCard: React.FC<LicenseCardProps> = ({ state, update, styles }) => {
    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Briefcase className="w-4 h-4" /> Licença Compensatória
            </h3>

            <div className={styles.innerBox}>
                <div className="space-y-4">
                    <div>
                        <label className={styles.label}>Qtd. Dias a indenizar</label>
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
                        Incluir abono na base?
                    </label>
                </div>
            </div>
        </div>
    );
};
