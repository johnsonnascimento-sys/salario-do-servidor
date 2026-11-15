import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useEffect, useState } from 'react';
import { act, create } from 'react-test-renderer';
import { Accordion } from '../src/components/ui/Accordion';
import { SubstitutionCard } from '../src/components/Calculator/cards/SubstitutionCard';
import { ManualRubricasSection } from '../src/components/Calculator/ManualRubricasSection';
import { INITIAL_STATE } from '../src/types';
import { VacationCard } from '../src/components/Calculator/cards/VacationCard';

test('recolher e expandir preserva o componente montado e os dados de edição', () => {
    let mounts = 0;
    let unmounts = 0;
    const Input = () => {
        const [value, setValue] = useState('inicial');
        useEffect(() => { mounts += 1; return () => { unmounts += 1; }; }, []);
        return <input value={value} onChange={event => setValue(event.target.value)} />;
    };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<Accordion title="Ajustes" defaultOpen><Input /></Accordion>); });
    const button = () => tree.root.findByType('button');
    assert.equal(button().props.type, 'button');
    const content = () => tree.root.findByProps({ id: button().props['aria-controls'] });
    act(() => tree.root.findByType('input').props.onChange({ target: { value: '123,45' } }));
    act(() => button().props.onClick());
    assert.equal(button().props['aria-expanded'], false);
    assert.equal(content().props.hidden, true);
    assert.equal(tree.root.findByType('input').props.value, '123,45');
    act(() => button().props.onClick());
    assert.equal(content().props.hidden, false);
    assert.equal(mounts, 1);
    assert.equal(unmounts, 0);
    act(() => tree.unmount());
    assert.equal(unmounts, 1);
});

test('uma pendência abre o expansível sem movimentar o foco', () => {
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<Accordion title="Histórico"><input /></Accordion>); });
    assert.equal(tree.root.findByType('button').props['aria-expanded'], false);
    act(() => tree.update(<Accordion title="Histórico" expandWhen><input /></Accordion>));
    assert.equal(tree.root.findByType('button').props['aria-expanded'], true);
    act(() => tree.root.findByType('button').props.onClick());
    assert.equal(tree.root.findByType('button').props['aria-expanded'], false);
    act(() => tree.unmount());
});

test('duas substituições mantêm identificadores únicos para todas as funções', () => {
    const makeEntry = (id: string) => ({ id, dias: {}, isEA: false, excluirIR: false, pssIsEA: false });
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<>
        <SubstitutionCard entry={makeEntry('primeira')} updateEntry={() => {}} functionKeys={['fc1', 'fc2']} competenciaReferencia="11/2026" styles={{}} />
        <SubstitutionCard entry={makeEntry('segunda')} updateEntry={() => {}} functionKeys={['fc1', 'fc2']} competenciaReferencia="11/2026" styles={{}} />
    </>); });
    const ids = tree.root.findAllByType('input').map(input => input.props.id).filter(Boolean);
    assert.equal(ids.length, 4);
    assert.equal(new Set(ids).size, 4);
    for (const label of tree.root.findAllByType('label').filter(label => label.props.htmlFor)) {
        assert.equal(tree.root.findByProps({ id: label.props.htmlFor }).type, 'input');
    }
    act(() => tree.unmount());
});

test('recebimento automático de férias pode ser alternado pelo teclado', () => {
    const patches: Array<[string, unknown]> = [];
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<VacationCard state={{ ...INITIAL_STATE, ferias1_3: 0 }}
        update={(key, value) => patches.push([key, value])} competenciaReferencia="11/2026" styles={{}} />); });
    const toggle = tree.root.findByProps({ role: 'checkbox' });
    assert.equal(toggle.props.tabIndex, 0);
    assert.equal(toggle.props['aria-checked'], false);
    let prevented = false;
    act(() => toggle.props.onKeyDown({ key: ' ', preventDefault() { prevented = true; } }));
    assert.equal(prevented, true);
    assert.deepEqual(patches.at(-1), ['ferias1_3', 1]);
    act(() => tree.unmount());
});


test('rubrica EA aberta por padrão recolhe no primeiro clique e mantém seus campos montados', () => {
    const rubrica = { id: 'manual-ea', tipo: 'D' as const, descricao: 'Dedução anterior', valor: 100,
        incideIR: false, incidePSS: false, isEA: true, competenciasEA: ['2024-01'], fundamentoDeducaoEA: 'Documento 1' };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<ManualRubricasSection rubricas={[rubrica]} styles={{}} totalCreditos={0}
        totalDescontos={100} calculationReady={false} funprespParticipacao="nao" addRubrica={() => {}}
        removeRubrica={() => {}} updateRubrica={() => {}} toPositiveNumber={Number} />); });
    const trigger = () => tree.root.findByProps({ id: 'manual-advanced-trigger-manual-ea' });
    const panel = () => tree.root.findByProps({ id: 'manual-advanced-manual-ea' });
    assert.equal(trigger().props['aria-expanded'], true);
    const inputs = panel().findAllByType('input').length;
    act(() => trigger().props.onClick());
    assert.equal(trigger().props['aria-expanded'], false);
    assert.equal(panel().props.hidden, true);
    assert.equal(panel().findAllByType('input').length, inputs);
    act(() => trigger().props.onClick());
    assert.equal(panel().props.hidden, false);
    act(() => tree.unmount());
});

test('rubrica que passa a exigir natureza abre opções e respeita recolhimento durante a edição', () => {
    const rubric = { id: 'classificacao', tipo: 'C' as const, descricao: 'Crédito', valor: 0,
        incideIR: true, incidePSS: true, isEA: false };
    const render = (valor: number, descricao = 'Crédito') => <ManualRubricasSection
        rubricas={[{ ...rubric, valor, descricao }]} styles={{}} totalCreditos={valor} totalDescontos={0}
        calculationReady={false} funprespParticipacao="patrocinado" addRubrica={() => {}}
        removeRubrica={() => {}} updateRubrica={() => {}} toPositiveNumber={Number} />;
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(render(0)); });
    const trigger = () => tree.root.findByProps({ id: 'manual-advanced-trigger-classificacao' });
    assert.equal(trigger().props['aria-expanded'], false);
    act(() => tree.update(render(100)));
    assert.equal(trigger().props['aria-expanded'], true);
    act(() => trigger().props.onClick());
    assert.equal(trigger().props['aria-expanded'], false);
    act(() => tree.update(render(200, 'Descrição editada')));
    assert.equal(trigger().props['aria-expanded'], false);
    act(() => tree.unmount());
});
