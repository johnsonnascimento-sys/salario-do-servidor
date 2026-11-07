import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { DynamicPayrollOtherDeductionsSection } from '../src/components/Calculator/DynamicPayrollOtherDeductionsSection';
import { INITIAL_STATE } from '../src/types';
import { styles } from '../src/components/Calculator/styles';

test('DynamicPayrollOtherDeductionsSection: renders correctly with default empty values', async () => {
    let root!: ReturnType<typeof create>;
    await act(async () => {
        root = create(
            React.createElement(DynamicPayrollOtherDeductionsSection, {
                styles,
                state: INITIAL_STATE,
                update: () => {}
            })
        );
    });

    const inputs = root.root.findAllByType('input');
    assert.equal(inputs.length, 3);
    // planoSaude, emprestimos, pensao
    assert.equal(inputs[0].props.value, '');
    assert.equal(inputs[1].props.value, '');
    assert.equal(inputs[2].props.value, '');

    // No zerar button when total is 0
    const buttons = root.root.findAllByType('button');
    assert.equal(buttons.length, 0);

    root.unmount();
});

test('DynamicPayrollOtherDeductionsSection: shows formatted sum and zerar button when deductions exist', async () => {
    const updates: Array<{ field: string; value: any }> = [];
    const stateWithDeductions = {
        ...INITIAL_STATE,
        planoSaude: 928.52,
        emprestimos: 3761.63,
        pensao: 0
    };

    let root!: ReturnType<typeof create>;
    await act(async () => {
        root = create(
            React.createElement(DynamicPayrollOtherDeductionsSection, {
                styles,
                state: stateWithDeductions,
                update: (field, value) => {
                    updates.push({ field: String(field), value });
                }
            })
        );
    });

    const inputs = root.root.findAllByType('input');
    assert.equal(inputs[0].props.value, 928.52);
    assert.equal(inputs[1].props.value, 3761.63);
    assert.equal(inputs[2].props.value, '');

    // Has zerar button
    const buttons = root.root.findAllByType('button');
    assert.equal(buttons.length, 1);

    // Click Zerar button
    await act(async () => {
        buttons[0].props.onClick();
    });

    assert.deepEqual(updates, [
        { field: 'planoSaude', value: 0 },
        { field: 'emprestimos', value: 0 },
        { field: 'pensao', value: 0 }
    ]);

    // Test input change
    await act(async () => {
        inputs[0].props.onChange({ target: { value: '1177.60' } });
    });
    assert.equal(updates[updates.length - 1].field, 'planoSaude');
    assert.equal(updates[updates.length - 1].value, 1177.6);

    root.unmount();
});
