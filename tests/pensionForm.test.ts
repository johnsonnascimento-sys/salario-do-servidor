import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { INITIAL_STATE, CalculatorState, PrevidenciaComplementarConfig } from '../src/types';
import { useFunprespForm } from '../src/components/Calculator/hooks/useFunprespForm';
import { DynamicPayrollTaxSection } from '../src/components/Calculator/DynamicPayrollTaxSection';
import { PensionRetroForm } from '../src/components/Calculator/PensionRetroForm';

// Deliberately synthetic parameters: tests must not define official rules.
const config: PrevidenciaComplementarConfig = {
    enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
    sponsoredRate: { min: .02, max: .04, step: .01, defaultRpc: .03 },
    linkedRate: { min: .05, max: .07, step: .01 },
    facultativeRate: { minIfPositive: .001, default: 0 },
    incidenceRules: { fc: true, gas: true, gae: true, aqTreino: true },
    urpByCompetence: { '2025-11': 7, '2026-06': 8 },
    urpSourcesByCompetence: { '2025-11': 'fonte sintética', '2026-06': 'fonte sintética' }, minimumUrpUnits: 3,
};
const state = (patch: Partial<CalculatorState> = {}): CalculatorState => ({ ...INITIAL_STATE, mesRef: 'SETEMBRO', anoRef: 2026, ...patch });
const renderHook = (input: CalculatorState) => {
    const calls: Array<[keyof CalculatorState, any]> = [];
    let result: ReturnType<typeof useFunprespForm>;
    const Harness = () => { result = useFunprespForm({ state: input, previdenciaComplementar: config, update: (key, value) => calls.push([key, value]) }); return null; };
    let tree;
    act(() => { tree = create(React.createElement(Harness)); });
    return { get value() { return result!; }, calls, tree };
};

test('trocar enquadramento RPPS preserva adesão e opções independentes', () => {
    const hook = renderHook(state());
    assert.equal(hook.value.showFunprespSection, true);
    hook.value.handleRegimePrevChange('rpc');
    assert.deepEqual(hook.calls, [['regimePrev', 'rpc']]);
    hook.tree.unmount();
});
test('participação vinculada usa grade configurada e URP de referência com fonte', () => {
    const hook = renderHook(state({ funprespParticipacao: 'vinculado', funprespAliq: .06, funprespVinculadaInicio: '2025-07', funprespBaseIntegral: 500 }));
    assert.deepEqual(hook.value.funprespNormalOptions, [.05, .06, .07]);
    assert.equal(hook.value.funprespValidationError, null);
    hook.tree.unmount();
    const missing = renderHook(state({ funprespParticipacao: 'vinculado', funprespAliq: .06, funprespVinculadaInicio: '2026-07', funprespBaseIntegral: 500 }));
    assert.match(missing.value.funprespValidationError!, /URP.*2026-07/);
    missing.tree.unmount();
});
test('patrocinada sem teto mostra erro e facultativa sem teto artificial é aceita', () => {
    const invalid = renderHook(state({ funprespParticipacao: 'patrocinado', funprespAliq: .03 }));
    assert.match(invalid.value.funprespValidationError!, /RPPS com teto/);
    invalid.tree.unmount();
    const valid = renderHook(state({ regimePrev: 'rpc', funprespParticipacao: 'patrocinado', funprespAliq: .03, funprespFacul: .123456 }));
    assert.equal(valid.value.funprespValidationError, null);
    valid.tree.unmount();
});
test('UI oferece modalidades e opções opt-in com confirmação de simulação antiga', () => {
    const calls: any[] = [];
    const input = state({ regimePrev: 'rpc', funprespParticipacao: 'patrocinado', funprespRevisarOpcoes: true });
    const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: input, update: (key, value) => calls.push([key, value]), handleRegimePrevChange: () => {}, showFunprespSection: true, previdenciaComplementar: config, funprespNormalOptions: [.02, .03, .04], handleFunprespParticipacaoChange: () => {} }));
    assert.equal(tree.root.findAllByType('option').some(option => option.props.value === 'vinculado'), true);
    assert.equal(tree.root.findAllByType('input').filter(input => input.props.type === 'checkbox').every(input => !input.props.checked), true);
    const confirm = tree.root.findAllByType('button').find(button => button.children.join('') === 'Confirmar opções da Funpresp');
    act(() => confirm!.props.onClick());
    assert.deepEqual(calls, [['funprespRevisarOpcoes', false]]);
    tree.unmount();
});
test('retroativo inicia sem inventar bases, tabela ou recolhimentos', () => {
    const calls: any[] = [];
    const tree = create(React.createElement(PensionRetroForm, { state: state(), styles: {}, pssTableOptions: [], update: (key, value) => calls.push([key, value]) }));
    act(() => tree.root.findByType('button').props.onClick());
    const entry = calls[0][1][0];
    assert.equal(entry.competencia, '');
    assert.equal(entry.baseRppsOriginal, undefined);
    assert.equal(entry.contribuicaoRppsRecolhida, undefined);
    assert.equal(entry.tabelaPSS, undefined);
    tree.unmount();
});
