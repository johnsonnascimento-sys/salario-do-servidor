import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig } from '../src/types';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { useCalculator } from '../src/hooks/useCalculator';
import { CALCULATOR_DRAFT_STORAGE_KEY } from '../src/constants/storage';
import { hydrateCalculatorState } from '../src/utils/calculatorState';
import { syntheticPensionCatalog, syntheticPensionOption } from './fixtures/syntheticPensionCatalog';

const config: CourtConfig = {
    bases: { salario: { teste: { A1: 6000 } }, funcoes: {} },
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } },
    historico_ir: { teste: 100 }, historico_ir_brackets: { teste: [{ min: 0, max: Infinity, rate: .2, deduction: 100 }] },
    historico_ir_metadata: { teste: { validFrom: '2026-01-01', reference: 'Synthetic IR-EA fixture',
        rra: { reductionApplicable: false, deductDependents: false, deductComplementaryPension: true } } }, values: {},
    payrollRules: { gajRate: .5, specificGratificationRate: .1, vrRateOnCj1: .1, monthDayDivisor: 30,
        overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: .06, irrfTopRate: .2 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    previdenciaComplementar: { rubricCatalog: syntheticPensionCatalog, enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
        sponsoredRate: { min: .065, max: .085, step: .005, defaultRpc: .085 }, facultativeRate: { minIfPositive: .025, default: 0 } },
};
const agency = { slug: 'jmu', name: 'JMU', type: 'judiciary' };
const initial = (): CalculatorState => ({ ...INITIAL_STATE, nome: 'Teste', anoRef: 2026, mesRef: 'SETEMBRO',
    cargo: 'teste', padrao: 'A1', funcao: '0', tabelaPSS: 'teste', tabelaIR: 'teste', regimePrev: 'rpc',
    funprespParticipacao: 'patrocinado', funprespAliq: .085, funprespRevisarOpcoes: false,
    irEaContext: { mesPagamento: '2026-09' } });
const rubric = { ...syntheticPensionOption, id: 'historica', descricao: 'Crédito histórico', valor: 1000, tipo: 'C' as const,
    competenciasEA: ['2025-07'], incideIR: true, incidePSS: false, isEA: true, pssCompetenciaSeparada: false,
    incideFunpresp: true, funprespCompetenciaSeparada: true };

test('pending history replaces ready output, preserves inputs and precedes monthly selection errors', async () => {
    const engine = new AgencyCalculationEngine();
    let state = initial();
    let latest!: ReturnType<typeof useCalculatorResults>;
    function Probe() { latest = useCalculatorResults(state, engine, config, agency); return null; }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'ready');
    const priorMemory = latest.calculatedState.pensionMemory;
    assert.ok(priorMemory);
    state = { ...state, manualFerias: true, ferias1_3: 123, manualAdiant13: true, adiant13Venc: 456,
        pensionMemory: priorMemory, liquido: 99999,
        regimePrev: 'antigo', // incompatible with today's sponsored selection, but history takes priority
        rubricasExtras: [rubric], pensionRetroEntries: [{ id: 'alheio', competencia: '2025-01', modo: 'manual',
            justificativa: 'Ajuste sem vínculo', ajusteComplementar: 0 }] };
    const preserved = structuredClone(state);
    await act(async () => { tree.update(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'pension_pending');
    assert.equal(latest.calculationError, null);
    assert.deepEqual(latest.calculationPending?.rubricaIds, ['historica']);
    assert.equal(latest.pensionContexts?.requiresChoice, false);
    assert.deepEqual(latest.resultRows, []);
    assert.equal(latest.calculatedState.pensionMemory, undefined);
    assert.deepEqual(latest.calculatedState.rubricasTax, {});
    assert.equal(latest.calculatedState.liquido, 0);
    assert.equal(latest.calculatedState.ferias1_3, 123);
    assert.equal(latest.calculatedState.adiant13Venc, 456);
    assert.deepEqual(state, preserved);
    assert.deepEqual(hydrateCalculatorState(JSON.parse(JSON.stringify(state))).rubricasExtras, [rubric]);
    state = { ...initial(), rubricasExtras: [{ ...rubric, incideFunpresp: false }] };
    await act(async () => { tree.update(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'ready');
    assert.equal(latest.calculationPending, null);
    assert.ok(latest.resultRows.length > 0);
    await act(async () => tree.unmount());
});

test('an earlier asynchronous result cannot replace a newer pending assessment', async () => {
    let resolve!: (value: any) => void;
    const engine = { calculateTotal: () => new Promise(done => { resolve = done; }) } as unknown as AgencyCalculationEngine;
    let state = initial();
    let latest!: ReturnType<typeof useCalculatorResults>;
    function Probe() { latest = useCalculatorResults(state, engine, config, agency); return null; }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'calculating');
    state = { ...state, rubricasExtras: [rubric] };
    await act(async () => { tree.update(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'pension_pending');
    await act(async () => { resolve({ netSalary: 99999, totalDeductions: 0, breakdown: {} }); });
    assert.equal(latest.calculationStatus, 'pension_pending');
    assert.deepEqual(latest.resultRows, []);
    await act(async () => tree.unmount());
});

test('real calculator blocks save, export and download while keeping draft inputs and saved snapshot', async () => {
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
        configuration: { agency, agencyService: new AgencyCalculationEngine(), courtConfig: config,
            loadingAgency: false, loadingConfig: false, configError: null, agencyError: null },
    };
    let latest!: ReturnType<typeof useCalculator>;
    function Probe() { latest = useCalculator(); return null; }
    let tree!: ReturnType<typeof create>;
    try {
        await act(async () => { tree = create(React.createElement(Probe)); });
        await act(async () => { latest.setState(initial()); });
        assert.equal(latest.calculationReady, true);
        latest.initiateExportPDF(); latest.initiateExportExcel(); latest.handleDonationComplete();
        let saved: Awaited<ReturnType<typeof latest.saveCurrentPayslip>>;
        await act(async () => { saved = await latest.saveCurrentPayslip(); });
        assert.equal(saved!.success, true);
        assert.equal(io.exports, 2); assert.equal(io.downloads, 1); assert.equal(io.writes, 1);
        const originalSaved = JSON.stringify(io.saved);
        await act(async () => { latest.setState(prev => ({ ...prev, rubricasExtras: [rubric] })); });
        assert.equal(latest.calculationStatus, 'pension_pending');
        assert.equal(latest.calculationReady, false);
        latest.initiateExportPDF(); latest.initiateExportExcel(); latest.handleDonationComplete();
        assert.deepEqual(await latest.saveCurrentPayslip(), { success: false, reason: 'calculation' });
        assert.equal(io.exports, 2); assert.equal(io.downloads, 1); assert.equal(io.writes, 1);
        assert.equal(JSON.stringify(io.saved), originalSaved);
        assert.deepEqual(latest.resultRows, []);
        assert.deepEqual(JSON.parse(storage.get(CALCULATOR_DRAFT_STORAGE_KEY)!).rubricasExtras, [rubric]);
    } finally {
        if (tree) await act(async () => tree.unmount());
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
        delete (globalThis as any).__pensionPendingIO;
    }
});
