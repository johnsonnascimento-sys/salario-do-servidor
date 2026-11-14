import { getPensionErrorFeedback } from '../src/utils/pensionFeedback';
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
test('rubrica histórica oferece cadastramento de competência sem preencher dados históricos automaticamente', () => {
    const calls: any[] = [];
    const tree = create(React.createElement(PensionRetroForm, { state: state({ rubricasExtras: [{ id: 'retro', descricao: 'Retroativo', tipo: 'C', valor: 100, incideIR: false, incidePSS: false, isEA: false, incideFunpresp: true, funprespCompetenciaSeparada: true }] }), styles: {}, pssTableOptions: [], update: (key, value) => calls.push([key, value]) }));
    const add = tree.root.findAllByType('button').find(button => button.children.join('') === 'Adicionar competência');
    assert.ok(add);
    act(() => add!.props.onClick());
    assert.equal(calls[0][0], 'pensionRetroEntries');
    assert.equal(calls[0][1][0].competencia, '');
    assert.deepEqual(calls[0][1][0].vinculos, []);
    assert.equal(calls[0][1][0].regimePrev, undefined);
    assert.equal(calls[0][1][0].participacao, undefined);
    tree.unmount();
});

test('modalidade incompatível fica bloqueada sem alerta ou botão de resolução', () => {
 const calls: any[] = [];
 const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: state({funprespParticipacao:'patrocinado'}), update:()=>{},
 handleRegimePrevChange:value=>calls.push(value), showFunprespSection:true, previdenciaComplementar:config, funprespNormalOptions:[.03],
 handleFunprespParticipacaoChange:()=>{}, selectionRequired:true }));
 assert.equal(tree.root.findAllByType('option').find(o=>o.props.value==='patrocinado')?.props.disabled,true);
 assert.equal(tree.root.findAllByType('button').length,0);
 assert.equal(tree.root.findAllByType('dialog').length,0);
 assert.equal(tree.root.findAllByProps({role:'alert'}).length,0);
 assert.deepEqual(calls,[]);tree.unmount();
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
    const input = state({ regimePrev: 'rpc', pensionRetroEntries: [{ id: 'r', competencia: '2025-07', regimePrev: 'novo_antigo' }] });
    const tree = create(React.createElement(PensionRetroForm, { state: input, styles: {}, pssTableOptions: [], update: () => {} }));
    assert.equal(tree.root.findByType(PensionRegimeSelect).props.value, 'novo_antigo');
    assert.equal(tree.root.findByType(PensionRegimeSelect).props.disabled, true);
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

test('configuração desabilitada permite revisão de flags sem botão de escolha', () => {
    const calls: any[] = [];
    const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: state({ funprespIncluirFC: true }),
        update: (key, value) => calls.push([key, value]), handleRegimePrevChange: () => {}, showFunprespSection: false,
        previdenciaComplementar: undefined, funprespNormalOptions: [], handleFunprespParticipacaoChange: () => {},
        selectionRequired: true }));
    const reset = tree.root.findAllByType('input').find(input => input.props.type === 'checkbox' && input.props.checked)!;
    act(() => reset.props.onChange({ target: { checked: false } }));
    assert.equal(tree.root.findAllByType('button').length, 0);
    assert.deepEqual(calls, [['funprespIncluirFC', false]]);
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


test('URP orienta o mínimo e máximo sem substituir valores nem restaurar resumo anterior', () => {
    const calls: any[] = [];
    const input = state({ funprespParticipacao: 'vinculado', funprespAliq: .06,
        funprespVinculadaInicio: '2026-06', funprespBaseIntegral: 20 });
    const hook = renderHook(input);
    assert.match(hook.value.funprespValidationError!, /mínimo.*24,00/);
    const props = { styles: {}, state: input, update: (key: any, value: any) => calls.push([key, value]),
        handleRegimePrevChange: () => {}, showFunprespSection: true, previdenciaComplementar: config,
        funprespNormalOptions: [.06], handleFunprespParticipacaoChange: () => {},
        pensionContext: { base: 100, teto: 1000, regimePrev: 'antigo' as const, allowed: ['nao', 'vinculado'] as any, unavailableReasons: {}, componentes: {} },
        calculationReady: false };
    const tree = create(React.createElement(DynamicPayrollTaxSection, props));
    const amount = tree.root.findAllByType('input').find(input => input.props['aria-describedby'] === 'funpresp-urp-reference')!;
    assert.equal(amount.props.value, 20);
    assert.equal(amount.props['aria-invalid'], true);
    assert.ok(JSON.stringify(tree.toJSON()).includes('2026-06'));
    assert.match(tree.root.findByProps({ role: 'alert' }).children.join(''), /mínimo.*24,00/);
    act(() => tree.update(React.createElement(DynamicPayrollTaxSection, { ...props, state: { ...input, funprespBaseIntegral: 101 } })));
    assert.match(tree.root.findByProps({ role: 'alert' }).children.join(''), /exceder.*100,00/);
    act(() => tree.update(React.createElement(DynamicPayrollTaxSection, { ...props, state: { ...input, funprespBaseIntegral: 24 } })));
    assert.equal(tree.root.findAllByProps({ role: 'alert' }).length, 0);
    assert.equal(tree.root.findAllByProps({ 'aria-label': 'Resumo compartilhado da Funpresp' }).length, 0);
    assert.deepEqual(calls, []);
    tree.unmount(); hook.tree.unmount();
});


test('falta de tabela é apresentada como atualização do site, sem invalidar a entrada ou abrir opções adicionais', () => {
    const input = state({ funprespParticipacao: 'vinculado', funprespAliq: .06, funprespBaseIntegral: 3000, funprespVinculadaInicio: '2026-11', mesRef: 'NOVEMBRO' });
    const engineError = 'Previdência: modalidade vinculada exige URP e fonte oficial da competência 2026-11; parâmetro ausente ou inválido.';
    const calls: any[] = [];
    const tree = create(React.createElement(DynamicPayrollTaxSection, { styles: {}, state: input,
        update: (...args) => calls.push(args), handleRegimePrevChange: () => {}, showFunprespSection: true,
        previdenciaComplementar: config, funprespNormalOptions: [.06], handleFunprespParticipacaoChange: () => {}, calculationError: engineError }));
    const notice = tree.root.findByProps({ role: 'status', id: 'funpresp-urp-reference' });
    assert.match(JSON.stringify(tree.toJSON()), /equipe do site/);
    assert.equal(tree.root.findAllByType('button').some(button => button.children.join('') === 'Usar menor base permitida'), false);
    const amount = tree.root.findAllByType('input').find(input => input.props['aria-describedby'] === 'funpresp-urp-reference')!;
    assert.equal(amount.props['aria-invalid'], false);
    assert.equal(amount.props.value, 3000);
    const extras = tree.root.findAllByType('details').find(details => details.findAllByType('summary').some(summary => summary.children.join('').includes('Opções adicionais')))!;
    assert.equal(extras.props.open, false);
    assert.deepEqual(calls, []);
    tree.unmount();
});

test('usar menor base é uma ação explícita e altera somente o valor escolhido', () => {
    const calls: any[] = [];
    const input = state({ funprespParticipacao: 'vinculado', funprespAliq: .06, funprespVinculadaInicio: '2026-06', funprespBaseIntegral: 500 });
    const props = { styles: {}, state: input, update: (...args: any[]) => calls.push(args),
        handleRegimePrevChange: () => {}, showFunprespSection: true, previdenciaComplementar: config,
        funprespNormalOptions: [.06], handleFunprespParticipacaoChange: () => {},
        pensionContext: { base: 1000, teto: 5000, regimePrev: 'antigo' as const, allowed: ['nao','vinculado'] as any, unavailableReasons: {}, componentes: {} } };
    const tree = create(React.createElement(DynamicPayrollTaxSection, props));
    assert.deepEqual(calls, []);
    act(() => tree.root.findAllByType('button').find(button => button.children.join('') === 'Usar menor base permitida')!.props.onClick());
    assert.deepEqual(calls, [['funprespBaseIntegral', 24]]);
    act(() => tree.update(React.createElement(DynamicPayrollTaxSection, { ...props, pensionContext: { ...props.pensionContext, base: 20 } })));
    assert.equal(tree.root.findAllByType('button').some(button => button.children.join('') === 'Usar menor base permitida'), false);
    tree.unmount();
});

test('feedback usa mês legível e preserva erros não reconhecidos para a apresentação original', () => {
    const detail = 'Previdência: modalidade vinculada exige URP e fonte oficial da competência 2026-11; parâmetro ausente ou inválido.';
    const feedback = getPensionErrorFeedback(detail)!;
    assert.equal(feedback.configuration, true);
    assert.match(feedback.message, /novembro de 2026/);
    assert.equal(getPensionErrorFeedback('Previdência: tabela histórica de RPPS indisponível.'), null);
    assert.equal(getPensionErrorFeedback('Apuração pendente (2026-11): ' + detail), null);
    assert.equal(getPensionErrorFeedback(null), null);
    assert.equal(getPensionErrorFeedback('informe o início da participação vinculada (inscrição ou eleição da base), anterior ou igual à competência.')?.configuration, false);
});
