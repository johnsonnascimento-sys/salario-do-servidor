import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { INITIAL_STATE, CalculatorState, PrevidenciaComplementarConfig } from '../src/types';
import { useFunprespForm } from '../src/components/Calculator/hooks/useFunprespForm';
import { DynamicPayrollTaxSection } from '../src/components/Calculator/DynamicPayrollTaxSection';
import { ActionFooter } from '../src/components/Calculator/ActionFooter';
import { PensionRegimeSelect, pensionRegimeGroup } from '../src/components/Calculator/PensionRegimeSelect';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { PensionParticipationSelect } from '../src/components/Calculator/PensionParticipationSelect';
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

test('modalidade incompatível é desabilitada e simulação antiga oferece recuperação explícita', () => {
 const calls: any[] = [];
 const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: state({funprespParticipacao:'patrocinado'}), update:()=>{}, handleRegimePrevChange:value=>calls.push(value), showFunprespSection:true, previdenciaComplementar:config, funprespNormalOptions:[.03], handleFunprespParticipacaoChange:()=>{} }));
 assert.equal(tree.root.findAllByType('option').find(o=>o.props.value==='patrocinado')?.props.disabled,true);
 const recover=tree.root.findAllByType('button').find(b=>b.children.join('')==='Meu RPPS é limitado ao teto do RGPS');
 act(()=>recover!.props.onClick());assert.deepEqual(calls,['rpc']);tree.unmount();
});

test('rodapé mostra a causa completa do erro e mantém salvar/exportar bloqueados', () => {
 const detail='Previdência: informe a apuração do retroativo por competência, sem alíquota marginal atual.';
 const tree=create(React.createElement(ActionFooter,{state:state(),calculationReady:false,errorDetail:detail,resultMessage:'Cálculo indisponível',onExportPDF:()=>{},onExportExcel:()=>{}}));
 assert.equal(tree.root.findByProps({role:'alert'}).children.join(''),detail);
 assert.equal(tree.root.findAllByType('button').filter(b=>['Exportar PDF/Holerite','Exportar Excel','Salvar na minha área'].includes(b.props.title)).every(b=>b.props.disabled),true);
 tree.unmount();
});

for (const regime of ['antigo', 'novo_antigo', 'migrado', 'rpc'] as const) {
    test('seletor de dois grupos preserva snapshot e alias: ' + regime, () => {
        const input = state({ regimePrev: regime, funprespParticipacao: 'nao',
            pensionRetroEntries: [{ id: 'historico', competencia: '2025-07', regimePrev: 'migrado' }] });
        const restored = hydrateCalculatorState(JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(input))));
        const calls: any[] = [];
        const tree = create(React.createElement(PensionRegimeSelect, { value: restored.regimePrev, onChange: value => calls.push(value) }));
        assert.equal(tree.root.findAllByType('option').length, 2);
        const select = tree.root.findByType('select');
        assert.equal(select.props.value, pensionRegimeGroup(regime));
        act(() => select.props.onChange({ target: { value: select.props.value } }));
        assert.deepEqual(calls, [regime]);
        const hook = renderHook(restored);
        hook.value.handleRegimePrevChange(pensionRegimeGroup(regime));
        assert.deepEqual(hook.calls, []);
        const other = pensionRegimeGroup(regime) === 'antigo' ? 'rpc' : 'antigo';
        hook.value.handleRegimePrevChange(other);
        assert.deepEqual(hook.calls, [['regimePrev', other]]);
        assert.deepEqual(restored.pensionRetroEntries, input.pensionRetroEntries);
        assert.equal(restored.regimePrev, regime);
        hook.tree.unmount(); tree.unmount();
    });
}

test('opções adicionais contam apenas opções ativas e recolher não muda entradas', () => {
    const input = state({ regimePrev: 'rpc', funprespParticipacao: 'patrocinado', funprespAliq: .03,
        pssSobreFC: true, funprespIncluirFC: true, funprespFacul: .01, funprespFaculValor: 25 });
    const calls: any[] = [];
    const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: input,
        update: (k,v) => calls.push([k,v]), handleRegimePrevChange: () => {}, showFunprespSection: true,
        previdenciaComplementar: config, funprespNormalOptions: [.03], handleFunprespParticipacaoChange: () => {} }));
    assert.match(tree.root.findByType('summary').children.join(''), /4.*ativas/);
    const details = tree.root.findByType('details');
    assert.equal(details.props.open, false);
    act(() => details.props.onToggle({ currentTarget: { open: true } }));
    act(() => details.props.onToggle({ currentTarget: { open: false } }));
    assert.deepEqual(calls, []);
    tree.unmount();
});

test('pendência interna abre expansor mesmo com outro erro na seção essencial', () => {
    const input = state({ funprespParticipacao: 'patrocinado', funprespAliq: .03, funprespFacul: -.1 });
    const hook = renderHook(input);
    assert.match(hook.value.funprespValidationError!, /RPPS com teto/);
    assert.match(hook.value.funprespAdditionalValidationError!, /não negativo/);
    const props = { styles: {}, state: input, update: () => {}, handleRegimePrevChange: () => {},
        showFunprespSection: true, previdenciaComplementar: config, funprespNormalOptions: [.03], handleFunprespParticipacaoChange: () => {} };
    const tree = create(React.createElement(DynamicPayrollTaxSection, props));
    act(() => tree.update(React.createElement(DynamicPayrollTaxSection, { ...props,
        funprespValidationError: hook.value.funprespValidationError!,
        funprespAdditionalValidationError: hook.value.funprespAdditionalValidationError! })));
    assert.equal(tree.root.findByType('details').props.open, true);
    hook.tree.unmount(); tree.unmount();
});

test('não participante oculta alíquota; vinculada mantém dados obrigatórios fora do expansor', () => {
    for (const participation of ['nao', 'vinculado'] as const) {
        const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: state({ funprespParticipacao: participation }),
            update: () => {}, handleRegimePrevChange: () => {}, showFunprespSection: true, previdenciaComplementar: config,
            funprespNormalOptions: [.05], handleFunprespParticipacaoChange: () => {} }));
        assert.equal(tree.root.findAllByType('select').some(s => s.props.value === INITIAL_STATE.funprespAliq), participation === 'vinculado');
        assert.equal(tree.root.findAllByType('input').filter(i => i.props.type === 'month').length, participation === 'vinculado' ? 1 : 0);
        assert.equal(tree.root.findByType('details').findAllByType('input').some(i => i.props.type === 'month'), false);
        tree.unmount();
    }
});

test('retroativo mantém seu alias e independe de alteração no enquadramento mensal', () => {
    const calls: any[] = [];
    const input = state({ regimePrev: 'rpc', pensionRetroEntries: [{ id: 'r', competencia: '2025-07', regimePrev: 'novo_antigo' }] });
    const tree = create(React.createElement(PensionRetroForm, { state: input, styles: {}, pssTableOptions: [], update: (k,v) => calls.push([k,v]) }));
    const select = tree.root.findAllByType('select').find(s => s.props.value === 'antigo')!;
    act(() => select.props.onChange({ target: { value: 'antigo' } }));
    assert.equal(calls[0][1][0].regimePrev, 'novo_antigo');
    tree.update(React.createElement(PensionRetroForm, { state: { ...input, regimePrev: 'antigo' }, styles: {}, pssTableOptions: [], update: () => {} }));
    assert.equal(tree.root.findByType(PensionRegimeSelect).props.value, 'novo_antigo');
    tree.unmount();
});

test('pendência exclusiva do motor abre opções adicionais', () => {
    const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: state(), update: () => {},
        handleRegimePrevChange: () => {}, showFunprespSection: true, previdenciaComplementar: config, funprespNormalOptions: [],
        handleFunprespParticipacaoChange: () => {}, calculationError: 'Previdência: aporte facultativo inferior ao mínimo configurado.' }));
    assert.equal(tree.root.findByType('details').props.open, true);
    tree.unmount();
});

const describedHelp = (root: any, select: any) => {
    const helpId = select.props['aria-describedby'];
    assert.ok(helpId);
    const help = root.findByProps({ id: helpId });
    assert.equal(help.type, 'p');
    assert.match(help.props.className, /font-normal normal-case tracking-normal/);
    assert.equal(root.findByProps({ htmlFor: select.props.id }).type, 'label');
    return help.children.join('');
};

test('legendas RPPS acompanham os quatro códigos e mudanças de seleção', () => {
    const tree = create(React.createElement(PensionRegimeSelect, { value: 'antigo', onChange: () => {} }));
    const originalId = tree.root.findByType('select').props.id;
    for (const regimePrev of ['antigo', 'novo_antigo', 'migrado', 'rpc'] as const) {
        act(() => tree.update(React.createElement(PensionRegimeSelect, { value: regimePrev, onChange: () => {} })));
        const select = tree.root.findByType('select');
        assert.equal(select.props.id, originalId);
        assert.match(describedHelp(tree.root, select), pensionRegimeGroup(regimePrev) === 'antigo' ? /sem limitação ao teto do INSS/ : /até o teto do INSS. Você continua no RPPS/);
    }
    tree.unmount();
});

test('legendas Funpresp acompanham cada participação sem alterar restrições', () => {
    const changes: any[] = [];
    const tree = create(React.createElement(PensionParticipationSelect, { value: 'nao', onChange: value => changes.push(value) }));
    for (const [value, expected] of [['nao', /Não há desconto/], ['patrocinado', /ultrapassa o teto do INSS/], ['vinculado', /O órgão não faz contribuição correspondente/]] as const) {
        act(() => tree.update(React.createElement(PensionParticipationSelect, { value, sponsoredDisabled: true, onChange: next => changes.push(next) })));
        const select = tree.root.findByType('select');
        assert.match(describedHelp(tree.root, select), expected);
        assert.equal(tree.root.findAllByType('option').find(o => o.props.value === 'patrocinado')?.props.disabled, true);
    }
    act(() => tree.root.findByType('select').props.onChange({ target: { value: 'nao' } }));
    assert.deepEqual(changes, ['nao']);
    tree.unmount();
});

test('legendas mensais e de múltiplos retroativos são independentes e têm ids únicos', () => {
    const input = state({ regimePrev: 'rpc', funprespParticipacao: 'patrocinado', pensionRetroEntries: [
        { id: 'a', competencia: '2025-07', regimePrev: 'antigo', participacao: 'vinculado' },
        { id: 'b', competencia: '2025-08', regimePrev: 'migrado', participacao: 'nao' },
    ] });
    const render = (current: CalculatorState) => React.createElement(React.Fragment, null,
        React.createElement(DynamicPayrollTaxSection, { state: current, styles: {}, update: () => {}, handleRegimePrevChange: () => {},
            showFunprespSection: true, previdenciaComplementar: config, funprespNormalOptions: [.03], handleFunprespParticipacaoChange: () => {} }),
        React.createElement(PensionRetroForm, { state: current, styles: {}, pssTableOptions: [], update: () => {} }));
    const tree = create(render(input));
    const selectors = tree.root.findAllByType('select').filter(select => select.props['aria-describedby']);
    assert.equal(selectors.length, 6);
    assert.equal(new Set(selectors.map(select => select.props.id)).size, 6);
    assert.equal(new Set(selectors.map(select => select.props['aria-describedby'])).size, 6);
    for (const select of selectors) describedHelp(tree.root, select);
    const retro = tree.root.findByType(PensionRetroForm);
    const before = retro.findAllByType('p').map(p => p.children.join(''));
    act(() => tree.update(render({ ...input, regimePrev: 'antigo', funprespParticipacao: 'nao' })));
    assert.deepEqual(tree.root.findByType(PensionRetroForm).findAllByType('p').map(p => p.children.join('')), before);
    assert.equal(tree.root.findByType(DynamicPayrollTaxSection).findByType(PensionParticipationSelect).props.value, 'nao');
    tree.unmount();
});
