import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { useCalculatorConfig } from '../src/hooks/calculator/useCalculatorConfig';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { CalculatorState, CourtConfig, INITIAL_STATE } from '../src/types';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';

const config = { bases: { salario: {}, funcoes: {} }, values: {}, payrollRules: { vrRateOnCj1: 0 } } as CourtConfig;
const agency = { slug: 'jmu', name: 'JMU', type: 'judiciary' };
const deferred = () => {
    let resolve!: (value: any) => void, reject!: (reason?: any) => void;
    const promise = new Promise<any>((ok, fail) => { resolve = ok; reject = fail; });
    return { promise, resolve, reject };
};
const output = (netSalary: number) => ({ netSalary, totalDeductions: 0, breakdown: { vencimento: netSalary } });

 test('loading hooks: config delay, input invalidation, races, errors and manual inputs', async () => {
    const calls: Array<ReturnType<typeof deferred>> = [];
    const engine = { calculateTotal: () => { const d = deferred(); calls.push(d); return d.promise; } } as unknown as AgencyCalculationEngine;
    let latest!: ReturnType<typeof useCalculatorResults>;
    const renders: typeof latest[] = [];
    let state: CalculatorState = { ...INITIAL_STATE, manualFerias: true, ferias1_3: 123,
        manualAdiant13: true, adiant13Venc: 456, segunda13FC: 789 };
    function Probe({ court }: { court: CourtConfig | null }) {
        latest = useCalculatorResults(state, engine, court, agency);
        renders.push(latest); return null;
    }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe, { court: null })); });
    assert.equal(calls.length, 0);
    assert.equal(latest.calculationStatus, 'idle');
    assert.equal(latest.calculatedState.ferias1_3, 123);
    assert.equal(latest.calculatedState.adiant13Venc, 456);
    assert.equal(latest.calculatedState.segunda13FC, 789);
    await act(async () => { tree.update(React.createElement(Probe, { court: config })); });
    assert.equal(calls.length, 1);
    assert.equal(latest.calculationStatus, 'calculating');
    await act(async () => { calls[0].resolve(output(100)); });
    assert.equal(latest.calculationStatus, 'ready');
    assert.equal(latest.calculatedState.liquido, 100);
    assert.ok(latest.resultRows.length);
    state = { ...state, dependentes: 1 };
    const firstChangedRender = renders.length;
    await act(async () => { tree.update(React.createElement(Probe, { court: config })); });
    assert.equal(renders[firstChangedRender].calculationStatus, 'calculating');
    assert.deepEqual(renders[firstChangedRender].resultRows, []);
    assert.equal(renders[firstChangedRender].calculatedState.liquido, 0);
    state = { ...state, dependentes: 2 };
    await act(async () => { tree.update(React.createElement(Probe, { court: config })); });
    await act(async () => { calls[2].resolve(output(300)); calls[1].resolve(output(200)); });
    assert.equal(latest.calculatedState.liquido, 300);
    state = { ...state, dependentes: 3 };
    await act(async () => { tree.update(React.createElement(Probe, { court: config })); });
    await act(async () => { calls[3].reject(new Error('offline')); });
    assert.equal(latest.calculationStatus, 'error');
    assert.ok(latest.calculationError);
    assert.deepEqual(latest.resultRows, []);
    state = { ...state, dependentes: 4 };
    await act(async () => { tree.update(React.createElement(Probe, { court: config })); });
    await act(async () => { calls[4].resolve(output(400)); });
    assert.equal(latest.calculationStatus, 'ready');
    assert.equal(latest.calculationError, null);
    state = { ...state, mesRef: 'DEZEMBRO', anoRef: 2027 };
    const firstDateChangedRender = renders.length;
    await act(async () => { tree.update(React.createElement(Probe, { court: config })); });
    assert.equal(renders[firstDateChangedRender].calculationStatus, 'calculating');
    assert.deepEqual(renders[firstDateChangedRender].resultRows, []);
    assert.equal(renders[firstDateChangedRender].calculatedState.liquido, 0);
    await act(async () => { calls[5].resolve(output(500)); });
    assert.equal(latest.calculationStatus, 'ready');
    assert.equal(latest.calculatedState.liquido, 500);
    await act(async () => { tree.unmount(); });
});

test('config hook: hides old org, ignores old responses, fallback and error reset', async () => {
    const agencyRequests: Record<string, ReturnType<typeof deferred>> = {};
    const configRequests: Record<string, ReturnType<typeof deferred>> = {};
    const legacyRequests: Record<string, ReturnType<typeof deferred>> = {};
    (globalThis as any).__calculatorIO = {
        navigate: () => {},
        agency: (slug: string) => (agencyRequests[slug] = deferred()).promise,
        config: (slug: string) => (configRequests[slug] = deferred()).promise,
        legacy: (slug: string) => (legacyRequests[slug] = deferred()).promise
    };
    let latest!: ReturnType<typeof useCalculatorConfig>;
    const renders: typeof latest[] = [];
    function Probe({ slug }: { slug: string }) { latest = useCalculatorConfig(slug); renders.push(latest); return null; }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe, { slug: 'jmu' })); });
    await act(async () => { agencyRequests.jmu.resolve({ data: agency, error: null }); });
    assert.equal(latest.agency?.slug, 'jmu');
    assert.equal(latest.courtConfig, null);
    assert.equal(latest.loadingConfig, true);
    const firstChangedRender = renders.length;
    await act(async () => { tree.update(React.createElement(Probe, { slug: 'pju' })); });
    assert.equal(renders[firstChangedRender].agency, null);
    assert.equal(renders[firstChangedRender].courtConfig, null);
    await act(async () => { configRequests.jmu.resolve(config); });
    assert.equal(latest.courtConfig, null);
    await act(async () => { configRequests.pju.reject(new Error('offline')); });
    await act(async () => { legacyRequests.pju.resolve({ config }); agencyRequests.pju.resolve({ data: { ...agency, slug: 'pju' }, error: null }); });
    assert.equal(latest.courtConfig, config);
    assert.equal(latest.configError, null);
    await act(async () => { tree.update(React.createElement(Probe, { slug: 'missing' })); });
    await act(async () => { agencyRequests.missing.resolve({ error: {}, data: null }); configRequests.missing.reject(new Error('offline')); });
    await act(async () => { legacyRequests.missing.resolve(null); });
    assert.ok(latest.agencyError);
    assert.ok(latest.configError);
    assert.equal(latest.loadingAgency, false);
    assert.equal(latest.loadingConfig, false);
    await act(async () => { tree.update(React.createElement(Probe, { slug: 'stm' })); });
    assert.equal(latest.agencyError, null);
    assert.equal(latest.configError, null);
    await act(async () => { agencyRequests.jmu.resolve({ data: agency, error: null }); configRequests.jmu.resolve(config); });
    assert.equal(latest.agency?.slug, 'jmu');
    await act(async () => { tree.unmount(); });
});

import { validatePublicSupabaseConfig } from '../src/lib/publicSupabaseConfig';

test('production public Supabase config rejects missing values, insecure URLs and privileged keys', () => {
    const url = 'https://example.supabase.co';
    const jwt = (role: string) => 'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
    const secret = jwt('service_role');
    const bad: Array<[string | undefined, string | undefined]> = [
        [undefined, undefined], [url, undefined], [undefined, jwt('anon')],
        ['http://example.supabase.co', jwt('anon')], ['https://user:password@example.supabase.co', jwt('anon')],
        [url, secret], [url, 'sb_secret_sensitive'], [url, 'invalid-sensitive-key']
    ];
    for (const [candidateUrl, key] of bad) {
        assert.throws(() => validatePublicSupabaseConfig(candidateUrl, key), error => {
            assert.ok(error instanceof Error);
            if (key) assert.ok(!error.message.includes(key));
            return true;
        });
    }
    assert.deepEqual(validatePublicSupabaseConfig(url, jwt('anon')), { url, key: jwt('anon') });
    assert.deepEqual(validatePublicSupabaseConfig(url, 'sb_publishable_test'), { url, key: 'sb_publishable_test' });
});
import { readFileSync } from 'node:fs';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';

test('anonymized November payslip retains inputs and net amount through restoration and real hook', async () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/november-2026.json', import.meta.url), 'utf8'));
    const config = mapEffectiveConfigToCourtConfig(fixture.effectiveConfig);
    const restored = hydrateCalculatorState(fixture.calculatorState, fixture.resultRows);
    const engine = new AgencyCalculationEngine();
    const direct = await engine.calculateTotal(mapStateToAgencyParams(restored, 'jmu', config));
    assert.ok(Math.abs(direct.netSalary - fixture.expectedNetSalary) <= 0.01, `net ${direct.netSalary} expected ${fixture.expectedNetSalary}`);
    const roundTrip = hydrateCalculatorState(JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(restored))));
    const recalculated = await engine.calculateTotal(mapStateToAgencyParams(roundTrip, 'jmu', config));
    assert.deepEqual(recalculated, direct);
    let latest!: ReturnType<typeof useCalculatorResults>;
    function Probe() { latest = useCalculatorResults(roundTrip, engine, config, agency); return null; }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(React.createElement(Probe)); });
    assert.equal(latest.calculationStatus, 'ready');
    assert.ok(Math.abs(latest.calculatedState.liquido - fixture.expectedNetSalary) <= 0.01);
    assert.ok(latest.resultRows.length > 0);
    assert.equal(roundTrip.manualAdiant13, restored.manualAdiant13);
    assert.deepEqual(roundTrip.rubricasExtras, restored.rubricasExtras);
    assert.equal(roundTrip.tabelaIR, restored.tabelaIR);
    assert.equal(roundTrip.tabelaPSS, restored.tabelaPSS);
    await act(async () => { tree.unmount(); });
});
