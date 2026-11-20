import React from 'react';
import { CalculatorState } from '../../types';
import type { PayslipResultRow } from '../../types/user';
import { formatCurrency } from '../../utils/calculations';
import { getBasicPayTaxDetails } from '../../utils/payslipRows';
import { CalculatorCardHeading } from './CalculatorCardHeading';
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
            <CalculatorCardHeading help={{ label: 'Explicação sobre cargos, remuneração e PSS sobre FC/CJ', content: <>
                <p>A Lei nº 11.416/2006 define as carreiras de Analista Judiciário, Técnico Judiciário e Auxiliar Judiciário (art. 2º) e sua estrutura de classes e padrões (art. 3º e Anexo I). O Anexo II traz os vencimentos básicos, e o art. 13 rege a GAJ. Os níveis de FC/CJ estão no art. 5º, com valores nos Anexos III (CJ) e IV (FC). A simulação usa as tabelas da competência selecionada.</p>
                <p>Marque a opção abaixo de FC/CJ se a parcela integrar a base do PSS mensal no seu contracheque, ou se você quiser simular essa inclusão.</p>
                <p>A contribuição à Funpresp-Jud tem uma configuração separada. Se você optou por incluir a FC/CJ na base do plano, confira essa opção em Previdência e abono → Funpresp-Jud → Opções adicionais da Funpresp.</p>
                <p><a className="underline" href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm" target="_blank" rel="noreferrer">Lei nº 11.416/2006, texto atualizado</a></p>
            </>}}>
                <h4 id={`${fieldId}-titulo`} className={styles.innerBoxTitle}>Dados principais</h4>
            </CalculatorCardHeading>
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
                    <label className={`${styles.checkboxLabel} mt-2`}>
                        <input id={`${fieldId}-pssSobreFC`} type="checkbox" className={`${styles.checkbox} shrink-0`}
                            checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} />
                        <span>Incluir função comissionada ou cargo em comissão no cálculo da contribuição previdenciária (PSS)</span>
                    </label>
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
