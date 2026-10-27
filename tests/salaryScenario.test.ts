import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { CourtConfig } from '../src/types';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import { getDataForPeriod } from '../src/services/agency/engine/modules/baseCalculations';
import { getTablesForPeriod } from '../src/utils/calculations';
import { hydrateCalculatorState } from '../src/utils/calculatorState';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import {
  applySalaryCorrections, getSalaryCorrections, getSalarySchedule, getSalaryScenarioNotice,
  isProjectedSalaryAdjustment, isSalaryProjection, normalizeSalaryAdjustment, resolveSalaryPeriod,
} from '../src/utils/salaryScenario';

const historicalFixture = JSON.parse(readFileSync(new URL('./fixtures/november-2026.json', import.meta.url), 'utf8'));
function config(): CourtConfig {
  const c = mapEffectiveConfigToCourtConfig(historicalFixture.effectiveConfig);
  c.bases = { salario: { tecnico: { A1: 1000 } }, funcoes: { cj1: 200 } };
  c.values.cj1_integral_base = 1000;
  c.payrollRules!.vrRateOnCj1 = .5;
  // Synthetic amounts and percentages; no legal classification inferred from these dates.
  c.adjustment_schedule = [
    { period: 0, percentage: 0, date: '2025-01-01', status: 'promulgated' },
    { period: 1, percentage: 0, date: '2026-01-01', status: 'promulgated' },
    { period: 2, percentage: 10, date: '2026-07-01', status: 'promulgated' },
    { period: 3, percentage: 20, date: '2027-07-01', status: 'vetoed', veto_reference: 'Synthetic veto' },
    { period: 4, percentage: 25, date: '2028-07-01', status: 'projected', scenarioLabel: 'Synthetic projected scenario', legalReference: 'Synthetic reference', sourceUrl: 'https://example.test/scenario' },
  ];
  return c;
}
let count = 0;
async function test(name: string, fn: () => void | Promise<void>) { await fn(); count++; console.log(`✓ ${name}`); }
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < .000001, `${actual} ≠ ${expected}`);

await test('ingestion normalizes both local aliases while retaining canonical status and audit fields', () => {
  const raw = structuredClone(historicalFixture.effectiveConfig);
  raw.adjustment_schedule = {
    '0': { date: '2025-01-01', percentage: 0, status: 'enacted' },
    '1': { date: '2026-01-01', percentage: 10, status: 'hypothetical', scenarioLabel: 'Legacy scenario', legalReference: 'Source article', sourceUrl: 'https://example.test/norma' },
    '2': { date: '2027-01-01', percentage: 20, status: 'promulgated' },
    '3': { date: '2028-01-01', percentage: 25, status: 'vetoed', veto_reference: 'Explicit veto' },
    '4': { date: '2029-01-01', percentage: 30, status: 'projected' },
  };
  const mapped = mapEffectiveConfigToCourtConfig(raw).adjustment_schedule!;
  assert.deepEqual(mapped.map(e => e.status), ['promulgated', 'projected', 'promulgated', 'vetoed', 'projected']);
  assert.equal(mapped[1].scenarioLabel, 'Legacy scenario'); assert.equal(mapped[1].legalReference, 'Source article'); assert.equal(mapped[1].sourceUrl, 'https://example.test/norma'); assert.equal(mapped[3].veto_reference, 'Explicit veto');
  assert.equal(isProjectedSalaryAdjustment(mapped[2]), false);
});
await test('no date, percentage or year creates a legal status or veto reference', () => {
  const raw = structuredClone(historicalFixture.effectiveConfig);
  raw.adjustment_schedule = { '4': { date: '2030-01-01', percentage: 80 } };
  const entry = mapEffectiveConfigToCourtConfig(raw).adjustment_schedule![0];
  assert.equal(entry.status, undefined); assert.equal(entry.vetoed, undefined); assert.equal(entry.veto_reference, undefined);
  const c = config(); c.adjustment_schedule = [entry];
  assert.match(getSalaryScenarioNotice({ periodo: 4, simularDerrubadaVeto: false }, c).join(' '), /sem classificação normativa/);
  assert.equal(getSalarySchedule(c).length, 1);
});
await test('explicit veto boolean is retained and all projected metadata is excluded from official calculation', () => {
  for (const entry of [{ status: 'vetoed' }, { status: 'projected' }, { status: 'hypothetical' }, { vetoed: true }]) assert.equal(isProjectedSalaryAdjustment(entry), true);
  assert.equal(isProjectedSalaryAdjustment({ status: 'promulgated', vetoed: false }), false);
  const entry = normalizeSalaryAdjustment({ period: 1, percentage: 10, vetoed: true }); assert.equal(entry.status, 'vetoed');
  assert.equal(normalizeSalaryAdjustment({ period: 1, percentage: 10, status: 'promulgated', vetoed: false }).vetoed, false);
  const c = config();
  assert.deepEqual(getSalaryCorrections(4, c).map(e => e.period), [0, 1, 2]);
  close(applySalaryCorrections(1000, 4, c), 1100);
  close(applySalaryCorrections(1000, 4, c, false), 1100);
  close(applySalaryCorrections(1000, 4, c, true), 1650);
});
await test('a historical projection label or future period never opts into recalculation', () => {
  const c = config();
  assert.equal(isSalaryProjection({ periodo: 4, salaryProjectionLabel: 'Saved future scenario' }, c), false);
  assert.equal(isSalaryProjection({ periodo: 4, salaryProjectionLabel: 'Saved future scenario', simularDerrubadaVeto: false }, c), false);
  assert.equal(isSalaryProjection({ periodo: 4, simularDerrubadaVeto: true }, c), true);
  const legacy = hydrateCalculatorState({ periodo: 4, salaryProjectionLabel: 'Saved future scenario' });
  assert.equal(legacy.simularDerrubadaVeto, undefined); assert.equal(legacy.salaryProjectionLabel, 'Saved future scenario');
  assert.match(getSalaryScenarioNotice(legacy, c).join(' '), /não é ativada automaticamente/);
  const explicit = hydrateCalculatorState({ periodo: 4, simularDerrubadaVeto: true, salaryProjectionLabel: 'Saved explicit scenario' });
  assert.equal(isSalaryProjection(explicit), true); assert.equal(getSalaryScenarioNotice(explicit, c)[0], 'Saved explicit scenario');
});
await test('one competence selects eligible status and never selects a later projected increment', () => {
  const c = config();
  assert.equal(resolveSalaryPeriod({ periodo: 4, anoRef: 2026, mesRef: 'NOVEMBRO', simularDerrubadaVeto: true }, c), 2);
  assert.equal(resolveSalaryPeriod({ periodo: 4, anoRef: 2027, mesRef: 'JUNHO', simularDerrubadaVeto: true }, c), 2);
  assert.equal(resolveSalaryPeriod({ periodo: 0, anoRef: 2027, mesRef: 'JULHO', simularDerrubadaVeto: true }, c), 3);
  assert.equal(resolveSalaryPeriod({ periodo: 4, anoRef: 2028, mesRef: '07', simularDerrubadaVeto: false }, c), 2);
  assert.equal(resolveSalaryPeriod({ periodo: 0, anoRef: 2028, mesRef: '07', simularDerrubadaVeto: true }, c), 4);
  assert.equal(resolveSalaryPeriod({ periodo: 4, anoRef: 2028, mesRef: 'JULHO', salaryProjectionLabel: 'legacy label' }, c), 2);
});
await test('competence earlier than the first dated increase cannot import that future increase', () => {
  const c = config(); c.adjustment_schedule = [{ period: 1, date: '2026-01-01', percentage: 10, status: 'promulgated' }];
  assert.equal(resolveSalaryPeriod({ periodo: 0, anoRef: 2025, mesRef: 'DEZEMBRO' }, c), 0);
  const period = resolveSalaryPeriod({ periodo: 4, anoRef: 2025, mesRef: 'DEZEMBRO' }, c);
  assert.equal(period, 0); assert.equal(applySalaryCorrections(1000, period, c), 1000);
});
await test('shared UI and engine arithmetic and their scenario cache remain consistent across toggles', async () => {
  const c = config();
  const official = await getDataForPeriod(4, c, false);
  const projected = await getDataForPeriod(4, c, true);
  const officialAgain = await getDataForPeriod(4, c, false);
  assert.notEqual(official, projected); assert.equal(officialAgain, official);
  close(official.salario.tecnico.A1, 1100); close(projected.salario.tecnico.A1, 1650);
  close(official.funcoes.cj1, 220); close(projected.funcoes.cj1, 330);
  assert.equal(official.valorVR, 550); assert.equal(projected.valorVR, 825);
  assert.deepEqual(getTablesForPeriod(4, c, false), official);
  assert.deepEqual(getTablesForPeriod(4, c, true), projected);
});
await test('unclassified legacy schedules keep their numerical behavior without being called promulgated', () => {
  const c = config(); c.adjustment_schedule = [{ period: 0, percentage: 0 }, { period: 1, percentage: 10 }];
  assert.equal(getSalarySchedule(c).some(e => e.status !== undefined), false);
  close(applySalaryCorrections(1000, 1, c, false), 1100);
});
await test('adapter and public engine re-resolve a saved future period against the selected competence without mutation', async () => {
  const c = config();
  const state = hydrateCalculatorState({ ...historicalFixture.calculatorState, cargo: 'tecnico', padrao: 'A1', funcao: 'cj1',
    anoRef: 2026, mesRef: 'NOVEMBRO', periodo: 4, simularDerrubadaVeto: true, salaryProjectionLabel: 'Original saved 2028 projection',
    diariasQtd: 0, diariasEmbarque: 'nenhum', diariasDataInicio: '', diariasDataFim: '', dailiesInput: undefined });
  const before = structuredClone(state);
  const params = mapStateToAgencyParams(state, 'jmu', c);
  assert.equal(params.periodo, 2); assert.deepEqual(state, before);
  const engine = new AgencyCalculationEngine();
  const current = await engine.calculateTotal(params);
  const fromStale = await engine.calculateTotal({ ...params, periodo: 4 });
  assert.deepEqual(fromStale, current);
  assert.equal(await engine.calculateBase({ ...params, periodo: 4 }), await engine.calculateBase(params));
  close(current.breakdown.vencimento, 1100);
  const projectedParams = { ...params, periodo: 4, competencia: '2028-07' };
  const projected = await engine.calculateTotal(projectedParams); close(projected.breakdown.vencimento, 1650);
  const official = await engine.calculateTotal({ ...projectedParams, simularDerrubadaVeto: false }); close(official.breakdown.vencimento, 1100);
  assert.equal(state.salaryProjectionLabel, 'Original saved 2028 projection'); assert.equal(state.periodo, 4);
});
console.log(`${count} salary scenario compatibility tests passed.`);
