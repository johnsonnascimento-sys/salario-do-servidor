import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { PresetControlsSection } from '../src/components/Calculator/PresetControlsSection';
import type { PresetInstance } from '../src/components/Calculator/dynamicPayrollForm.helpers';
import type { PresetSearchDestination } from '../src/components/Calculator/calculatorSearchIndex';

test('catálogo localiza a instância atual e abre a recém-incluída pelo ID', (context) => {
    let focused = '';
    let currentDialog: 'desktop' | 'mobile' | null = null;
    const highlighted = new Set<string>();
    const focusedCard = (id: string) => ({
        focus: () => { focused = id; },
        setAttribute: () => highlighted.add(id),
        removeAttribute: () => highlighted.delete(id),
        closest: () => null,
        querySelector: () => null,
        scrollIntoView: () => {}
    });
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        matchMedia: (query: string) => ({
            matches: query.includes('960px'), addEventListener() {}, removeEventListener() {}
        })
    } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
        body: { style: { overflow: '' } }, getElementById: focusedCard
    } });
    context.after(() => {
        if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
        else Reflect.deleteProperty(globalThis, 'window');
        if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
        else Reflect.deleteProperty(globalThis, 'document');
    });

    function Catalog({ searchDestination }: { searchDestination?: PresetSearchDestination }) {
        const [instances, setInstances] = useState<PresetInstance[]>([{ key: 'overtime-old', presetId: 'hora_extra' }]);
        const [expanded, expandCard] = useState('');
        return <PresetControlsSection mode="C" instanceCount={instances.length} enabledPresets={instances} searchDestination={searchDestination}
            transportIndemnityEnabled={false} includePreset={presetId => {
                const key = 'overtime-new';
                setInstances(previous => [{ presetId, key }, ...previous]);
                return key;
            }} addRubrica={() => {}} expandCard={expandCard}>
            <output>{expanded}</output>
        </PresetControlsSection>;
    }

    let tree!: ReturnType<typeof create>;
    act(() => {
        tree = create(<Catalog />, { createNodeMock: element => {
            if (element.type === 'dialog') return {
                show: () => { currentDialog = 'desktop'; },
                showModal: () => { currentDialog = 'mobile'; },
                close: () => { currentDialog = null; }
            };
            return { focus: () => { focused = String(element.type); } };
        } });
    });
    try {
        const control = (label: string) => tree.root.findAllByType('button').find(button =>
            button.props['aria-label'] === label || button.children.includes(label));
        const open = () => act(() => control('Adicionar crédito')!.props.onClick());
        const count = () => tree.root.findAllByType('h3').map(node => node.children.join(''))
            .find(title => title.startsWith('Créditos adicionados'));

        open();
        assert.equal(currentDialog, 'desktop');
        assert.equal(focused, 'input');
        assert.equal(control('Adicionar Indenização de Transporte'), undefined);
        act(() => tree.root.findByType('input').props.onChange({ target: { value: 'servico extraordinario' } }));
        assert.equal(tree.root.findAllByType('li').length, 1);
        act(() => control('Adicionar outro lançamento de Horas extras')!.props.onClick());
        assert.equal(currentDialog, null);
        assert.equal(focused, 'preset-card-overtime-new');
        assert.deepEqual([...highlighted], ['preset-card-overtime-new']);
        assert.equal(tree.root.findByType('output').children.join(''), focused);
        assert.equal(count(), 'Créditos adicionados (2)');

        open();
        assert.ok(tree.root.findAllByType('p').some(node => node.children.join('') === '2 lançamentos'));
        act(() => control('Ver lançamento de Horas extras')!.props.onClick());
        assert.equal(focused, 'preset-card-overtime-new');

        act(() => tree.update(<Catalog searchDestination={{ kind: 'preset', step: 6, presetId: 'ferias' }} />));
        assert.equal(currentDialog, 'desktop');
        assert.equal(focused, 'button');
        assert.equal(tree.root.findAllByType('li').length, 1);
        assert.ok(control('Adicionar Férias'));
        assert.equal(count(), 'Créditos adicionados (2)');

        act(() => tree.update(<Catalog searchDestination={{ kind: 'preset', step: 6, presetId: 'hora_extra' }} />));
        assert.equal(currentDialog, null);
        assert.equal(focused, 'preset-card-overtime-new');
        assert.equal(count(), 'Créditos adicionados (2)');
    } finally {
        act(() => tree.unmount());
    }
});
