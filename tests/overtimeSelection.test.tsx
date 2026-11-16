import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { OvertimeCard } from '../src/components/Calculator/cards/OvertimeCard';
import { INITIAL_STATE, type OvertimeEntry } from '../src/types';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { styles } from '../src/components/Calculator/styles';

const emptyEntry = (id = 'he-1'): OvertimeEntry => ({ id, qtd50: 0, qtd100: 0, isEA: false, excluirIR: false, usarSubstituicaoFuncao: true });
const textOf = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
const button = (root: ReactTestInstance, label: string) => root.findAllByType('button').find(node => node.props['aria-label'] === label || textOf(node) === label)!;
const hours = (root: ReactTestInstance, func: string, rate = 50) => root.findAllByType('input').find(node => node.props['aria-label'] === `${func.toUpperCase()} — Horas (${rate}%)`)!;
const selectFunction = (root: ReactTestInstance, func: string) => {
    act(() => root.findAllByType('select')[0].props.onChange({ target: { value: func } }));
    act(() => button(root, 'Adicionar função').props.onClick());
};
const setup = (entries = [emptyEntry()]) => {
    let current = entries;
    const Wrapper = () => {
        const [state, setState] = useState(entries);
        current = state;
        return <>{state.map(entry => <OvertimeCard key={entry.id} entry={entry}
            updateEntry={(id, patch) => setState(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))}
            functionKeys={['fc1', 'cj1', 'cj2']} eligibleFunctionKeys={['cj1', 'cj2']}
            styles={styles} competenciaReferencia="2026-11" />)}</>;
    };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<Wrapper />); });
    return { tree: tree!, current: () => current };
};

test('HE: começa sem linhas, adiciona só a função escolhida e impede duplicação', () => {
    const { tree, current } = setup();
    assert.equal(tree.root.findAllByType('input').filter(node => node.props['aria-label']?.includes('— Horas')).length, 0);
    assert.equal(button(tree.root, 'Adicionar função').props.disabled, true);
    assert.equal(tree.root.findAllByType('option').find(node => node.props.value === 'fc1')!.props.disabled, true);
    selectFunction(tree.root, 'cj1');
    assert.deepEqual(current()[0].horasPorFuncao, { cj1: { qtd50: 0, qtd100: 0 } });
    assert.ok(hours(tree.root, 'cj1'));
    assert.equal(hours(tree.root, 'cj2'), undefined);
    assert.equal(tree.root.findAllByType('option').some(node => node.props.value === 'cj1'), false);
    assert.equal(button(tree.root, 'Adicionar função').props.disabled, true);
    act(() => tree.unmount());
});

test('HE: horas fracionárias, remoção, reinclusão zerada e isolamento entre cards', () => {
    const { tree, current } = setup([emptyEntry(), emptyEntry('he-2')]);
    const card = () => tree.root.findAllByType(OvertimeCard)[0];
    selectFunction(card(), 'cj1');
    act(() => hours(card(), 'cj1').props.onChange({ target: { value: '1.5' } }));
    act(() => hours(card(), 'cj1', 100).props.onChange({ target: { value: '2.25' } }));
    assert.deepEqual(current()[0].horasPorFuncao?.cj1, { qtd50: 1.5, qtd100: 2.25 });
    assert.equal(current()[1].horasPorFuncao, undefined);
    act(() => hours(card(), 'cj1').props.onChange({ target: { value: '-2' } }));
    assert.equal(current()[0].horasPorFuncao?.cj1.qtd50, 0);
    selectFunction(card(), 'cj2');
    act(() => button(card(), 'Remover CJ1').props.onClick());
    assert.deepEqual(Object.keys(current()[0].horasPorFuncao!), ['cj2']);
    selectFunction(card(), 'cj1');
    assert.deepEqual(current()[0].horasPorFuncao?.cj1, { qtd50: 0, qtd100: 0 });
    assert.match(textOf(card()), /Todas as funções elegíveis já foram adicionadas/);
    act(() => tree.unmount());
});

test('HE: alternar modo preserva funções e restauração mantém zeros e funções antigas', () => {
    const entry = { ...emptyEntry(), horasPorFuncao: { cj1: { qtd50: 0, qtd100: 0 }, antiga: { qtd50: 3, qtd100: 1 } } };
    const snapshot = JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState({ ...INITIAL_STATE, overtimeEntries: [entry] })));
    const restored = hydrateCalculatorState(snapshot);
    assert.deepEqual(restored.overtimeEntries[0], entry);
    const { tree, current } = setup(restored.overtimeEntries);
    const toggle = () => tree.root.findAllByType('input').find(node => node.props.type === 'checkbox' && node.props.checked === current()[0].usarSubstituicaoFuncao)!;
    act(() => toggle().props.onChange({ target: { checked: false } }));
    assert.deepEqual(current()[0].horasPorFuncao, entry.horasPorFuncao);
    act(() => toggle().props.onChange({ target: { checked: true } }));
    assert.deepEqual(current()[0].horasPorFuncao, entry.horasPorFuncao);
    assert.equal(hours(tree.root, 'antiga').props.disabled, true);
    assert.match(textOf(tree.root), /Função indisponível no catálogo/);
    act(() => button(tree.root, 'Remover ANTIGA').props.onClick());
    assert.equal(current()[0].horasPorFuncao?.antiga, undefined);
    act(() => tree.unmount());
});

test('HE: distingue recálculo, catálogo ausente e ausência de funções elegíveis; não exibe subtotal antigo', () => {
    const entry = { ...emptyEntry(), horasPorFuncao: { cj1: { qtd50: 2, qtd100: 0 } } };
    const props = { entry, updateEntry: () => {}, functionKeys: ['cj1'], eligibleFunctionKeys: ['cj1'], styles, competenciaReferencia: '2026-11',
        functionDetails: [{ funcao: 'cj1', elegivel: true, qtd50: 2, qtd100: 0, heVal50: 123.45, heVal100: 0, heTotal: 123.45 }] };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<OvertimeCard {...props} calculationReady />); });
    assert.match(textOf(tree!.root), /123,45/);
    act(() => tree!.update(<OvertimeCard {...props} calculationReady={false} />));
    assert.doesNotMatch(textOf(tree!.root), /123,45/);
    assert.match(textOf(tree!.root), /Atualizando cálculo e funções elegíveis/);
    assert.equal(button(tree!.root, 'Adicionar função').props.disabled, true);
    assert.equal(hours(tree!.root, 'cj1').props.readOnly, true);
    act(() => tree!.update(<OvertimeCard {...props} calculationReady eligibleFunctionKeys={[]} />));
    assert.match(textOf(tree!.root), /Nenhuma função gera diferença/);
    assert.equal(hours(tree!.root, 'cj1').props.disabled, true);
    act(() => tree!.update(<OvertimeCard {...props} calculationReady functionKeys={[]} eligibleFunctionKeys={[]} functionDetails={[]} />));
    assert.match(textOf(tree!.root), /Catálogo de funções indisponível/);
    assert.match(textOf(tree!.root), /Aguardando cálculo/);
    act(() => tree!.unmount());
});
