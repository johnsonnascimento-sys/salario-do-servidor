import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig } from '../src/types';
import { IrEaCompetencias } from '../src/components/Calculator/IrEaCompetencias';
import { IrEaContextSection } from '../src/components/Calculator/IrEaContextSection';
import { ManualRubricasSection } from '../src/components/Calculator/ManualRubricasSection';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { groupPayslipRowsForDisplay } from '../src/utils/payslipRows';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';

const styles = {};
let months: string[] = [];
let context = {};
let tree = create(React.createElement(IrEaCompetencias, { value: [], onChange: value => { months = value; }, styles }));
act(() => tree.root.findAllByType('button')[0].props.onClick());
assert.deepEqual(months, [''], 'Add a blank original month without guessing the payment month');
tree.update(React.createElement(IrEaCompetencias, { value: months, onChange: value => { months = value; }, styles }));
act(() => tree.root.findByType('input').props.onChange({ target: { value: '2024-01' } }));
assert.deepEqual(months, ['2024-01']);
tree.unmount();
tree = create(React.createElement(IrEaContextSection, { value: { mesPagamento: '2026-10' }, mesFolha: '2027-01', onChange: value => { context = value; }, styles }));
const contextInputs = tree.root.findAllByType('input');
assert.equal(contextInputs[0].props.value, '2027-01', 'Payment display follows the payroll header, ignoring stale saved context');
assert.equal(contextInputs[0].props.readOnly, true, 'Payment is collected once, in the header');
tree.update(React.createElement(IrEaContextSection, { value: { mesPagamento: '2026-10' }, mesFolha: '2027-02', onChange: value => { context = value; }, styles }));
assert.equal(tree.root.findAllByType('input')[0].props.value, '2027-02');
tree.unmount();

tree = create(React.createElement(IrEaContextSection, { value: { mesPagamento: '2027-01' }, mesFolha: '2027-01', dependentes: 2, deducaoDependente: 189.59, onChange: value => { context = value; }, styles }));
assert.ok(JSON.stringify(tree.toJSON()).includes('Deduzir dependentes na base do IR-EA'));
assert.ok(JSON.stringify(tree.toJSON()).includes('379,18'));
const depCheckbox = tree.root.findAllByType('input').find(input => input.props.type === 'checkbox');
assert.ok(depCheckbox, 'Checkbox de dependentes presente quando dependentes > 0');
assert.equal(depCheckbox.props.checked, true);
act(() => depCheckbox.props.onChange({ target: { checked: false } }));
assert.equal(context.deduzirDependentes, false);
tree.unmount();

const state: CalculatorState = { ...INITIAL_STATE,
    irEaContext: { mesPagamento: '2026-11', mesesRraInformados: 2.5, referenciaMeses: 'Demonstrativo 123', ajustesBaseDocumentados: [{ valor: 100, descricao: 'Dedução', fundamento: 'Documento 123' }] },
    overtimeEntries: [{ id: 'h', qtd50: 99999, qtd100: 0, isEA: true, excluirIR: false, competenciasEA: ['2024-01'] }],
    substitutionEntries: [{ id: 's', dias: {}, isEA: true, pssIsEA: false, competenciasEA: ['2024-02'], valorBrutoManual: 5000 }],
    rubricasExtras: [{ id: 'r', tipo: 'C', descricao: 'Crédito manual EA', valor: 2000, isEA: true, incideIR: false, incidePSS: false, pssCompetenciaSeparada: false, competenciasEA: ['2024-01'] }],
    overtimeCalculatedEntries: [{ id: 'h', heVal50: 600, heVal100: 400, heTotal: 1000, isEA: true, excluirIR: false }],
    substitutionCalculatedEntries: [{ id: 's', total: 5000, isEA: true, excluirIR: false, pssIsEA: false }],
    irEaEntryTax: { 'he:h': 12.34, 'subst:s': 56.78, 'rubrica:r': 90.12 }, irEA: 159.24,
    rubricasTax: { r: { ir: 90.12, pss: 0, funpresp: 0, liquido: 1909.88 } },
};
const restored = hydrateCalculatorState(stripCalculatedFieldsFromCalculatorState(state));
assert.deepEqual(restored.irEaContext, state.irEaContext);
assert.deepEqual(restored.overtimeEntries[0].competenciasEA, ['2024-01']);
assert.equal(restored.substitutionEntries[0].valorBrutoManual, 5000);
assert.equal(restored.rubricasExtras[0].incideIR, false);
assert.deepEqual(restored.irEaEntryTax, {}, 'Persist inputs without calculated snapshots');
const common = { state, courtConfig: {} as CourtConfig, currentTables: { funcoes: {} }, isNovoAQ: true, noFunctionCode: '', currentFunctionValue: 0, gratificacaoEspecificaCalculada: 0 };
const heLines = buildPresetGrossLines({ ...common, instance: { key: 'h', presetId: 'hora_extra', overtimeEntryId: 'h' } });
assert.equal(heLines.find(row => row.label === 'Total hora extra Bruto')?.value, 1000, 'Gross comes from official entries');
assert.equal(heLines.find(row => row.label.startsWith('Desconto IR-EA'))?.value, 12.34, 'Use official per-entry allocation without a new rateio');
const imported = hydrateCalculatorState({ ...state, overtimeEntries: [{ ...state.overtimeEntries[0], qtd50: 0, valorBrutoManual: 9291.22 }] });
imported.overtimeCalculatedEntries = [{ ...state.overtimeCalculatedEntries![0], heVal50: 0, heVal100: 0, heTotal: 9291.22 }];
const importedLines = buildPresetGrossLines({ ...common, state: imported, instance: { key: 'h', presetId: 'hora_extra', overtimeEntryId: 'h' } });
assert.equal(importedLines.find(row => row.label === 'Valor bruto manual/importado')?.value, 9291.22);
assert.equal(importedLines.some(row => row.label.includes('50%') || row.label.includes('100%')), false, 'Imported amount does not invent a split by hours');
assert.equal(importedLines.find(row => row.label === 'Total hora extra Líquido')?.value, 9278.88);
const substLines = buildPresetGrossLines({ ...common, instance: { key: 's', presetId: 'substituicao', substitutionEntryId: 's' } });
assert.equal(substLines.find(row => row.label === 'Total substituição Bruto')?.value, 5000, 'Explicit EA gross stays in the summary');
assert.equal(substLines.find(row => row.label.startsWith('Desconto IR-EA'))?.value, 56.78);
const grouped = groupPayslipRowsForDisplay([{ label: 'IMPOSTO DE RENDA-EA (MANUAL)', value: 159.24, type: 'D' as const }], state);
assert.equal(grouped[0].details?.find(row => row.label === 'CRÉDITO MANUAL EA')?.value, 90.12, 'Manual EA with incideIR=false remains visible');
tree = create(React.createElement(ManualRubricasSection, { rubricas: state.rubricasExtras, rubricasTax: state.rubricasTax, irEaEntryTax: state.irEaEntryTax, styles, totalCreditos: 2000, totalDescontos: 0, addRubrica() {}, removeRubrica() {}, updateRubrica() {}, toPositiveNumber: Number }));
assert.ok(JSON.stringify(tree.toJSON()).includes('Desconto IR-EA (Crédito manual EA)'));
tree.unmount();
const currentYearState = { ...state, irEaCurrentYearKeys: ['rubrica:r'], irEaEntryTax: {}, rubricasTax: { r: { ir: 42, irMarginal: 55, pss: 0, funpresp: 0, liquido: 1958 } } };
tree = create(React.createElement(ManualRubricasSection, { rubricas: currentYearState.rubricasExtras, rubricasTax: currentYearState.rubricasTax, irEaEntryTax: currentYearState.irEaEntryTax, irEaCurrentYearKeys: currentYearState.irEaCurrentYearKeys, styles, totalCreditos: 2000, totalDescontos: 0, addRubrica() {}, removeRubrica() {}, updateRubrica() {}, toPositiveNumber: Number }));
assert.ok(JSON.stringify(tree.toJSON()).includes('Desconto IR (Crédito manual EA)'), 'Current-year EA follows the official monthly classification');
assert.ok(JSON.stringify(tree.toJSON()).includes('Acréscimo efetivo no IR da folha (Crédito manual EA)'), 'Identifies monthly marginal IR impact');
assert.ok(!JSON.stringify(tree.toJSON()).includes('Desconto IR-EA (Crédito manual EA)'));
tree.unmount();
const pendingState = { ...state, rubricasTax: {} };
tree = create(React.createElement(ManualRubricasSection, { rubricas: pendingState.rubricasExtras, rubricasTax: pendingState.rubricasTax, styles, totalCreditos: 2000, totalDescontos: 0, addRubrica() {}, removeRubrica() {}, updateRubrica() {}, toPositiveNumber: Number }));
assert.ok(!JSON.stringify(tree.toJSON()).includes('Resumo calculado'), 'Pending EA cannot display gross as a calculated net');
tree.unmount();

// Exercise invalidation and errors through the real hook, preserving the existing eligibility preflight.
const config = { bases: { salario: { teste: { A1: 6000 } }, funcoes: {} }, values: {}, historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } }, payrollRules: { gajRate: .5 }, careerCatalog: { noFunctionCode: '0' } } as unknown as CourtConfig;
let input = { ...state, cargo: 'teste', padrao: 'A1', funcao: '0', tabelaPSS: 'teste' };
let calls = 0;
let fail = false;
const engine = { async calculateTotal() { calls++; if (fail) throw new Error('IR-EA: informe as competências originais'); return { netSalary: 100, totalDeductions: 0, breakdown: { vencimento: 100, overtimeCalculatedEntries: state.overtimeCalculatedEntries, substitutionCalculatedEntries: state.substitutionCalculatedEntries, irEaEntryTax: state.irEaEntryTax } }; } };
const agency = { slug: 'jmu', name: 'JMU', type: 'judiciary' };
let latest: ReturnType<typeof useCalculatorResults>;
function Probe() { latest = useCalculatorResults(input, engine as any, config, agency); return null; }
await act(async () => { tree = create(React.createElement(Probe)); });
assert.equal(latest!.calculationStatus, 'ready');
assert.equal(latest!.resultRows.find(row => row.label === 'SUBSTITUIÇÃO DE FUNÇÃO (IR EA)')?.value, 5000);
input = { ...input, irEaContext: { ...input.irEaContext, mesPagamento: '2026-12' } };
await act(async () => { tree.update(React.createElement(Probe)); });
assert.equal(calls, 2, 'Changing EA context recalculates');
fail = true;
input = { ...input, overtimeEntries: input.overtimeEntries.map(entry => ({ ...entry, competenciasEA: [] })) };
await act(async () => { tree.update(React.createElement(Probe)); });
assert.equal(latest!.calculationStatus, 'error');
assert.equal(latest!.calculatedState.liquido, 0);
assert.deepEqual(latest!.resultRows, []);
assert.ok(latest!.calculationError?.includes('IR-EA'));
tree.unmount();
console.log('IR-EA UI: inputs, original months, reload, official gross/tax allocation, manual EA, invalidation and errors passed.');
