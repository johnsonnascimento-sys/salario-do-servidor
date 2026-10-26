import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { calculateDailies as calculateModule } from '../src/services/agency/engine/modules/dailiesCalculations';
import { legacyDailiesInput } from '../src/services/agency/adapters/dailiesInput';
import { calculateDailies, replayDailiesMemory, type DailiesInput, type DailiesVersion } from '../src/services/agency/dailies';
import type { IAgencyCalculationParams } from '../src/services/agency/engine/types';
import { INITIAL_STATE, type CalculatorState } from '../src/types';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { buildDailiesAuditRows, dailiesResultRows } from '../src/utils/dailiesExport';
import { exportToPDF, exportToExcel } from '../src/services/exportService';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';

const io = (globalThis as any).__dailiesIntegrationIO as { calls: number; versions: DailiesVersion[]; context: { org_slug: string }; downloads: Array<{ blob: Blob; filename: string }> };
// Test-only monetary values. No production configuration or database is read.
function fixture(currency = 'BRL', id = 'fixture'): DailiesVersion {
  const rules = {
    temporal_basis: 'daily' as const, return_fraction: .5, no_overnight_fraction: .5,
    supplied_lodging_fraction: .5, supplied_meals_fraction: .8, rounding: 'half_up' as const, decimals: 2,
    deduction_divisor: 20, food_divisor: 20, transport_divisor: 10,
    deduct_meals: true, deduct_transport: true, deduction_days: 'all' as const,
    deduction_fraction: 'full_day' as const, deduction_cap: 'daily_gross' as const,
    boarding: { rate: 'boarding', count: 'per_leg' as const, reduction_applies: false },
  };
  return { id, revision: 1, scope_type: 'org', scope_key: 'jmu', valid_from: '2026-01-01', valid_to: null, status: 'published', payload: {
    rules, rule_sources: Object.fromEntries(Object.keys(rules).map(k => [k, ['s']])),
    rates: { technician: { kind: 'fixed', value: 200, currency, source_ids: ['s'] }, boarding: { kind: 'fixed', value: 30, currency, source_ids: ['s'] } },
    sources: { s: { title: 'Synthetic integration fixture', url: 'https://example.test/fixture', effective_from: '2026-01-01' } },
    auxiliary: { holidays: [], weekend_days: [0, 6] },
  } };
}
const params = (patch: Partial<IAgencyCalculationParams> = {}) => ({
  orgSlug: 'jmu', competencia: '2026-01', cargo: 'technician', funcao: '0', diariasModoDesconto: 'manual',
  diariasQtd: 2, diariasEmbarque: 'nenhum', diariasDiasDescontoAlimentacao: 2, diariasDiasDescontoTransporte: 1,
  diariasDescontarAlimentacao: true, diariasDescontarTransporte: true, ...patch,
} as IAgencyCalculationParams);
const benefits = { auxAlimentacao: 200, auxTransporte: 100 };
let count = 0;
async function test(name: string, fn: () => void | Promise<void>) { await fn(); count++; console.log(`✓ ${name}`); }

await test('legacy zero quantity returns without data IO', async () => {
  io.calls = 0; io.versions = [fixture()];
  const r = await calculateModule(params({ diariasQtd: 0 }), benefits);
  assert.equal(r.valor, 0); assert.equal(io.calls, 0); assert.equal(r.memory, undefined);
});
await test('legacy adapter preserves distinct benefit days and actual benefits', () => {
  const i = legacyDailiesInput(params({ diariasDescontarAlimentacao: false, diariasDescontarTransporte: false }), benefits);
  assert.equal(i.food_deduction_days_quantity, 2); assert.equal(i.transport_deduction_days_quantity, 1);
  assert.deepEqual(i.benefits, { meals_monthly: 200, transport_monthly: 100, currency: 'BRL' });
});
await test('invalid travel interval cannot yield a payroll monetary result', async () => {
  await assert.rejects(() => calculateModule(params({ diariasModoDesconto: 'periodo', diariasDataInicio: '2026-01-03', diariasDataFim: '2026-01-01' }), benefits), /final|posterior|Período|período/);
});
await test('published BRL module uses temporal engine and reconciles every amount', async () => {
  io.versions = [fixture()];
  const r = await calculateModule(params({ diariasEmbarque: 'completo' }), benefits);
  assert.equal(r.bruto, 460); assert.equal(r.descAlim, 20); assert.equal(r.descTransp, 10); assert.equal(r.valor, 430);
  assert.equal(r.diasDescontoAlim, 2); assert.equal(r.diasDescontoTransp, 1);
  assert.equal(r.bruto - r.glosa - r.corteLdo - r.deducoes, r.valor);
  assert.equal(r.memory?.totals.BRL.net, r.valor);
});
await test('foreign currency cannot be merged into BRL payroll', async () => {
  io.versions = [fixture('USD')];
  const dailiesInput: DailiesInput = { org_slug: 'jmu', competence: '2026-01', category: 'technician', mode: 'quantity', quantity: 2, food_deduction_days_quantity: 2, transport_deduction_days_quantity: 1, benefits: { currency: 'USD', meals_monthly: 200, transport_monthly: 100 } };
  await assert.rejects(() => calculateModule(params({ dailiesInput }), benefits), /estrangeira|reais/);
});
await test('full payroll engine aggregates gross allowances and every allowance debit without changing net', async () => {
  const payrollFixture = JSON.parse(readFileSync(new URL('./fixtures/november-2026.json', import.meta.url), 'utf8'));
  const config = mapEffectiveConfigToCourtConfig(payrollFixture.effectiveConfig);
  const state = hydrateCalculatorState({ ...payrollFixture.calculatorState, dailiesInput: undefined, diariasQtd: 0, diariasEmbarque: 'nenhum', diariasDataInicio: '', diariasDataFim: '' });
  const engine = new AgencyCalculationEngine();
  const baseline = await engine.calculateTotal(mapStateToAgencyParams(state, 'jmu', config));
  io.versions = [fixture()];
  const withAllowances = await engine.calculateTotal(mapStateToAgencyParams({ ...state, dailiesInput: {
    org_slug: 'jmu', competence: '2026-11', normative_date: '2026-11-01', category: 'technician', mode: 'quantity', quantity: 2,
    food_deduction_days_quantity: 2, transport_deduction_days_quantity: 1,
    benefits: { meals_monthly: 200, transport_monthly: 100, currency: 'BRL' }, circumstances: { boarding: true, boarding_legs: 2 },
  } }, 'jmu', config));
  const cents = (value: number) => Math.round(value * 100) / 100;
  assert.equal(cents(withAllowances.netSalary - baseline.netSalary), 430);
  assert.equal(cents(withAllowances.totalDeductions - baseline.totalDeductions), 30);
  const grossDifference = withAllowances.netSalary + withAllowances.totalDeductions - baseline.netSalary - baseline.totalDeductions;
  assert.equal(cents(grossDifference), 460);
  const rows = dailiesResultRows(withAllowances.dailiesMemory!, 'BRL');
  assert.equal(rows.filter(r => r.type === 'C').reduce((sum, row) => sum + row.value, 0), cents(grossDifference));
  assert.equal(rows.filter(r => r.type === 'D').reduce((sum, row) => sum + row.value, 0), cents(withAllowances.totalDeductions - baseline.totalDeductions));
});

io.versions = [fixture()];
const original = await calculateModule(params({ diariasEmbarque: 'completo' }), benefits);
const savedState: CalculatorState = { ...INITIAL_STATE, nome: 'TEST SERVER', mesRef: 'JANEIRO', anoRef: 2026, dailiesInput: original.memory!.input, dailiesMemory: original.memory };
const saved = JSON.parse(JSON.stringify(savedState));
await test('draft serialization removes computed memory while full saved snapshot hydrates independently', () => {
  const draft = stripCalculatedFieldsFromCalculatorState(savedState);
  assert.equal(draft.dailiesMemory, undefined); assert.deepEqual(draft.dailiesInput, original.memory!.input);
  const restored = hydrateCalculatorState(saved);
  assert.equal(restored.dailiesMemory!.totals.BRL.net, 430);
  restored.dailiesMemory!.parcels[0].net = 1;
  assert.equal(saved.dailiesMemory.parcels[0].net, 430);
});
await test('saved memory and audit exports ignore later live configuration edits', () => {
  const before = buildDailiesAuditRows(saved.dailiesMemory);
  io.versions[0].payload.rates!.technician = { kind: 'fixed', value: 999, currency: 'BRL', source_ids: ['s'] };
  assert.equal(replayDailiesMemory(saved.dailiesMemory).totals.BRL.net, 430);
  assert.deepEqual(buildDailiesAuditRows(saved.dailiesMemory), before);
});
await test('actual XLSX/PDF keep payroll and allowance on separate sheets/pages', async () => {
  io.downloads = [];
  const payrollRows = [{ label: 'SALARIO TESTE', value: 1000, type: 'C' }, ...dailiesResultRows(saved.dailiesMemory, 'BRL')];
  exportToExcel(saved, payrollRows, null, { filename: 'separate' });
  exportToPDF(saved, payrollRows, null, { filename: 'separate' });
  const excel = io.downloads.find(d => d.filename === 'separate.xlsx')!;
  const wb = XLSX.read(await excel.blob.arrayBuffer(), { type: 'array' });
  assert.deepEqual(wb.SheetNames, ['Holerite', 'Diárias', 'Memória diárias']);
  const main = XLSX.utils.sheet_to_json(wb.Sheets.Holerite, { header: 1 }) as any[][];
  const daily = XLSX.utils.sheet_to_json(wb.Sheets['Diárias'], { header: 1 }) as any[][];
  assert.equal(main.some(row => String(row[1]).includes('DIÁRIAS')), false);
  assert.equal(main.some(row => row[1] === 'LÍQUIDO' && row[3] === 1000), true);
  assert.equal(daily.some(row => row[1] === 'LÍQUIDO' && row[2] === 430), true);
  const pdf = io.downloads.find(d => d.filename === 'separate.pdf')!;
  const pdfText = new TextDecoder('latin1').decode(await pdf.blob.arrayBuffer());
  assert.ok(pdfText.startsWith('%PDF-')); assert.ok(pdfText.includes('Holerite')); assert.ok(pdfText.includes('pagamento separado')); assert.ok(pdfText.includes('SALARIO TESTE'));
  assert.ok(pdfText.indexOf('SALARIO TESTE') < pdfText.indexOf('pagamento separado'));
  assert.ok((pdfText.match(/\/Type \/Page\b/g) || []).length >= 3);
});
await test('mixed currency snapshot exports select a single monetary currency with tagged audit totals', async () => {
  const a = fixture('BRL', 'a'); a.valid_to = '2026-01-01'; a.payload.rules!.deduct_meals = false; a.payload.rules!.deduct_transport = false;
  const b = fixture('USD', 'b'); b.valid_from = '2026-01-02'; b.payload.rules!.deduct_meals = false; b.payload.rules!.deduct_transport = false;
  const r = calculateDailies({ org_slug: 'jmu', competence: '2026-01', category: 'technician', mode: 'period', start_date: '2026-01-01', end_date: '2026-01-03' }, [a, b]);
  assert.equal(r.available, true); assert.equal(r.totals.BRL.net, 200); assert.equal(r.totals.USD.net, 300);
  const s: CalculatorState = { ...saved, dailiesOnly: true, dailiesCurrency: 'USD', dailiesInput: r.memory.input, dailiesMemory: r.memory };
  io.downloads = []; const rows = dailiesResultRows(r.memory, 'USD');
  exportToExcel(s, rows, null, { filename: 'USD' }); exportToPDF(s, rows, null, { filename: 'USD' });
  const wb = XLSX.read(await io.downloads.find(d => d.filename === 'USD.xlsx')!.blob.arrayBuffer(), { type: 'array' });
  assert.deepEqual(wb.SheetNames, ['Diárias', 'Memória diárias']);
  const main = XLSX.utils.sheet_to_json(wb.Sheets['Diárias'], { header: 1 }) as any[][];
  assert.equal(main.some(row => String(row[0]).includes('DIÁRIAS (USD)')), true);
  assert.equal(main.some(row => row[1] === 'LÍQUIDO' && row[3] === 300), true);
  const pdfText = new TextDecoder('latin1').decode(await io.downloads.find(d => d.filename === 'USD.pdf')!.blob.arrayBuffer());
  assert.ok(pdfText.includes('US$')); assert.ok(!pdfText.includes('Holerite \(sem'));
  assert.equal(buildDailiesAuditRows(r.memory).some(row => row[0] === 'Moeda BRL: líquido' && row[1] === 200), true);
  assert.equal(buildDailiesAuditRows(r.memory).some(row => row[0] === 'Moeda USD: líquido' && row[1] === 300), true);
});
console.log(`${count} dailies integration scenarios passed.`);
