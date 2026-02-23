import React, { useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';

interface GlobalSettingsProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    courtConfig: CourtConfig;
    styles: any;
}

const getMonthLabel = (monthIndex: number) =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long' })
        .format(new Date(2024, monthIndex, 1))
        .toUpperCase();

export const GlobalSettings: React.FC<GlobalSettingsProps> = ({ state, update, courtConfig, styles }) => {
    const compactInput = `${styles.input} py-2 px-3 text-body`;
    const compactLabel = 'block text-label font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1';
    const schedules = [...(courtConfig.adjustment_schedule || [])].sort((a, b) => a.period - b.period);
    const periodOptions = schedules.length > 0
        ? schedules
        : [{ period: state.periodo, percentage: 0, label: `Periodo ${state.periodo}` }];

    const monthOptions = Array.from({ length: 12 }, (_, idx) => getMonthLabel(idx));
    const autoInitRef = useRef(false);

    useEffect(() => {
        if (autoInitRef.current) return;
        if (!schedules.length) return;

        const now = new Date();
        const nowTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const withDate = schedules
            .filter((entry) => !!entry.date)
            .map((entry) => ({
                ...entry,
                timestamp: new Date(`${entry.date}T12:00:00`).getTime(),
            }))
            .filter((entry) => Number.isFinite(entry.timestamp))
            .sort((a, b) => a.timestamp - b.timestamp);

        if (withDate.length > 0) {
            const current = withDate
                .filter((entry) => entry.timestamp <= nowTime)
                .pop();

            if (current && current.period !== state.periodo) {
                update('periodo', current.period);
            }
        }

        autoInitRef.current = true;
    }, [schedules, state.periodo, update]);

    return (
        <div className="mb-6 relative overflow-hidden bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 px-6 py-5 shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-8 -mt-8 blur-xl"></div>
            <h3 className={styles.sectionTitle}>
                <Settings className="w-4 h-4" />
                Configuracoes Globais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div>
                    <label className={compactLabel}>Ref. Salarial</label>
                    <select
                        className={compactInput}
                        value={state.periodo}
                        onChange={(e) => update('periodo', Number(e.target.value))}
                    >
                        {periodOptions.map((entry) => (
                            <option key={entry.period} value={entry.period}>
                                {entry.label || `Periodo ${entry.period} (${(entry.percentage * 100).toFixed(2)}%)`}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={compactLabel}>Mes de Referencia (PDF)</label>
                    <div className="flex gap-2">
                        <select
                            className={compactInput}
                            value={state.mesRef}
                            onChange={e => update('mesRef', e.target.value)}
                        >
                            {monthOptions.map(mes => (
                                <option key={mes}>{mes}</option>
                            ))}
                        </select>

                        <input
                            type="number"
                            className={`${compactInput} w-24`}
                            value={state.anoRef}
                            onChange={e => update('anoRef', Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
