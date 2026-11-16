import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { INITIAL_STATE } from '../src/types';
import type { CalculatorState } from '../src/types';
import type { PayslipResultRow } from '../src/types/user';
import { thirteenthPaymentRows } from '../src/utils/thirteenthPresentation';
import { getPayrollPresentation } from '../src/utils/payrollPresentation';
import { groupPayslipRowsForDisplay } from '../src/utils/payslipRows';
import { ResultsSummary } from '../src/components/Calculator/ResultsSummary';

const state: CalculatorState = { ...INITIAL_STATE, pss13: 900, ir13: 400,
    thirteenthMemory: { version: 1, firstSelected: true, secondSelected: true,
        firstMode: 'informado', secondMode: 'automatico', components: [], groups: [],
        referenceTotal: 10000, cargoTotal: 9000, functionTotal: 1000,
        advances: [{ id: 'a', target: 'cargo', description: 'Cargo efetivo', amount: 4500 },
            { id: 'b', target: 'funcao', description: 'FC/CJ', amount: 500 }],
        secondEntries: [{ id: 'c', target: 'cargo', description: 'Cargo efetivo', amount: 4500 },
            { id: 'd', target: 'funcao', description: 'FC/CJ', amount: 500 }],
        firstTotal: 5000, secondTotal: 5000 } };
const extraRows: PayslipResultRow[] = [
    { label: 'ABONO DE PERMANENCIA-GN (13o) EC 41/2003 ATIVO EC', value: 900, type: 'C' },
    { label: 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC', value: 900, type: 'D' },
    { label: 'IMPOSTO DE RENDA-GN(13º) EC', value: 400, type: 'D' },
];

test('13th display reconciles credits and advance debits once, retaining taxes and abono separately', () => {
    const rows = [...thirteenthPaymentRows(state), ...extraRows];
    const before = JSON.stringify(rows);
    const result = getPayrollPresentation(state, rows);
    const credit = result.payrollRows.find(row => row.label === 'GRATIFICAÇÃO NATALINA (13º SALÁRIO)')!;
    const debit = result.payrollRows.find(row => row.label === 'ABATIMENTO DO ADIANTAMENTO DO 13º')!;
    assert.equal(credit.value, 10000);
    assert.equal(credit.details?.length, 4);
    assert.equal(debit.value, 5000);
    assert.equal(debit.details?.length, 2);
    assert.equal(result.payrollCredits, 10900);
    assert.equal(result.payrollDebits, 6300);
    assert.equal(result.payrollNet, 4600);
    assert.ok(result.payrollRows.filter(row => row.type === 'D').every((row, _i, debits) =>
        result.payrollRows.indexOf(row) >= result.payrollRows.length - debits.length));
    for (const row of extraRows) assert.ok(result.payrollRows.some(item => item.label === row.label && item.value === row.value));
    assert.equal(JSON.stringify(rows), before);
    assert.deepEqual(getPayrollPresentation(state, JSON.parse(before)), result);
});

test('first-only and one-entry payments keep detail available without an advance debit', () => {
    const firstOnly = { ...state, thirteenthMemory: { ...state.thirteenthMemory!, secondSelected: false,
        advances: [state.thirteenthMemory!.advances[0]], secondEntries: [] } };
    const rows = groupPayslipRowsForDisplay(thirteenthPaymentRows(firstOnly), firstOnly);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].details?.length, 1);
    assert.equal(rows[0].value, 4500);
    assert.deepEqual(groupPayslipRowsForDisplay([], state), []);
});

test('old snapshots group known payroll labels but preserve manual rows and unrelated 13th descriptions', () => {
    const label = 'GRATIFICACAO NATALINA-2a PARCELA ATIVO EC';
    const rows: PayslipResultRow[] = [
        { label, value: 4500, type: 'C' },
        { label: 'GRATIFICACAO NATALINA-2a PARCELA FC/CJ ATIVO EC', value: 500, type: 'C' },
        { label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA (ABATIMENTO)', value: 4000, type: 'D' },
        { label: 'AJUSTE DO 13º SALÁRIO', value: 123, type: 'C' },
    ];
    const grouped = groupPayslipRowsForDisplay(rows, INITIAL_STATE);
    assert.equal(grouped[0].value, 5000);
    assert.equal(grouped[0].details?.length, 2);
    assert.equal(grouped.at(-1)?.value, 4000);
    const manualState = { ...INITIAL_STATE, rubricasExtras: [{ id: 'manual', descricao: label, tipo: 'C' as const, valor: 123, incideIR: false, incidePSS: false }] };
    const manual = { label, value: 123, type: 'C' as const };
    const tagged = { ...rows[0], displayGroup: 'thirteenth-credit' as const };
    const protectedRows = groupPayslipRowsForDisplay([tagged, manual], manualState);
    assert.equal(protectedRows.length, 2);
    assert.equal(protectedRows[0].value, 4500);
    assert.equal(protectedRows[1].label, label);
    assert.equal(protectedRows[1].details, undefined);
    const oldUnified = thirteenthPaymentRows(state).map(({ displayGroup, ...row }) => row);
    assert.equal(groupPayslipRowsForDisplay(oldUnified, state).length, 2);
});

test('real result component renders collapsed detail for credit and debit on desktop and mobile', () => {
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<ResultsSummary state={state} resultRows={thirteenthPaymentRows(state)} />); });
    const details = tree.root.findAllByType('details');
    assert.equal(details.length, 4);
    assert.ok(details.every(node => !node.props.open));
    const text = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
    assert.ok(tree.root.findAllByType('summary').every(node => text(node).includes('Ver detalhamento')));
    act(() => tree.unmount());
});
