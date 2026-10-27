import assert from 'node:assert/strict';
import { calculateDailies, replayDailiesMemory, resolveDailiesConfig, roundDailies } from '../src/services/agency/dailies';
import type { DailiesInput, DailiesVersion } from '../src/services/agency/dailies';

// Synthetic fixtures exercise arithmetic only; these numbers are not normative seeds.
const version = (overrides: Partial<DailiesVersion> = {}): DailiesVersion => {
  const v: DailiesVersion = ({
  id: 'a', revision: 1, scope_type: 'org', scope_key: 'jmu', valid_from: '2026-01-01', valid_to: null, status: 'published',
  payload: {
    rules: { temporal_basis: 'daily', return_fraction: .5, no_overnight_fraction: .5, supplied_lodging_fraction: .45, supplied_meals_fraction: .75, supplied_transport_fraction: .8, supplied_reduction_combination: 'add_reductions', rounding: 'half_up', decimals: 2, deduction_divisor: 20, deduct_meals: false, deduct_transport: false, deduction_days: 'business', deduction_cap: 'daily_gross', deduction_fraction: 'full_day', boarding: { rate: 'boarding', count: 'once', reduction_applies: false }, additional_rates: ['additional'] },
    rates: { member: { kind: 'fixed', value: 200, currency: 'BRL', source_ids: ['fixture'] }, boarding: { kind: 'fixed', value: 30, currency: 'BRL', source_ids: ['fixture'] }, additional: { kind: 'category_percent', category: 'member', percent: 10, currency: 'BRL', source_ids: ['fixture'] } },
    auxiliary: { holidays: ['2026-01-02'], weekend_days: [0, 6], source_ids: ['fixture'] },
    sources: { fixture: { title: 'Synthetic test fixture', url: 'https://example.test/fixture' } },
  }, ...overrides,
  });
  v.payload.rule_sources = Object.fromEntries(Object.keys(v.payload.rules || {}).map(k => [k, ['fixture']]));
  for (const rate of Object.values(v.payload.rates || {})) rate.source_ids = ['fixture'];
  return v;
};
const input = (overrides: Partial<DailiesInput> = {}): DailiesInput => ({ org_slug: 'jmu', competence: '2026-01', category: 'member', mode: 'period', start_date: '2026-01-01', end_date: '2026-01-03', ...overrides });
let count = 0;
function test(name: string, fn: () => void) { fn(); count++; console.log(`✓ ${name}`); }
const result = (i = input(), versions = [version()]) => calculateDailies(i, versions);
const blocked = (code: string, i: DailiesInput, versions = [version()]) => { const r = result(i, versions); assert.equal(r.available, false); assert.equal(r.issues[0].code, code); assert.deepEqual(r.parcels, []); assert.deepEqual(r.totals, {}); };

test('full days + return half + separate boarding and addition', () => {
  const r = result(input({ circumstances: { boarding: true, additional_rates: ['additional'] } }));
  assert.equal(r.available, true); assert.equal(r.totals.BRL.gross, 500); assert.equal(r.totals.BRL.boarding, 30); assert.equal(r.totals.BRL.additions, 50); assert.equal(r.totals.BRL.net, 580);
});
test('JMU and CJF use identical motor with distinct data and no salary', () => {
  const jmu = result();
  const cjf = version({ id: 'cjf', scope_key: 'cjf' }); cjf.payload.rates.member = { kind: 'fixed', value: 400, currency: 'BRL', source_ids: ['fixture'] };
  const federal = result(input({ org_slug: 'cjf' }), [cjf]); assert.equal(federal.totals.BRL.net, jmu.totals.BRL.net * 2);
});
test('inclusive interval endpoints and intramonth segmentation', () => {
  const old = version({ valid_to: '2026-01-01' });
  const newer = version({ id: 'b', revision: 2, valid_from: '2026-01-02' }); newer.payload.rates.member = { kind: 'fixed', value: 300, currency: 'BRL', source_ids: ['fixture'] };
  const r = result(input(), [old, newer]); assert.equal(r.totals.BRL.gross, 650); assert.equal(r.parcels[0].config.versions[0].id, 'a'); assert.equal(r.parcels[1].config.versions[0].id, 'b');
  blocked('AMBIGUOUS_COMPETENCE', input({ mode: 'quantity', quantity: 2 }), [old, newer]);
  assert.equal(result(input({ mode: 'quantity', quantity: 2, normative_date: '2026-01-02' }), [old, newer]).totals.BRL.net, 600);
});
test('departure temporal rule preserves first version across travel', () => {
  const old = version({ valid_to: '2026-01-01' }); old.payload.rules.temporal_basis = 'departure';
  const newer = version({ id: 'b', valid_from: '2026-01-02' }); newer.payload.rates.member = { kind: 'fixed', value: 999, currency: 'BRL', source_ids: ['fixture'] };
  assert.equal(result(input(), [old, newer]).totals.BRL.gross, 500);
});
test('gaps, future, draft and sibling scopes never silently fallback', () => {
  blocked('CONFIG_GAP', input(), [version({ valid_from: '2026-02-01' })]);
  blocked('CONFIG_GAP', input(), [version({ valid_to: '2025-12-31' })]);
  blocked('CONFIG_GAP', input(), [version({ status: 'draft' })]);
  blocked('CONFIG_GAP', input({ org_slug: 'cjf' }));
  blocked('CONFIG_GAP', input(), [version({ scope_type: 'power', scope_key: 'PJU' })]);
});
test('overlapping versions rejected including open intervals', () => blocked('OVERLAPPING_VERSIONS', input(), [version(), version({ id: 'duplicate' })]));
test('strict calendar validation, reversed dates and negative quantity', () => {
  blocked('INVERTED_DATES', input({ start_date: '2026-01-04' }));
  blocked('INVALID_DATE', input({ end_date: '2026-02-30' }));
  blocked('INVALID_NUMBER', input({ mode: 'quantity', quantity: -1 }));
});
test('hierarchy per parameter and mandatory national ceiling', () => {
  const global = version({ id: 'g', scope_type: 'global', scope_key: '*' }); global.payload.limits = { national: { value: 180, currency: 'BRL', applies_to: 'daily_rate', mandatory: true, source_ids: ['fixture'] } };
  const local = version(); local.payload = { sources: local.payload.sources, rates: { member: { kind: 'fixed', value: 240, currency: 'BRL', source_ids: ['fixture'] } } };
  const resolved = resolveDailiesConfig([global, local], { org_slug: 'jmu' }, '2026-01-01');
  assert.equal(resolved.provenance['rules.return_fraction'].version_id, 'g'); assert.equal(resolved.provenance['rates.member'].version_id, 'a');
  const r = result(input(), [global, local]); assert.equal(r.totals.BRL.gross, 600); assert.equal(r.totals.BRL.net, 450); assert.equal(r.totals.BRL.limit_cut, 150);
  local.payload.limits = { national: { value: 190, currency: 'BRL', applies_to: 'daily_rate', mandatory: true, source_ids: ['fixture'] } }; blocked('MANDATORY_LIMIT', input(), [global, local]);
});
test('chained categories and references resolve without embedded legal constants', () => {
  const v = version(); v.payload.references = { salary: { value: 1000, currency: 'BRL', source_ids: ['fixture'] } };
  v.payload.rates.base = { kind: 'reference_percent', reference: 'salary', percent: 40, currency: 'BRL', source_ids: ['fixture'] };
  v.payload.rates.member = { kind: 'category_percent', category: 'base', percent: 50, currency: 'BRL', source_ids: ['fixture'] };
  assert.equal(result(input(), [v]).totals.BRL.gross, 500);
  v.payload.rates.base = { kind: 'category_percent', category: 'member', percent: 50, currency: 'BRL', source_ids: ['fixture'] }; blocked('REFERENCE_CYCLE', input(), [v]);
});
test('missing references, sources and currencies block instead of zero', () => {
  const v = version(); v.payload.rates.member = { kind: 'reference_percent', reference: 'missing', percent: 10, currency: 'BRL', source_ids: ['fixture'] }; blocked('MISSING_REFERENCE', input(), [v]);
  v.payload.references = { missing: { value: 100, currency: 'USD', source_ids: ['fixture'] } }; blocked('CURRENCY_MISMATCH', input(), [v]);
  v.payload = version().payload; v.payload.rates.member.source_ids = ['missing']; blocked('MISSING_SOURCE', input(), [v]);
  v.payload.sources = {}; blocked('MISSING_SOURCE', input(), [v]);
});
test('multiple currencies remain distinct totals without conversion', () => {
  const a = version({ valid_to: '2026-01-01' }); const b = version({ id: 'b', valid_from: '2026-01-02' }); b.payload.rates.member = { kind: 'fixed', value: 100, currency: 'USD', source_ids: ['fixture'] }; b.payload.rates.additional = { kind: 'fixed', value: 10, currency: 'USD', source_ids: ['fixture'] };
  const r = result(input(), [a, b]); assert.equal(r.totals.BRL.net, 200); assert.equal(r.totals.USD.net, 150);
});
test('business calendar, benefits divisor, discounts and independent totals', () => {
  const v = version(); v.payload.rules.deduct_meals = true; v.payload.rules.deduct_transport = true;
  const r = result(input({ benefits: { currency: 'BRL', meals_monthly: 200, transport_monthly: 100 } }), [v]);
  assert.equal(r.available, true); assert.equal(r.totals.BRL.food_deduction, 10); assert.equal(r.totals.BRL.transport_deduction, 5); assert.equal(r.totals.BRL.net, 485);
  blocked('MISSING_BENEFITS', input(), [v]);
  blocked('INVALID_NUMBER', input({ mode: 'quantity', quantity: 2, benefits: { currency: 'BRL', meals_monthly: 200, transport_monthly: 100 } }), [v]);
  assert.equal(result(input({ mode: 'quantity', quantity: 2, deduction_days_quantity: 1, benefits: { currency: 'BRL', meals_monthly: 200, transport_monthly: 100 } }), [v]).totals.BRL.net, 385);
});
test('supplied expenses combine by configured additive reductions', () => {
  const r = result(input({ mode: 'quantity', quantity: 1, circumstances: { supplied_lodging: true, supplied_meals: true } }));
  assert.equal(r.totals.BRL.net, 40); assert.equal(r.totals.BRL.reductions, 160);
  blocked('INVALID_ADDITION', input({ circumstances: { additional_rates: ['member'] } }));
});
test('trip ceiling includes boarding and additions with visible cut', () => {
  const v = version(); v.payload.limits = { trip: { value: 300, currency: 'BRL', applies_to: 'trip_gross', source_ids: ['fixture'] } };
  const r = result(input({ circumstances: { boarding: true, additional_rates: ['additional'] } }), [v]); assert.equal(r.totals.BRL.net, 300); assert.equal(r.totals.BRL.limit_cut, 280);
});
test('unit truncation distinct from half-up/half-even parcel rounding', () => {
  const v = version(); v.payload.rates.member = { kind: 'fixed', value: 200.99, currency: 'BRL', source_ids: ['fixture'] }; v.payload.rules.unit_decimals = 0; v.payload.rules.unit_rounding = 'truncate'; v.payload.rule_sources.unit_decimals = ['fixture']; v.payload.rule_sources.unit_rounding = ['fixture'];
  assert.equal(result(input(), [v]).totals.BRL.gross, 500);
  assert.equal(roundDailies(1.005, 2, 'half_up'), 1.01); assert.equal(roundDailies(1.005, 2, 'half_even'), 1); assert.equal(roundDailies(1.015, 2, 'half_even'), 1.02); assert.equal(roundDailies(1.999, 2, 'truncate'), 1.99);
});
test('snapshot reproduces independently after live versions change', () => {
  const v = version(); const r = result(input(), [v]); const snapshot = JSON.parse(JSON.stringify(r.memory));
  v.payload.rates.member = { kind: 'fixed', value: 9999, currency: 'BRL', source_ids: ['fixture'] }; assert.equal(replayDailiesMemory(snapshot).totals.BRL.net, 500); assert.equal(snapshot.totals.BRL.net, 500);
  snapshot.parcels[0].net++; assert.throws(() => replayDailiesMemory(snapshot), /memória/);
});
test('national locked rules cannot be changed or unlocked by descendants', () => {
  const national = version({ id: 'g', scope_type: 'global', scope_key: '*' }); national.payload.locked_rules = ['return_fraction'];
  const local = version(); local.payload.rules.return_fraction = 1; local.payload.locked_rules = [];
  blocked('MANDATORY_RULE', input(), [national, local]);
  local.payload.rules.return_fraction = .5;
  assert.deepEqual(resolveDailiesConfig([national, local], { org_slug: 'jmu' }, '2026-01-01').payload.locked_rules, ['return_fraction']);
});
test('minimal local overrides may cite inherited documentary sources', () => {
  const national = version({ id: 'g', scope_type: 'global', scope_key: '*' });
  const local = version(); local.payload = { rates: { member: { kind: 'fixed', value: 250, currency: 'BRL', source_ids: ['fixture'] } } };
  assert.equal(result(input(), [national, local]).totals.BRL.net, 625);
});
test('document validity and sources for rules/references are mandatory', () => {
  const v = version(); v.payload.sources.fixture.effective_from = '2026-01-02'; blocked('SOURCE_VALIDITY', input(), [v]);
  v.payload.sources.fixture.effective_from = '2025-01-01'; v.payload.sources.fixture.effective_to = '2025-12-31'; blocked('SOURCE_VALIDITY', input(), [v]);
  v.payload = version().payload; delete v.payload.rule_sources.return_fraction; blocked('MISSING_SOURCE', input(), [v]);
});
test('free reduction factors rejected, configured reductions reconcile credits', () => {
  blocked('INVALID_REDUCTION', input({ circumstances: { reduction_fraction: .01 } }));
  const v = version(); v.payload.rules.allowed_reductions = { authorized: .8 }; v.payload.rule_sources.allowed_reductions = ['fixture'];
  const r = result(input({ circumstances: { reduction_id: 'authorized', boarding: true, additional_rates: ['additional'] } }), [v]);
  assert.equal(r.totals.BRL.gross, 500); assert.equal(r.totals.BRL.additions, 50); assert.equal(r.totals.BRL.boarding, 30); assert.equal(r.totals.BRL.reductions, 110); assert.equal(r.totals.BRL.net, 470);
  for (const p of r.parcels) assert.equal(p.net, Math.round((p.gross + p.boarding + p.additions - p.reductions - p.limit_cut - p.deductions) * 100) / 100);
});
test('trip ceiling uses departure configuration throughout intramonth changes', () => {
  const a = version({ valid_to: '2026-01-01' }); a.payload.limits = { trip: { value: 250, currency: 'BRL', applies_to: 'trip_gross', source_ids: ['fixture'] } };
  const b = version({ id: 'b', valid_from: '2026-01-02' }); b.payload.limits = { trip: { value: 1000, currency: 'BRL', applies_to: 'trip_gross', source_ids: ['fixture'] } };
  const r = result(input(), [a, b]); assert.equal(r.totals.BRL.gross, 500); assert.equal(r.totals.BRL.limit_cut, 250); assert.equal(r.totals.BRL.net, 250);
});
test('out of precision arithmetic is blocked', () => {
  const v = version(); v.payload.rates.member = { kind: 'fixed', value: Number.MAX_SAFE_INTEGER, currency: 'BRL', source_ids: ['fixture'] }; blocked('NUMERIC_RANGE', input(), [v]);
});
test('manual food and transport have independent days and divisors', () => {
  const v = version(); Object.assign(v.payload.rules, { deduct_meals: true, deduct_transport: true, food_divisor: 20, transport_divisor: 10 });
  v.payload.rule_sources.food_divisor = ['fixture']; v.payload.rule_sources.transport_divisor = ['fixture'];
  const r = result(input({ mode: 'quantity', quantity: 3, food_deduction_days_quantity: 2, transport_deduction_days_quantity: 1, benefits: { meals_monthly: 200, transport_monthly: 100, currency: 'BRL' } }), [v]);
  assert.equal(r.available, true); assert.equal(r.totals.BRL.food_deduction, 20); assert.equal(r.totals.BRL.transport_deduction, 10); assert.equal(r.totals.BRL.net, 570);
  assert.equal(r.parcels[0].food_deduction_days, 2); assert.equal(r.parcels[0].transport_deduction_days, 1);
});
test('period benefit deductions require explicit fraction rule', () => {
  const v = version(); Object.assign(v.payload.rules, { deduct_meals: true, deduction_days: 'all', deduction_fraction: 'payable_fraction' });
  const i = input({ benefits: { meals_monthly: 200, currency: 'BRL' } });
  assert.equal(result(i, [v]).totals.BRL.food_deduction, 25);
  delete v.payload.rules.deduction_fraction;
  blocked('MISSING_RULE', i, [v]);
});
test('daily gross ceiling includes boarding and configured additions', () => {
  const v = version(); v.payload.limits = { daily: { value: 180, currency: 'BRL', applies_to: 'daily_gross', source_ids: ['fixture'] } };
  const r = result(input({ circumstances: { boarding: true, additional_rates: ['additional'] } }), [v]);
  assert.equal(r.totals.BRL.gross, 500); assert.equal(r.totals.BRL.boarding, 30); assert.equal(r.totals.BRL.additions, 50); assert.equal(r.totals.BRL.limit_cut, 110); assert.equal(r.totals.BRL.net, 470);
});
test('rounding preserves configured half-up for negative net values', () => {
  assert.equal(roundDailies(-1.005, 2, 'half_up'), -1.01); assert.equal(roundDailies(-1.005, 2, 'half_even'), -1); assert.equal(roundDailies(-1.999, 2, 'truncate'), -1.99);
});
test('cross-month deductions require explicit benefits for every applicable month', () => {
  const v = version(); Object.assign(v.payload.rules, { deduct_meals: true, deduction_days: 'all' });
  const i = input({ start_date: '2026-01-31', end_date: '2026-02-02', benefits: { meals_monthly: 200, currency: 'BRL' } });
  blocked('AMBIGUOUS_BENEFITS', i, [v]);
  const mapped = { ...i, benefits_by_month: { '2026-01': { meals_monthly: 200, currency: 'BRL' }, '2026-02': { meals_monthly: 400, currency: 'BRL' } } };
  const r = result(mapped, [v]); assert.equal(r.available, true); assert.equal(r.totals.BRL.food_deduction, 50); assert.equal(r.totals.BRL.net, 450);
  delete mapped.benefits_by_month['2026-01']; blocked('AMBIGUOUS_BENEFITS', mapped, [v]);
  const noDeduction = version(); assert.equal(result(i, [noDeduction]).available, true);
});
test('business calendar requires its own traceable documentary source', () => {
  const v = version(); v.payload.rules.deduct_meals = true;
  delete v.payload.auxiliary.source_ids;
  blocked('MISSING_SOURCE', input({ benefits: { currency: 'BRL', meals_monthly: 200 } }), [v]);
});
test('mixed parcel precision preserves cents in totals and trip ceiling accumulation', () => {
  const a = version({ valid_to: '2026-01-01' }); a.payload.rates.member = { kind: 'fixed', value: 200.5, currency: 'BRL', source_ids: ['fixture'] };
  a.payload.limits = { trip: { value: 500.5, currency: 'BRL', applies_to: 'trip_gross', source_ids: ['fixture'] } };
  const b = version({ id: 'b', valid_from: '2026-01-02' }); b.payload.rules.decimals = 0; b.payload.rules.return_fraction = 1; b.payload.rates.member = { kind: 'fixed', value: 300, currency: 'BRL', source_ids: ['fixture'] };
  const r = result(input({ end_date: '2026-01-02' }), [a, b]);
  assert.equal(r.available, true); assert.equal(r.totals.BRL.gross, 500.5); assert.equal(r.totals.BRL.net, 500.5); assert.equal(r.totals.BRL.limit_cut, 0);
  assert.equal(r.totals.BRL.net, r.parcels.reduce((sum, p) => sum + p.net, 0));
});
test('quantity mode cannot apply an aggregated daily gross ceiling', () => {
  const v = version(); v.payload.limits = { daily: { value: 150, currency: 'BRL', applies_to: 'daily_gross', source_ids: ['fixture'] } };
  blocked('QUANTITY_REQUIRES_DATES', input({ mode: 'quantity', quantity: 2 }), [v]);
  const r = result(input({ end_date: '2026-01-02' }), [v]); assert.equal(r.available, true); assert.equal(r.totals.BRL.net, 250);
});
test('mixed precision trip accumulation preserves remaining cents for later parcels', () => {
  const a = version({ valid_to: '2026-01-01' }); a.payload.rates.member = { kind: 'fixed', value: 200.5, currency: 'BRL', source_ids: ['fixture'] }; a.payload.limits = { trip: { value: 600.5, currency: 'BRL', applies_to: 'trip_gross', source_ids: ['fixture'] } };
  const b = version({ id: 'b', valid_from: '2026-01-02', valid_to: '2026-01-02' }); b.payload.rules.decimals = 0; b.payload.rates.member = { kind: 'fixed', value: 300, currency: 'BRL', source_ids: ['fixture'] };
  const c = version({ id: 'c', valid_from: '2026-01-03' }); c.payload.rules.return_fraction = 1; c.payload.rates.member = { kind: 'fixed', value: 300, currency: 'BRL', source_ids: ['fixture'] };
  const r = result(input(), [a, b, c]); assert.equal(r.available, true); assert.equal(r.parcels[2].net, 100); assert.equal(r.totals.BRL.net, 600.5); assert.equal(r.totals.BRL.gross, 800.5); assert.equal(r.totals.BRL.limit_cut, 200);
});
test('ceilings cannot round a constrained credit above the remaining budget', () => {
  const a = version({ valid_to: '2026-01-01' }); a.payload.rates.member = { kind: 'fixed', value: 200.5, currency: 'BRL', source_ids: ['fixture'] }; a.payload.limits = { trip: { value: 500, currency: 'BRL', applies_to: 'trip_gross', source_ids: ['fixture'] } };
  const b = version({ id: 'b', valid_from: '2026-01-02' }); b.payload.rules.decimals = 0; b.payload.rules.return_fraction = 1; b.payload.rates.member = { kind: 'fixed', value: 300, currency: 'BRL', source_ids: ['fixture'] };
  const r = result(input({ end_date: '2026-01-02' }), [a, b]); assert.equal(r.available, true); assert.equal(r.parcels[1].net, 299); assert.equal(r.totals.BRL.net, 499.5); assert.ok(r.totals.BRL.net <= 500);
  b.valid_from = '2026-01-01'; b.payload.limits = { daily: { value: 150.5, currency: 'BRL', applies_to: 'daily_gross', source_ids: ['fixture'] } };
  assert.equal(result(input({ end_date: '2026-01-02' }), [b]).totals.BRL.net, 300);
});
console.log(`${count} temporal dailies tests passed.`);
