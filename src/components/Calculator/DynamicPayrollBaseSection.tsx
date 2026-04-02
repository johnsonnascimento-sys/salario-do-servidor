import React from 'react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface DynamicPayrollBaseSectionProps {
    styles: Record<string, string>;
    state: CalculatorState;
    cargoOptions: string[];
    padroes: string[];
    functionKeys: string[];
    functionValues: Record<string, number>;
    cargoLabels?: Record<string, string>;
    noFunctionCode: string;
    noFunctionLabel: string;
    baseVencimento: number;
    gaj: number;
    handleCargoChange: (cargo: CalculatorState['cargo']) => void;
    update: (field: keyof CalculatorState, value: any) => void;
}

export const DynamicPayrollBaseSection: React.FC<DynamicPayrollBaseSectionProps> = ({
    styles,
    state,
    cargoOptions,
    padroes,
    functionKeys,
    functionValues,
    cargoLabels,
    noFunctionCode,
    noFunctionLabel,
    baseVencimento,
    gaj,
    handleCargoChange,
    update
}) => (
    <div className={styles.innerBox}>
        <h4 className={styles.innerBoxTitle}>Base obrigatoria</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className={styles.label}>Cargo</label>
                <select className={styles.input} value={state.cargo} onChange={e => handleCargoChange(e.target.value)}>
                    {cargoOptions.map(cargo => (
                        <option key={cargo} value={cargo}>
                            {cargoLabels?.[cargo] || cargo.toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className={styles.label}>Classe/Padrao</label>
                <select className={styles.input} value={state.padrao} onChange={e => update('padrao', e.target.value)}>
                    {padroes.map(padrao => (
                        <option key={padrao} value={padrao}>{padrao}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className={styles.label}>Funcao (FC/CJ)</label>
                <select className={styles.input} value={state.funcao} onChange={e => update('funcao', e.target.value)}>
                    {noFunctionCode && <option value={noFunctionCode}>{noFunctionLabel}</option>}
                    {functionKeys.map(funcao => (
                        <option key={funcao} value={funcao}>
                            {funcao.toUpperCase()} - {formatCurrency(functionValues[funcao])}
                        </option>
                    ))}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                <p className={styles.label}>Salario Base</p>
                <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(baseVencimento)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">GAJ (140%)</p>
                <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(gaj)}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">Auxilio Alimentacao</p>
                <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(state.auxAlimentacao || 0)}</p>
            </div>
        </div>
    </div>
);
