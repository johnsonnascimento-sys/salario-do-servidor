import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { SubstitutionCard } from '../src/components/Calculator/cards/SubstitutionCard';
import { PresetInstanceCard } from '../src/components/Calculator/PresetInstanceCard';
import { PresetGrossSummary } from '../src/components/Calculator/PresetGrossSummary';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { styles } from '../src/components/Calculator/styles';
import { INITIAL_STATE, type SubstitutionEntry, type CalculatorState, type CourtConfig } from '../src/types';
import type { CalculatedSubstitutionEntry } from '../src/types/irEa';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';

const empty = (id = 's1'): SubstitutionEntry => ({ id, dias: {}, isEA: false, excluirIR: false, pssIsEA: false });
const text = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
const button = (root: ReactTestInstance, name: string) => root.findAllByType('button').find(node => node.props['aria-label'] === name || text(node) === name)!;
const days = (root: ReactTestInstance, key: string) => root.findAllByType('input').find(node => node.props['aria-label'] === `${key.toUpperCase()} — Dias de substituição`)!;
const add = (root: ReactTestInstance, key: string) => {
    act(() => root.findByType('select').props.onChange({ target: { value: key } }));
    act(() => button(root, 'Adicionar função').props.onClick());
};
const setup = (entries = [empty()]) => {
    let current = entries;
    const Wrapper = () => {
        const [state, setState] = useState(entries);
        current = state;
        return <>{state.map(entry => <SubstitutionCard key={entry.id} entry={entry}
            updateEntry={(id, patch) => setState(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item))}
            functionKeys={['fc1', 'cj1', 'cj2']} eligibleFunctionKeys={['cj1', 'cj2']} styles={styles} competenciaReferencia="11/2026" />)}</>;
    };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<Wrapper />); });
    return { tree: tree!, current: () => current };
};

test('substituição: seleção vazia, somente função adicionada, duplicação e destinos desabilitados', () => {
    const { tree, current } = setup();
    assert.equal(tree.root.findAllByType('input').filter(node => node.props.id?.endsWith('-dias')).length, 0);
    assert.equal(button(tree.root, 'Adicionar função').props.disabled, true);
    assert.equal(tree.root.findAllByType('option').find(node => node.props.value === 'fc1')!.props.disabled, true);
    add(tree.root, 'cj1');
    assert.deepEqual(current()[0].dias, { cj1: 0 });
    assert.ok(days(tree.root, 'cj1'));
    assert.equal(days(tree.root, 'cj2'), undefined);
    assert.equal(tree.root.findAllByType('option').some(node => node.props.value === 'cj1'), false);
    assert.equal(tree.root.findAllByType('details')[0].props.open, false);
    act(() => tree.unmount());
});

test('substituição: fracionárias, remoção, reinclusão zerada e isolamento de cards', () => {
    const { tree, current } = setup([empty(), empty('s2')]);
    const card = () => tree.root.findAllByType(SubstitutionCard)[0];
    add(card(), 'cj1');
    act(() => days(card(), 'cj1').props.onChange({ target: { value: '2.5' } }));
    assert.equal(current()[0].dias.cj1, 2.5);
    act(() => button(card(), 'CJ1 — Aumentar dias de substituição').props.onClick());
    assert.equal(current()[0].dias.cj1, 3.5);
    act(() => button(card(), 'CJ1 — Diminuir dias de substituição').props.onClick());
    assert.equal(current()[0].dias.cj1, 2.5);
    assert.deepEqual(current()[1].dias, {});
    act(() => days(card(), 'cj1').props.onChange({ target: { value: '-4' } }));
    assert.equal(current()[0].dias.cj1, 0);
    assert.equal(button(card(), 'CJ1 — Diminuir dias de substituição').props.disabled, true);
    add(card(), 'cj2');
    assert.match(text(card()), /Todas as funções elegíveis já foram adicionadas/);
    act(() => button(card(), 'Remover CJ1').props.onClick());
    assert.deepEqual(current()[0].dias, { cj2: 0 });
    add(card(), 'cj1');
    assert.deepEqual(current()[0].dias, { cj2: 0, cj1: 0 });
    act(() => tree.unmount());
});

test('substituição: restaura zeros, inelegíveis e funções ausentes sem alterar snapshot', () => {
    const entry = { ...empty(), dias: { cj1: 0, fc1: 4, antiga: 3 }, isEA: true, pssIsEA: true, competenciasEA: ['2024-02'], valorBrutoManual: 0 };
    const snapshot = JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState({ ...INITIAL_STATE, substitutionEntries: [entry] })));
    const original = JSON.stringify(snapshot);
    const restored = hydrateCalculatorState(snapshot);
    const { tree, current } = setup(restored.substitutionEntries);
    assert.equal(JSON.stringify(snapshot), original);
    assert.deepEqual(current()[0], entry);
    assert.equal(days(tree.root, 'fc1').props.disabled, true);
    assert.equal(days(tree.root, 'antiga').props.disabled, true);
    assert.match(text(tree.root), /Função indisponível no catálogo/);
    act(() => button(tree.root, 'Remover ANTIGA').props.onClick());
    assert.equal(current()[0].dias.antiga, undefined);
    assert.deepEqual(snapshot.substitutionEntries[0].dias, entry.dias);
    act(() => tree.unmount());
});

test('substituição: alterna três modos, mantém períodos e dias avulsos, e restaura a seleção por mês', () => {
    const { tree, current } = setup([{ ...empty(), dias: { cj1: 2.5, cj2: 0 } }]);
    const mode = (value: 'dias' | 'datas' | 'avulsos') => act(() => tree.root.findAllByType('input').find(node =>
        node.props.name?.endsWith('-cj1-modo') && node.props.value === value)!.props.onChange());
    const date = (field: 'inicio' | 'fim') => tree.root.findAllByType('input').find(node => node.props.id?.endsWith(`-cj1-${field}`))!;
    const changeDate = (field: 'inicio' | 'fim', value: string) => act(() => date(field).props.onChange({ target: { value } }));

    mode('datas');
    assert.equal(days(tree.root, 'cj1'), undefined);
    assert.ok(days(tree.root, 'cj2'));
    assert.equal(date('inicio').props.min, undefined);
    assert.equal(date('fim').props.max, '2026-11-30');
    changeDate('inicio', '2026-08-28');
    assert.match(text(tree.root), /Informe as datas de início e fim/);
    changeDate('fim', '2026-08-19');
    assert.match(text(tree.root), /igual ou posterior/);
    changeDate('fim', '2026-09-03');
    assert.match(text(tree.root), /7 dias selecionados no total/);
    assert.match(text(tree.root), /08\/2026 · 4 dias/);
    assert.match(text(tree.root), /09\/2026 · 3 dias/);
    assert.match(text(tree.root), /tabela do mês de exercício/);
    assert.equal(current()[0].isEA, false);
    act(() => button(tree.root, 'Adicionar período').props.onClick());
    assert.equal(tree.root.findAllByType('input').filter(node => node.props.type === 'date').length, 4);
    act(() => button(tree.root, 'Remover período 2').props.onClick());
    assert.equal(tree.root.findAllByType('input').filter(node => node.props.type === 'date').length, 2);

    mode('avulsos');
    const month = () => tree.root.findByProps({ 'aria-label': 'Mês de exercício' });
    const goTo = (value: string) => act(() => month().props.onChange({ target: { value } }));
    assert.equal(month().props.value, '2026-11');
    assert.equal(button(tree.root, 'Próximo mês').props.disabled, true);
    act(() => button(tree.root, 'Mês anterior').props.onClick());
    assert.equal(month().props.value, '2026-10');
    act(() => button(tree.root, '11/10/2026').props.onClick());
    goTo('2026-08');
    act(() => button(tree.root, '29/08/2026').props.onClick());
    assert.equal(button(tree.root, '29/08/2026').props['aria-pressed'], true);
    assert.match(text(tree.root), /2 dias selecionados no total/);
    assert.match(text(tree.root), /08\/2026 · 1 dia/);
    assert.match(text(tree.root), /10\/2026 · 1 dia/);
    assert.equal(current()[0].pssIsEA, false);

    mode('dias');
    assert.equal(days(tree.root, 'cj1').props.value, 2.5);
    assert.equal(date('inicio'), undefined);
    mode('datas');
    assert.equal(date('inicio').props.value, '2026-08-28');
    assert.match(text(tree.root), /7 dias selecionados no total/);
    mode('avulsos');

    const snapshot = JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState({ ...INITIAL_STATE, substitutionEntries: current() })));
    const restored = setup(hydrateCalculatorState(snapshot).substitutionEntries);
    assert.match(text(restored.tree.root), /2 dias selecionados no total/);
    assert.equal(button(restored.tree.root, '11/10/2026').props['aria-pressed'], true);
    act(() => button(restored.tree.root, '11/10/2026').props.onClick());
    assert.match(text(restored.tree.root), /1 dia selecionado no total/);
    assert.deepEqual(restored.current()[0].periodosPorFuncao?.cj1.intervalos, [{ dataInicio: '2026-08-28', dataFim: '2026-09-03' }]);
    act(() => button(tree.root, 'Remover CJ1').props.onClick());
    assert.equal(current()[0].periodosPorFuncao, undefined);
    act(() => tree.unmount());
    act(() => restored.tree.unmount());
});

test('substituição: snapshot por data anterior abre como um intervalo editável', () => {
    const source = { ...empty(), dias: { cj1: 0 }, periodosPorFuncao: {
        cj1: { modo: 'datas' as const, dataInicio: '2026-08-20', dataFim: '2026-08-23' }
    } };
    const restored = setup(hydrateCalculatorState({ ...INITIAL_STATE, substitutionEntries: [source] }).substitutionEntries);
    assert.equal(restored.tree.root.findAllByType('input').filter(node => node.props.type === 'date').length, 2);
    assert.match(text(restored.tree.root), /4 dias selecionados no total/);
    assert.deepEqual(restored.current()[0], source);
    act(() => restored.tree.unmount());
});

test('substituição: três regimes exclusivos, PSS e valor documentado independentes, radios por instância', () => {
    const { tree, current } = setup([{ ...empty(), pssIsEA: true, valorBrutoManual: 0 }, empty('s2')]);
    const card = () => tree.root.findAllByType(SubstitutionCard)[0];
    const choose = (value: string) => act(() => card().findAllByType('input').find(node => node.props.type === 'radio' && node.props.value === value)!.props.onChange());
    const groups = tree.root.findAllByType(SubstitutionCard).map(node => node.findAllByType('input').find(input => input.props.type === 'radio')!.props.name);
    assert.notEqual(groups[0], groups[1]);
    choose('rra');
    assert.equal(current()[0].isEA, true);
    assert.deepEqual(current()[0].competenciasEA, ['2025-12']);
    choose('excluir');
    assert.equal(current()[0].isEA, false);
    assert.equal(current()[0].excluirIR, true);
    assert.equal(current()[0].pssIsEA, true);
    assert.equal(current()[0].valorBrutoManual, 0);
    assert.deepEqual(current()[0].competenciasEA, ['2025-12']);
    choose('mensal');
    assert.equal(current()[0].excluirIR, false);
    assert.equal(current()[1].isEA, false);
    assert.ok(card().findAllByType('input').find(input => input.props.id?.endsWith('manual-gross')));
    assert.match(text(card()), /subtotais por função são apenas referência/);
    act(() => button(card(), 'Usar cálculo por dias').props.onClick());
    assert.equal(current()[0].valorBrutoManual, undefined);
    assert.equal(current()[0].pssIsEA, true);
    const manual = card().findAllByType('input').find(input => input.props.id?.endsWith('manual-gross'))!;
    assert.equal(manual.props.value, '');
    act(() => manual.props.onChange({ target: { value: '123.45' } }));
    assert.equal(current()[0].valorBrutoManual, 123.45);
    assert.equal(current()[0].isEA, false);
    act(() => tree.unmount());
});

const memory: CalculatedSubstitutionEntry = { id: 's1', total: 123.45, isEA: false, excluirIR: false, pssIsEA: false,
    origemValor: 'dias', totalPorDias: 123.45, funcoesSubstituicaoElegiveis: ['cj1'],
    detalhamentoPorFuncao: [{ funcao: 'cj1', dias: 2.5, elegivel: true, valorDestino: 2500, baseAbatimento: 1000, diferencaMensal: 1500, divisor: 30, subtotal: 123.45 }] };
test('substituição: subtotal vem do motor e desaparece durante atualização; catálogo/eligibilidade ausentes', () => {
    const props = { entry: { ...empty(), dias: { cj1: 2.5 } }, updateEntry: () => {}, functionKeys: ['cj1'], eligibleFunctionKeys: ['cj1'],
        functionDetails: memory.detalhamentoPorFuncao, styles, competenciaReferencia: '2026-11' };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<SubstitutionCard {...props} calculationReady />); });
    assert.match(text(tree!.root), /123,45/);
    act(() => tree!.update(<SubstitutionCard {...props} calculationReady={false} />));
    assert.doesNotMatch(text(tree!.root), /123,45/);
    assert.match(text(tree!.root), /Atualizando cálculo/);
    assert.equal(days(tree!.root, 'cj1').props.readOnly, true);
    act(() => tree!.update(<SubstitutionCard {...props} eligibleFunctionKeys={[]} />));
    assert.match(text(tree!.root), /Nenhuma função gera diferença/);
    assert.equal(days(tree!.root, 'cj1').props.disabled, true);
    act(() => tree!.update(<SubstitutionCard {...props} functionKeys={[]} eligibleFunctionKeys={[]} />));
    assert.match(text(tree!.root), /Catálogo de funções indisponível/);
    act(() => tree!.unmount());
});

const config = { bases: { funcoes: { cj1: 2500 }, salario: {} }, values: {}, historico_pss: {}, historico_ir: {} } as CourtConfig;
const state = { ...INITIAL_STATE, substitutionEntries: [{ ...empty(), dias: { cj1: 2.5 } }], substitutionCalculatedEntries: [memory], substIrMensal: 10 } as CalculatorState;
const instance = { key: 'subst-card', presetId: 'substituicao' as const, substitutionEntryId: 's1' };
const linesFor = (value: CalculatorState) => buildPresetGrossLines({ instance, state: value, courtConfig: config, currentTables: { funcoes: { cj1: 2500 } }, isNovoAQ: false, noFunctionCode: '0', currentFunctionValue: 1000, gratificacaoEspecificaCalculada: 0 });

test('substituição: detalhamento usa memória e identifica total documentado sem rateio', () => {
    const lines = linesFor(state);
    assert.equal(lines.find(line => line.label === 'CJ1 — Divisor aplicado')!.displayValue, '30');
    assert.equal(lines.find(line => line.label === 'CJ1 — Subtotal por dias')!.value, 123.45);
    assert.equal(lines.find(line => line.label === 'Total substituição Líquido')!.value, 113.45);
    const manual = linesFor({ ...state, substitutionCalculatedEntries: [{ ...memory, origemValor: 'manual', total: 0 }] });
    assert.equal(manual.find(line => line.label === 'Valor bruto documentado utilizado')!.value, 0);
    assert.equal(manual.find(line => line.label === 'CJ1 — Subtotal por dias (referência)')!.value, 123.45);
    assert.equal(manual.find(line => line.label === 'Total substituição Bruto')!.value, 0);
    const periodDetail = { ...memory.detalhamentoPorFuncao![0], dias: 4,
        periodo: { dataInicio: '2026-08-20', dataFim: '2026-08-23' },
        tabelaRemuneratoria: { periodo: 2, referencia: 'exercicio' as const, vigencia: '2026-07-01' } };
    const byPeriod = linesFor({ ...state, substitutionCalculatedEntries: [{ ...memory, detalhamentoPorFuncao: [periodDetail] }] });
    assert.equal(byPeriod.find(line => line.label === 'CJ1 — Período de substituição')!.displayValue, '20/08/2026 a 23/08/2026');
    assert.equal(byPeriod.find(line => line.label === 'CJ1 — Tabela remuneratória')!.displayValue, 'Mês de exercício · Tabela 2 · Vigência desde 01/07/2026');
    assert.equal(byPeriod.find(line => line.label === 'CJ1 — Dias de substituição')!.displayValue, '4');
});

test('substituição: ajuda normativa, resumo compacto recolhido e resultados antigos ocultos', () => {
    const noop = () => {};
    const props = { instance, presetLabel: 'Substituição', reorderMode: false, draggingPreset: null,
        handlePresetDragStart: noop, handlePresetDragOver: noop, handlePresetDrop: noop, handlePresetDragEnd: noop, removePreset: noop,
        state, update: noop, styles, isNovoAQ: false, competenciaReferencia: '2026-11', functionKeys: ['cj1'],
        updateOvertimeEntry: noop, updateSubstitutionEntry: noop, courtConfig: config, lines: linesFor(state), calculationReady: true };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<PresetInstanceCard {...props} />); });
    const help = () => button(tree!.root, 'Informações sobre Substituição de Função');
    assert.equal(help().props['aria-expanded'], false);
    act(() => help().props.onClick());
    assert.equal(help().props['aria-expanded'], true);
    assert.match(text(tree!.root.findByProps({ role: 'note' })), /Lei 8.112\/90, art. 38/);
    act(() => help().props.onClick());
    assert.equal(help().props['aria-expanded'], false);
    const summary = tree!.root.findByType(PresetGrossSummary);
    assert.equal(summary.props.compact, true);
    assert.equal(summary.findByType('details').props.open, false);
    act(() => summary.findByType('summary').props.onClick({ preventDefault: noop }));
    assert.equal(summary.findByType('details').props.open, true);
    act(() => tree!.update(<PresetInstanceCard {...props} calculationReady={false} />));
    assert.deepEqual(tree!.root.findByType(PresetGrossSummary).props.lines, []);
    assert.doesNotMatch(text(tree!.root), /123,45|113,45/);
    act(() => tree!.unmount());
});
