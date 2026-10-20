import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig } from '../src/types';
import type { PensionRetroEntry } from '../src/types/pension';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { buildPensionContext } from '../src/services/agency/engine/modules/pensionContext';
import { resolveHistoricalPensionContext } from '../src/services/agency/engine/modules/pensionSelectionContext';
import { PensionRetroForm } from '../src/components/Calculator/PensionRetroForm';
import { PensionRegimeSelect } from '../src/components/Calculator/PensionRegimeSelect';
import { PensionParticipationSelect } from '../src/components/Calculator/PensionParticipationSelect';

// Synthetic configuration: none of these values defines production rules.
const config = {
    historico_pss: { historical: { teto_rgps: 1000, faixas: [{ min: 0, max: 100000, rate: .1 }] } },
    previdenciaComplementar: {
        enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
        sponsoredRate: { min: .02, max: .04, step: .01, defaultRpc: .03 },
        linkedRate: { min: .05, max: .07, step: .01 },
        facultativeRate: { minIfPositive: .001, default: 0 },
        incidenceRules: { fc: true, gas: true, gae: true, aqTreino: true },
        urpByCompetence: { '2025-11': 7 }, urpSourcesByCompetence: { '2025-11': 'fonte sintética' }, minimumUrpUnits: 3,
    },
} as CourtConfig;
const entry = (patch: Partial<PensionRetroEntry> = {}): PensionRetroEntry => ({
    id: 'retro-1', competencia: '2026-06', tabelaPSS: 'historical', modo: 'completo', tipo: 'mensal', destinoIR: 'ea',
    regimePrev: 'rpc', participacao: 'patrocinado', baseComplementarDevida: 2000, aliquotaNormal: .03, ...patch,
});
const input = (entries: PensionRetroEntry[], patch: Partial<CalculatorState> = {}) => {
    const state: CalculatorState = { ...INITIAL_STATE, regimePrev: 'rpc', funprespParticipacao: 'nao', tabelaPSS: 'historical', pensionRetroEntries: entries, ...patch };
    const pensionParams = { ...mapStateToAgencyParams(state, 'jmu', config), competencia: '2026-06' };
    const pensionContexts = {
        monthly: buildPensionContext(pensionParams, 2000),
        retro: Object.fromEntries(entries.map(item => [item.id, resolveHistoricalPensionContext(pensionParams, item)])),
        requiresChoice: false,
    };
    return { state, pensionParams, pensionContexts, styles: {}, pssTableOptions: ['historical'] };
};
const calls: Array<[keyof CalculatorState, any]> = [];
const update = (field: keyof CalculatorState, value: any) => calls.push([field, value]);
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
before(() => { if (!originalDocument) Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: null } }); });
after(() => { if (!originalDocument) Reflect.deleteProperty(globalThis, 'document'); });
const render = (props: ReturnType<typeof input>, extra = {}) => {
    calls.length = 0;
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(PensionRetroForm, { ...props, update, ...extra })); });
    return tree!;
};
const button = (tree: ReturnType<typeof create>, title: string) => tree.root.findAllByType('button').find(item => item.children.join('') === title)!;

test('retroativo manual não oferece seletores nem diálogo previdenciário', () => {
    const tree = render(input([entry({ modo: 'manual', regimePrev: 'antigo' })]));
    assert.equal(tree.root.findAllByType(PensionRegimeSelect).length, 0);
    assert.equal(tree.root.findAllByType(PensionParticipationSelect).length, 0);
    assert.equal(tree.root.findAllByType('dialog').length, 0);
    tree.unmount();
});

test('contexto histórico ausente bloqueia seleção inclusive eventos disparados por código', () => {
    const tree = render(input([entry({ baseComplementarDevida: undefined })]));
    const regime = tree.root.findByType(PensionRegimeSelect);
    const participation = tree.root.findByType(PensionParticipationSelect);
    assert.equal(regime.props.disabled, true);
    assert.equal(participation.props.disabled, true);
    act(() => { regime.props.onChange('antigo'); participation.props.onChange('nao'); });
    assert.equal(calls.length, 0);
    assert.match(JSON.stringify(tree.toJSON()), /Informe a competência, a tabela PSS/);
    tree.unmount();
});

test('apenas o primeiro retroativo incompatível abre automaticamente e suspensão mensal impede abertura', () => {
    const props = input([entry({ regimePrev: 'antigo' }), entry({ id: 'retro-2', regimePrev: 'antigo' })]);
    const tree = render(props);
    assert.equal(tree.root.findAllByType('dialog').length, 1);
    assert.equal(tree.root.findAllByType('input').filter(item => item.props.type === 'radio').every(item => !item.props.checked), true);
    act(() => button(tree, 'Voltar ao preenchimento').props.onClick());
    assert.equal(tree.root.findAllByType('dialog').length, 0);
    assert.equal(calls.length, 0);
    tree.unmount();
    const suspended = render(props, { allowAutoResolve: false });
    assert.equal(suspended.root.findAllByType('dialog').length, 0);
    suspended.unmount();
});

test('troca mensal preserva o enquadramento e as legendas próprios de cada retroativo', () => {
    const entries = [entry({ regimePrev: 'novo_antigo', participacao: 'nao' }), entry({ id: 'retro-2', regimePrev: 'migrado', participacao: 'nao' })];
    const tree = render(input(entries, { regimePrev: 'antigo' }));
    assert.deepEqual(tree.root.findAllByType(PensionRegimeSelect).map(item => item.props.value), ['novo_antigo', 'migrado']);
    act(() => tree.update(React.createElement(PensionRetroForm, { ...input(entries, { regimePrev: 'rpc' }), update })));
    assert.deepEqual(tree.root.findAllByType(PensionRegimeSelect).map(item => item.props.value), ['novo_antigo', 'migrado']);
    const ids = tree.root.findAllByType('select').filter(item => item.props['aria-describedby']).map(item => item.props['aria-describedby']);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(calls.length, 0);
    tree.unmount();
});

test('troca histórica incompatível cancela sem gravar e confirma vinculada em um único patch', () => {
    const original = entry({ contribuicaoComplementarRecolhida: 17, aliquotaFacultativa: .02 });
    const other = entry({ id: 'retro-2', regimePrev: 'migrado' });
    const tree = render(input([original, other]));
    const change = () => act(() => tree.root.findAllByType(PensionRegimeSelect)[0].props.onChange('antigo'));
    change();
    assert.equal(calls.length, 0);
    assert.equal(tree.root.findAllByType(PensionRegimeSelect)[0].props.value, 'rpc');
    act(() => button(tree, 'Cancelar a troca').props.onClick());
    assert.equal(tree.root.findAllByType('dialog').length, 0);
    assert.equal(calls.length, 0);
    change();
    const dialog = tree.root.findByType('dialog');
    act(() => dialog.findAllByType('input').find(item => item.props.type === 'radio' && item.props.value === 'vinculado')!.props.onChange());
    assert.equal(button(tree, 'Confirmar escolha').props.disabled, true);
    act(() => dialog.findByType('select').props.onChange({ target: { value: '.06' } }));
    act(() => dialog.findAllByType('input').find(item => item.props.type === 'number')!.props.onChange({ target: { value: '500' } }));
    act(() => dialog.findAllByType('input').find(item => item.props.type === 'month')!.props.onChange({ target: { value: '2025-11' } }));
    assert.equal(button(tree, 'Confirmar escolha').props.disabled, false);
    act(() => dialog.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'pensionRetroEntries');
    assert.deepEqual(calls[0][1], [{ ...original, regimePrev: 'antigo', participacao: 'vinculado', aliquotaNormal: .06, salarioParticipacaoVinculado: 500, inicioVinculado: '2025-11' }, other]);
    tree.unmount();
});

test('seleção indisponível não grava; não participar preserva campos históricos fora do patch', () => {
    const original = entry({ salarioParticipacaoVinculado: 456, inicioVinculado: '2025-11' });
    const tree = render(input([original]));
    const selection = tree.root.findByType(PensionParticipationSelect);
    act(() => selection.props.onChange('vinculado'));
    assert.equal(calls.length, 0);
    assert.equal(tree.root.findAllByType('dialog').length, 0);
    act(() => selection.props.onChange('nao'));
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0][1], [{ ...original, participacao: 'nao' }]);
    tree.unmount();
});
