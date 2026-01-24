
import React from 'react';
import { Settings } from 'lucide-react';
import { CalculatorState } from '../../types';

interface GlobalSettingsProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ state, update, styles }) => {
    return (
        <div className={`${styles.card} mb-8 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <h3 className={styles.sectionTitle}>
                <Settings className="w-4 h-4" />
                Configurações Globais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div>
                    <label className={styles.label}>Ref. Salarial</label>
                    <select
                        className={styles.input}
                        value={state.periodo}
                        onChange={(e) => update('periodo', Number(e.target.value))}
                    >
                        <option value={0}>Fev/2025 a Dez/2025 (Atual)</option>
                        <option value={1}>Jan/2026 a Jun/2026 (Novo AQ)</option>
                        <option value={2}>Jul/2026 a Jun/2027 (+8%)</option>
                        <option value={3}>Jul/2027 a Jun/2028 (+8% Acum.)</option>
                        <option value={4}>Jul/2028 em diante (+8% Acum.)</option>
                    </select>
                </div>
                <div>
                    <label className={styles.label}>Mês de Referência (PDF)</label>
                    <div className="flex gap-2">
                        <select
                            className={styles.input}
                            value={state.mesRef}
                            onChange={e => update('mesRef', e.target.value)}
                        >
                            {[
                                "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
                                "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
                            ].map(m => (
                                <option key={m}>{m}</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            className={`${styles.input} w-24`}
                            value={state.anoRef}
                            onChange={e => update('anoRef', Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
