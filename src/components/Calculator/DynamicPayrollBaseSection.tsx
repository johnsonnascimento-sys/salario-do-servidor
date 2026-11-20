import React from 'react';
import { CalculatorState } from '../../types';
import type { PayslipResultRow } from '../../types/user';
import { formatCurrency } from '../../utils/calculations';
import { getBasicPayTaxDetails } from '../../utils/payslipRows';
import { PresetGrossSummary } from './PresetGrossSummary';
import { calculatorTargetClass } from './hooks/useCalculatorTargetFocus';

interface DynamicPayrollBaseSectionProps {
    styles: Record<string, string>;
    state: CalculatorState;
    resultRows: PayslipResultRow[];
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
    calculationReady: boolean;
    handleCargoChange: (cargo: CalculatorState['cargo']) => void;
    update: (field: keyof CalculatorState, value: any) => void;
}

export const DynamicPayrollBaseSection: React.FC<DynamicPayrollBaseSectionProps> = ({
    styles,
    state,
    resultRows,
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
    calculationReady,
    handleCargoChange,
    update
}) => {
    const fieldId = React.useId();
    const discountLines = calculationReady
        ? getBasicPayTaxDetails(resultRows, state).flatMap(({ label, ir, pss }) => [
            { label: `Desconto IR (${label})`, value: ir, isDiscount: true },
            { label: `Desconto PSS (${label})`, value: pss, isDiscount: true },
        ])
        : [];
    return (
        <section id="dados-principais" tabIndex={-1} aria-labelledby={`${fieldId}-titulo`} className={`${styles.formSection} ${calculatorTargetClass}`}>
            <h4 id={`${fieldId}-titulo`} className={styles.innerBoxTitle}>Dados principais</h4>
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
                    { label: 'Função (FC/CJ)', value: calculationReady ? state.funcaoValor || 0 : 0 },
                    { label: 'Auxílio Alimentação', value: state.auxAlimentacao || 0 },
                    ...discountLines
                ]} />
            </div>
        </section>
    );
};
