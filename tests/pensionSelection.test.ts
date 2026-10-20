import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig } from '../src/types';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { buildPensionContext } from '../src/services/agency/engine/modules/pensionContext';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { applyCalculatorPatch } from '../src/utils/calculatorState';
import { usePensionSelection } from '../src/components/Calculator/hooks/usePensionSelection';
import { PensionChoiceDialog } from '../src/components/Calculator/PensionChoiceDialog';
import { PensionParticipationSelect } from '../src/components/Calculator/PensionParticipationSelect';

const config: CourtConfig = {
    bases: { salario: { teste: { A1: 6000, A2: 2000 } }, funcoes: {} },
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } },
    historico_ir: { teste: 100 }, values: {},
    payrollRules: { gajRate: .5, specificGratificationRate: .1, vrRateOnCj1: .1, monthDayDivisor: 30,
        overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: .06, irrfTopRate: .2 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    previdenciaComplementar: { enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
        sponsoredRate: { min: .02, max: .04, step: .01, defaultRpc: .03 }, linkedRate: { min: .05, max: .07, step: .01 },
        facultativeRate: { minIfPositive: .001, default: 0 }, minimumUrpUnits: 3,
        urpByCompetence: { '2026-06': 8 }, urpSourcesByCompetence: { '2026-06': 'fonte sintética' },
        incidenceRules: { fc: true, gas: true, gae: true, aqTreino: true } },
};
const state = (patch: Partial<CalculatorState> = {}): CalculatorState => ({ ...INITIAL_STATE,
    anoRef: 2026, mesRef: 'SETEMBRO', cargo: 'teste', padrao: 'A1', funcao: '0',
    tabelaPSS: 'teste', tabelaIR: 'teste', regimePrev: 'rpc', funprespParticipacao: 'patrocinado', funprespAliq: .03,
    funprespRevisarOpcoes: false, ...patch });
const paramsFor = (input = state()) => mapStateToAgencyParams(input, 'teste', config);

test('troca incompatível aguarda decisão; cancelar mantém estado e confirmar aplica patch único', () => {
    const params = paramsFor();
    const context = buildPensionContext(params, 9000);
    const patches: any[] = [];
    let selection!: ReturnType<typeof usePensionSelection>;
    const Probe = () => { selection = usePensionSelection({ params, context, onApply: p => patches.push(p) }); return null; };
    const hook = create(React.createElement(Probe));
    act(() => selection.handleRegimeChange('antigo'));
    assert.equal(patches.length, 0);
    assert.equal(selection.dialog?.params.regimePrev, 'antigo');
    act(() => selection.dialog!.onCancel());
    assert.equal(selection.dialog, null);
    assert.equal(params.regimePrev, 'rpc');
    act(() => selection.handleRegimeChange('antigo'));
    const tree = create(React.createElement(PensionChoiceDialog, selection.dialog!));
    assert.equal(tree.root.findAllByType('input').filter(i => i.props.type === 'radio').every(i => !i.props.checked), true);
    assert.equal(tree.root.findAllByType('button').find(b => b.props.type === 'submit')?.props.disabled, true);
    const linked = tree.root.findAllByType('input').find(i => i.props.value === 'vinculado')!;
    act(() => linked.props.onChange());
    assert.equal(tree.root.findByType('select').props.value, ''); // .03 is not in the linked grade.
    assert.equal(tree.root.findAllByType('button').find(b => b.props.type === 'submit')?.props.disabled, true);
    act(() => {
        tree.root.findByType('select').props.onChange({ target: { value: '.06' } });
        tree.root.findAllByType('input').find(i => i.props.type === 'number')!.props.onChange({ target: { value: '50' } });
        tree.root.findAllByType('input').find(i => i.props.type === 'month')!.props.onChange({ target: { value: '2026-06' } });
    });
    assert.equal(tree.root.findAllByType('button').find(b => b.props.type === 'submit')?.props.disabled, false);
    act(() => tree.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.deepEqual(patches, [{ regimePrev: 'antigo', funprespParticipacao: 'vinculado', funprespAliq: .06,
        funprespBaseIntegral: 50, funprespVinculadaInicio: '2026-06' }]);
    tree.unmount(); hook.unmount();
});

test('opções e eventos incompatíveis ou sem contexto não alteram a simulação', () => {
    const changes: any[] = [];
    const params = paramsFor();
    let context: ReturnType<typeof buildPensionContext> | null = buildPensionContext(params, 9000);
    let selection!: ReturnType<typeof usePensionSelection>;
    const Probe = () => { selection = usePensionSelection({ params, context, onApply: p => changes.push(p) }); return null; };
    const hook = create(React.createElement(Probe));
    act(() => selection.handleParticipationChange('vinculado'));
    assert.deepEqual(changes, []);
    const tree = create(React.createElement(PensionParticipationSelect, { value: 'patrocinado', allowed: context.allowed, onChange: p => changes.push(p) }));
    assert.equal(tree.root.findAllByType('option').find(o => o.props.value === 'vinculado')?.props.disabled, true);
    act(() => tree.root.findByType('select').props.onChange({ target: { value: 'vinculado' } }));
    context = null;
    act(() => hook.update(React.createElement(Probe)));
    act(() => { selection.handleRegimeChange('antigo'); selection.handleParticipationChange('nao'); });
    assert.deepEqual(changes, []);
    tree.unmount(); hook.unmount();
});

test('restauração incompatível abre guia sem corrigir dados; cancelamento permite reabertura', () => {
    const params = paramsFor(state({ regimePrev: 'antigo' }));
    const context = buildPensionContext(params, 9000);
    const changes: any[] = [];
    let selection!: ReturnType<typeof usePensionSelection>;
    const Probe = () => { selection = usePensionSelection({ params, context, onApply: p => changes.push(p) }); return null; };
    const tree = create(React.createElement(Probe));
    assert.ok(selection.dialog);
    assert.deepEqual(changes, []);
    act(() => selection.dialog!.onCancel());
    assert.equal(selection.dialog, null);
    assert.equal(selection.incompatible, true);
    act(() => selection.reopen());
    act(() => selection.dialog!.onConfirm({ funprespParticipacao: 'nao' }));
    assert.deepEqual(changes, [{ funprespParticipacao: 'nao', regimePrev: 'antigo' }]);
    tree.unmount();
});

test('alteração de base invalida modalidade antes do cálculo e remove resultados atuais', async () => {
    class CountingEngine extends AgencyCalculationEngine {
        calls = 0;
        override async calculateTotal(params: Parameters<AgencyCalculationEngine['calculateTotal']>[0]) { this.calls++; return super.calculateTotal(params); }
    }
    const engine = new CountingEngine();
    let current = state();
    let latest!: ReturnType<typeof useCalculatorResults>;
    const Probe = () => { latest = useCalculatorResults(current, engine, config, { slug: 'teste', name: 'Teste', type: 'judiciary' }); return null; };
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
    assert.equal(engine.calls, 1);
    current = { ...current, padrao: 'A2' };
    await act(async () => { tree.update(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'selection_required');
    assert.deepEqual(latest.pensionContexts?.monthly.allowed, ['nao', 'vinculado']);
    assert.equal(engine.calls, 1);
    assert.deepEqual(latest.resultRows, []);
    assert.equal(latest.calculationError, null);
    tree.unmount();
});

test('contexto antigo não substitui escolha mais recente em atualizações assíncronas', async () => {
    const engine = new AgencyCalculationEngine();
    let current = state({ padrao: 'A2' });
    let latest!: ReturnType<typeof useCalculatorResults>;
    const Probe = () => { latest = useCalculatorResults(current, engine, config, { slug: 'teste', name: 'Teste', type: 'judiciary' }); return null; };
    let tree!: ReturnType<typeof create>;
    await act(async () => {
        tree = create(React.createElement(Probe));
        await Promise.resolve();
        current = state();
        tree.update(React.createElement(Probe));
    });
    assert.equal(latest.pensionContexts?.monthly.base, 9000);
    assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
    tree.unmount();
});

test('patch mensal congela heranças históricas antigas sem alterar registros explícitos ou snapshot original', () => {
    const original = state({ pensionRetroEntries: [{ id: 'legado', competencia: '2025-07' },
        { id: 'explicito', competencia: '2025-08', regimePrev: 'novo_antigo', participacao: 'vinculado' }] });
    const changed = applyCalculatorPatch(original, { regimePrev: 'antigo', funprespParticipacao: 'nao' });
    assert.equal(changed.pensionRetroEntries[0].regimePrev, 'rpc');
    assert.equal(changed.pensionRetroEntries[0].participacao, 'patrocinado');
    assert.deepEqual(changed.pensionRetroEntries[1], original.pensionRetroEntries[1]);
    assert.equal(original.pensionRetroEntries[0].regimePrev, undefined);
});
