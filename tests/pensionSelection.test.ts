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

test('troca de regime aplica enquadramento e limpa modalidade incompatível em um patch, sem diálogo', () => {
    const params = paramsFor();
    const context = buildPensionContext(params, 9000);
    const patches: any[] = [];
    let selection!: ReturnType<typeof usePensionSelection>;
    const Probe = () => { selection = usePensionSelection({ params, context, onApply: p => patches.push(p) }); return null; };
    const hook = create(React.createElement(Probe));
    act(() => selection.handleRegimeChange('antigo'));
    assert.deepEqual(patches, [{ regimePrev: 'antigo', funprespParticipacao: 'nao' }]);
    assert.equal(hook.root.findAllByType('dialog').length, 0);
    hook.unmount();
});

test('vinculada permitida pode ser selecionada antes de preencher os dados no formulário', () => {
    const params = paramsFor(state({ regimePrev: 'antigo', funprespParticipacao: 'nao' }));
    const context = buildPensionContext(params, 9000);
    const patches: any[] = [];
    let selection!: ReturnType<typeof usePensionSelection>;
    const Probe = () => { selection = usePensionSelection({ params, context, onApply: p => patches.push(p) }); return null; };
    const hook = create(React.createElement(Probe));
    act(() => selection.handleParticipationChange('vinculado'));
    assert.deepEqual(patches, [{ funprespParticipacao: 'vinculado' }]);
    assert.equal(hook.root.findAllByType('dialog').length, 0);
    hook.unmount();
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

test('restauração incompatível limpa somente participação sem abrir diálogo', () => {
    const params = paramsFor(state({ regimePrev: 'antigo' }));
    const context = buildPensionContext(params, 9000);
    const changes: any[] = [];
    const Probe = () => { usePensionSelection({ params, context, onApply: p => changes.push(p) }); return null; };
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(React.createElement(Probe)); });
    assert.deepEqual(changes, [{ funprespParticipacao: 'nao' }]);
    assert.equal(tree.root.findAllByType('dialog').length, 0);
    assert.equal(params.funprespParticipacao, 'patrocinado'); // original snapshot untouched
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


test('mudança salarial normaliza seleção e retoma cálculo sem intervenção', async () => {
    const engine = new AgencyCalculationEngine();
    let setInput!: React.Dispatch<React.SetStateAction<CalculatorState>>;
    let latest!: ReturnType<typeof useCalculatorResults>;
    let current!: CalculatorState;
    const Probe = () => {
        const [input, setState] = React.useState(state());
        current = input; setInput = setState;
        latest = useCalculatorResults(input, engine, config, { slug: 'teste', name: 'Teste', type: 'judiciary' });
        usePensionSelection({ params: paramsFor(input), context: latest.pensionContexts?.monthly ?? null,
            onApply: patch => setState(previous => applyCalculatorPatch(previous, patch)) });
        return null;
    };
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'ready');
    await act(async () => { setInput(previous => ({ ...previous, padrao: 'A2' })); });
    assert.equal(current.funprespParticipacao, 'nao');
    assert.equal(current.regimePrev, 'rpc');
    assert.equal(current.padrao, 'A2');
    assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
    await act(async () => { setInput(previous => ({ ...previous, funprespParticipacao: 'vinculado',
        funprespAliq: .06, funprespBaseIntegral: 50, funprespVinculadaInicio: '2026-06' })); });
    assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
    await act(async () => { setInput(previous => ({ ...previous, padrao: 'A1' })); });
    assert.equal(current.funprespParticipacao, 'nao');
    assert.equal(current.funprespBaseIntegral, 50);
    assert.equal(current.funprespVinculadaInicio, '2026-06');
    assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
    assert.equal(tree.root.findAllByType('dialog').length, 0);
    tree.unmount();
});

test('enquadramentos legados e modalidades válidas não sofrem correção no carregamento', () => {
    for (const regimePrev of ['antigo', 'novo_antigo', 'migrado', 'rpc'] as const) {
        const params = paramsFor(state({ regimePrev, funprespParticipacao: 'nao' }));
        const patches: any[] = [];
        const Probe = () => { usePensionSelection({ params, context: buildPensionContext(params, 9000), onApply: p => patches.push(p) }); return null; };
        let tree!: ReturnType<typeof create>;
        act(() => { tree = create(React.createElement(Probe)); });
        assert.deepEqual(patches, []);
        tree.unmount();
    }
});
