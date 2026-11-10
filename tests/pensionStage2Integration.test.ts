import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig, type PrevidenciaComplementarConfig } from '../src/types';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { applyCalculatorPatch, hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { buildPensionAuditRows } from '../src/utils/pensionExport';
import { useCalculator } from '../src/hooks/useCalculator';
import { CALCULATOR_DRAFT_STORAGE_KEY } from '../src/constants/storage';
import { syntheticPensionCatalog, syntheticPensionOption } from './fixtures/syntheticPensionCatalog';

// All amounts, rates and sources in this fixture are synthetic; production configuration is never accessed.
const complementary: PrevidenciaComplementarConfig = { rubricCatalog: syntheticPensionCatalog, enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps',
    includeThirteenth: true, sponsoredRate: { min: .05, max: .09, step: .005, defaultRpc: .085 },
    facultativeRate: { minIfPositive: .025, default: 0 } };
const configuration = (): CourtConfig => ({ bases: { salario: { teste: { A1: 6000 } }, funcoes: {} }, values: {},
    historico_pss: { atual: { teto_rgps: 8000, faixas: [{ min: 0, max: 100000, rate: .1 }] },
        original: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } }, historico_ir: { teste: 100 },
    historico_ir_brackets: { teste: [{ min: 0, max: Infinity, rate: .2, deduction: 100 }] },
    historico_ir_metadata: { teste: { validFrom: '2026-01-01', reference: 'Synthetic IR-EA fixture',
        rra: { reductionApplicable: false, deductDependents: false, deductComplementaryPension: true } } },
    payrollRules: { gajRate: .5, specificGratificationRate: .1, vrRateOnCj1: .1, monthDayDivisor: 30,
        overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: .06, irrfTopRate: .2 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    previdenciaComplementar: { ...complementary, historicalRules: [{ id: 'rule-original', validFrom: '2025-01',
        validTo: '2026-01', source: 'https://example.test/historical-rule', tabelaPSS: 'original', configuration: complementary }] },
});
const initial = (): CalculatorState => ({ ...INITIAL_STATE, nome: 'Teste', cargo: 'teste', padrao: 'A1', funcao: '0',
    anoRef: 2026, mesRef: 'SETEMBRO', tabelaPSS: 'atual', tabelaIR: 'teste', regimePrev: 'antigo',
    funprespParticipacao: 'nao', funprespAliq: .085, funprespRevisarOpcoes: false,
    irEaContext: { mesPagamento: '2026-09' },
    rubricasExtras: [{ ...syntheticPensionOption, id: 'historica', descricao: 'Crédito histórico', tipo: 'C', valor: 1000,
        competenciasEA: ['2025-07'], incideIR: false, isEA: true, incidePSS: false, pssCompetenciaSeparada: false,
        incideFunpresp: true, funprespCompetenciaSeparada: true }],
    pensionRetroEntries: [{ id: 'retro', competencia: '2025-07', modo: 'completo', tipo: 'mensal', destinoIR: 'ea',
        tabelaPSS: 'original', regimePrev: 'rpc', participacao: 'patrocinado', regraHistoricaId: 'rule-original',
        vinculos: [{ rubricaId: 'historica', valor: 1000 }], baseRppsOriginal: 4500, baseComplementarOriginal: 4500,
        contribuicaoRppsRecolhida: 450, contribuicaoComplementarRecolhida: 0, aliquotaNormal: .06, aliquotaFacultativa: 0 }],
});
const agency = { slug: 'jmu', name: 'JMU', type: 'judiciary' };

test('catalog and mid-month protocol pending can be corrected explicitly without losing current participation', async () => {
    const config = configuration();
    let state = { ...initial(), regimePrev: 'rpc', funprespParticipacao: 'patrocinado', pensionRetroEntries: [],
        rubricasExtras: [{ ...initial().rubricasExtras[0], funprespCompetenciaSeparada: false,
            pensionRubricId: undefined, pensionOptionDate: '2026-09-20', pensionOptionAmountConfirmed: false }] } as CalculatorState;
    let latest!: ReturnType<typeof useCalculatorResults>;
    // Keep the engine stable across renders, as in the application.
    const engine = new AgencyCalculationEngine();
    function StableProbe() { latest = useCalculatorResults(state, engine, config, agency); return null; }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(StableProbe)); });
    assert.equal(latest.calculationStatus, 'pension_pending');
    assert.equal(latest.pensionContexts?.requiresChoice, false);
    assert.equal(state.funprespParticipacao, 'patrocinado');
    state = { ...state, rubricasExtras: state.rubricasExtras.map(row => ({ ...row, pensionRubricId: 'fixture_optional' })) };
    await act(async () => tree.update(React.createElement(StableProbe)));
    assert.equal(latest.calculationStatus, 'pension_pending');
    state = { ...state, rubricasExtras: state.rubricasExtras.map(row => ({ ...row, pensionOptionAmountConfirmed: true })) };
    await act(async () => tree.update(React.createElement(StableProbe)));
    assert.equal(latest.calculationStatus, 'ready', latest.calculationPending?.message ?? latest.calculationError ?? '');
    const audit = buildPensionAuditRows(latest.calculatedState.pensionMemory);
    assert.ok(audit.some(([label, value]) => label === 'Data da opção expressa' && value === '2026-09-20'));
    assert.deepEqual(latest.calculatedState.pensionMemory?.mensal.enquadramentos?.map(item => item.ruleId), ['fixture_optional']);
    await act(async () => tree.unmount());
});

test('monthly changes do not silently populate missing historical choices in linked drafts', () => {
    const state = initial();
    delete state.pensionRetroEntries![0].regimePrev;
    delete state.pensionRetroEntries![0].participacao;
    const before = structuredClone(state);
    const patched = applyCalculatorPatch(state, { regimePrev: 'rpc', funprespParticipacao: 'patrocinado' });
    assert.equal(patched.pensionRetroEntries![0].regimePrev, undefined);
    assert.equal(patched.pensionRetroEntries![0].participacao, undefined);
    assert.deepEqual(state, before);
    const hydrated = hydrateCalculatorState(JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(patched))));
    assert.deepEqual(hydrated.pensionRetroEntries, patched.pensionRetroEntries);
    hydrated.pensionRetroEntries![0].vinculos![0].valor = 1;
    assert.equal(patched.pensionRetroEntries![0].vinculos![0].valor, 1000);
});

test('real hook resolves history with explicit past participation, invalidates edits and keeps source audit', async () => {
    const engine = new AgencyCalculationEngine();
    let config = configuration();
    let state = initial();
    const pristine = structuredClone(state);
    let latest!: ReturnType<typeof useCalculatorResults>;
    function Probe() { latest = useCalculatorResults(state, engine, config, agency); return null; }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? latest.calculationPending?.message);
    const memory = latest.calculatedState.pensionMemory!;
    assert.equal(memory.mensal.participacao, 'nao');
    assert.equal(memory.retroativos[0].complementar, 30);
    assert.equal(memory.retroativos[0].rpps, 0);
    assert.equal(memory.retroativos[0].baseComplementarDevida, 5500);
    assert.equal(memory.retroativos[0].regraHistoricaId, 'rule-original');
    assert.deepEqual(state, pristine);
    const audit = buildPensionAuditRows(memory);
    assert.ok(audit.some(([label, value]) => label === 'Rubrica vinculada (ID)' && value === 'historica'));
    assert.ok(audit.some(([label, value]) => label === 'Fonte histórica' && value === 'https://example.test/historical-rule'));
    assert.equal(audit.some(([, value]) => String(value).includes('[object Object]')), false);
    const credits = latest.resultRows.filter(row => row.type === 'C').reduce((sum, row) => sum + row.value, 0);
    const debits = latest.resultRows.filter(row => row.type === 'D').reduce((sum, row) => sum + row.value, 0);
    assert.equal(Math.round((credits - debits) * 100), Math.round(latest.calculatedState.liquido * 100));

    state = { ...state, rubricasExtras: state.rubricasExtras.map(row => ({ ...row, valor: 1001 })) };
    await act(async () => { tree.update(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'pension_pending');
    assert.deepEqual(latest.resultRows, []);
    assert.equal(latest.calculatedState.pensionMemory, undefined);
    state = pristine;
    await act(async () => { tree.update(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'ready');
    config = { ...config, previdenciaComplementar: { ...config.previdenciaComplementar!, historicalRules: [] } };
    await act(async () => { tree.update(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'pension_pending');
    assert.equal(latest.calculationError, null);
    assert.deepEqual(latest.resultRows, []);
    assert.equal(state.pensionRetroEntries![0].participacao, 'patrocinado');
    await act(async () => tree.unmount());
});

test('completed linked history can be saved and exported; subsequent incomplete edits cannot replace it', async () => {
    const storage = new Map<string, string>();
    const previousStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
    } });
    const io = (globalThis as any).__pensionPendingIO = {
        location: { state: null, search: '?editPayslipId=saved', pathname: '/calculadora/jmu' },
        user: { id: 'teste', user_metadata: {} }, exports: 0, downloads: 0, writes: 0, saved: null,
        configuration: { agency, agencyService: new AgencyCalculationEngine(), courtConfig: configuration(),
            loadingAgency: false, loadingConfig: false, configError: null, agencyError: null },
    };
    let latest!: ReturnType<typeof useCalculator>;
    function Probe() { latest = useCalculator(); return null; }
    let tree!: ReturnType<typeof create>;
    try {
        await act(async () => { tree = create(React.createElement(Probe)); });
        const incomplete = initial();
        incomplete.pensionRetroEntries![0].vinculos = [];
        await act(async () => { latest.setState(incomplete); });
        assert.equal(latest.calculationReady, false);
        assert.equal(latest.calculationStatus, 'pension_pending');
        await act(async () => { latest.setState(initial()); });
        assert.equal(latest.calculationReady, true);
        let result: Awaited<ReturnType<typeof latest.saveCurrentPayslip>>;
        await act(async () => { result = await latest.saveCurrentPayslip(); });
        assert.equal(result!.success, true);
        assert.equal(io.writes, 1);
        assert.deepEqual(io.saved.calculator_state.pensionRetroEntries[0].vinculos, [{ rubricaId: 'historica', valor: 1000 }]);
        assert.equal(io.saved.calculator_state.pensionMemory.retroativos[0].fonteHistorica, 'https://example.test/historical-rule');
        latest.initiateExportPDF(); latest.handleDonationComplete();
        assert.equal(io.exports, 1); assert.equal(io.downloads, 1);
        const saved = JSON.stringify(io.saved);
        await act(async () => { latest.updateRubrica('historica', 'valor', 1001); });
        assert.equal(latest.calculationStatus, 'pension_pending');
        latest.initiateExportExcel(); latest.handleDonationComplete();
        assert.deepEqual(await latest.saveCurrentPayslip(), { success: false, reason: 'calculation' });
        assert.equal(io.writes, 1); assert.equal(io.exports, 1); assert.equal(io.downloads, 1);
        assert.equal(JSON.stringify(io.saved), saved);
        const draft = JSON.parse(storage.get(CALCULATOR_DRAFT_STORAGE_KEY)!);
        assert.equal(draft.rubricasExtras[0].valor, 1001);
        assert.equal(draft.pensionRetroEntries[0].vinculos[0].valor, 1000);
    } finally {
        if (tree) await act(async () => tree.unmount());
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
        delete (globalThis as any).__pensionPendingIO;
    }
});
