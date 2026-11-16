import React from 'react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { PresetGrossSummary } from './PresetGrossSummary';

interface DynamicPayrollBaseSectionProps {
    styles: Record<string, string>;
    state: CalculatorState;
    cargoOptions: string[];
    padroes: string[];
    salaryByCargo: Record<string, number>;
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
    salaryByCargo,
    functionKeys,
    functionValues,
    cargoLabels,
    noFunctionCode,
    noFunctionLabel,
    baseVencimento,
    gaj,
    handleCargoChange,
    update
}) => {
    const fieldId = React.useId();
    return (
        <div className={styles.card}>
            <h4 className={styles.innerBoxTitle}>Dados principais</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor={`${fieldId}-cargo`} className={styles.label}>Cargo</label>
                    <select id={`${fieldId}-cargo`} className={styles.input} value={state.cargo} onChange={e => handleCargoChange(e.target.value)}>
                        {cargoOptions.map(cargo => (
                            <option key={cargo} value={cargo}>
                                {cargoLabels?.[cargo] || cargo.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${fieldId}-padrao`} className={styles.label}>Classe/Padrão</label>
                    <select id={`${fieldId}-padrao`} className={styles.input} value={state.padrao} onChange={e => update('padrao', e.target.value)}>
                        {padroes.map(padrao => (
                            <option key={padrao} value={padrao}>{padrao} - {formatCurrency(salaryByCargo[padrao])}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor={`${fieldId}-funcao`} className={styles.label}>Função (FC/CJ)</label>
                    <select id={`${fieldId}-funcao`} className={styles.input} value={state.funcao} onChange={e => update('funcao', e.target.value)}>
                        {noFunctionCode && <option value={noFunctionCode}>{noFunctionLabel}</option>}
                        {functionKeys.map(funcao => (
                            <option key={funcao} value={funcao}>
                                {funcao.toUpperCase()} - {formatCurrency(functionValues[funcao])}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-2">
                <PresetGrossSummary compact lines={[
                    { label: 'Salário Base', value: baseVencimento },
                    { label: 'Gratificação de Atividade Judiciária (GAJ)', value: gaj },
                    { label: 'Auxílio Alimentação', value: state.auxAlimentacao || 0 }
                ]} />
            </div>
        </div>
    );
};
