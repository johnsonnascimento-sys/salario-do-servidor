import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { PresetGrossSummary } from '../src/components/Calculator/PresetGrossSummary';

test('PresetGrossSummary: maintains open state and content across async recalculation typing', async () => {
    // 1. Genuine initial empty returns null
    let emptyRoot!: ReturnType<typeof create>;
    await act(async () => {
        emptyRoot = create(React.createElement(PresetGrossSummary, { lines: [] }));
    });
    assert.equal(emptyRoot.toJSON(), null);
    emptyRoot.unmount();

    // 2. Initial mount with lines starts closed
    let root!: ReturnType<typeof create>;
    const initialLines = [
        { label: 'Hora extra 50% Bruto', value: 500 },
        { label: 'Hora extra 50% Líquido', value: 362.5 }
    ];
    await act(async () => {
        root = create(React.createElement(PresetGrossSummary, { lines: initialLines }));
    });

    const detailsNode = root.root.findByType('details');
    assert.equal(detailsNode.props.open, false);

    // 3. User clicks summary to expand
    const summaryNode = root.root.findByType('summary');
    await act(async () => {
        summaryNode.props.onClick({ preventDefault: () => {} });
    });
    assert.equal(root.root.findByType('details').props.open, true);

    // 4. User types in a field (transient recalculation state with lines = [])
    await act(async () => {
        root.update(React.createElement(PresetGrossSummary, { lines: [] }));
    });

    // Must NOT unmount and must NOT collapse
    assert.notEqual(root.toJSON(), null);
    assert.equal(root.root.findByType('details').props.open, true);
    // Preserves displayed lines
    const textContent = JSON.stringify(root.toJSON());
    assert.ok(textContent.includes('Hora extra 50% Bruto'));

    // 5. Calculation finishes and provides new lines with updated amounts
    const updatedLines = [
        { label: 'Hora extra 50% Bruto', value: 750 },
        { label: 'Hora extra 50% Líquido', value: 543.75 }
    ];
    await act(async () => {
        root.update(React.createElement(PresetGrossSummary, { lines: updatedLines }));
    });

    // Still open, with updated amounts
    assert.equal(root.root.findByType('details').props.open, true);
    const updatedText = JSON.stringify(root.toJSON());
    assert.ok(updatedText.includes('750'));

    // 6. User clicks summary to close
    await act(async () => {
        root.root.findByType('summary').props.onClick({ preventDefault: () => {} });
    });
    assert.equal(root.root.findByType('details').props.open, false);

    root.unmount();
});
