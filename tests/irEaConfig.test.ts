import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import type { EffectiveConfig, IRDeductionConfig } from '../src/services/config/types';

const migration20261106 = readFileSync('supabase/migrations/20261106_version_ir_ea_tables.sql', 'utf8');
const reviewed20261106 = JSON.parse(migration20261106.match(/\$json\$([\s\S]*?)\$json\$::jsonb/)![1]) as IRDeductionConfig;

const migration20261107 = readFileSync('supabase/migrations/20261107_expand_ir_ea_rra_reduction.sql', 'utf8');
const reviewed20261107 = JSON.parse(migration20261107.match(/\$json\$([\s\S]*?)\$json\$::jsonb/)![1]) as IRDeductionConfig;

const adapt = (tables: IRDeductionConfig) => mapEffectiveConfigToCourtConfig({
    org_slug: 'cjf', org_name: 'CJF', power_name: 'PJU', ir_deduction: tables,
} as EffectiveConfig);

test('reviewed migration carries distinct historical validity and corrected May brackets', () => {
    const config = adapt(reviewed20261107);
    assert.equal(config.historico_ir['2025_jan'], 896);
    assert.equal(config.historico_ir['2025_maio'], 908.73);
    assert.equal(config.historico_ir_brackets!['2025_maio'][0].max, 2428.8);
    assert.deepEqual(config.historico_ir_brackets!['2025_maio'].map(row => row.deduction), [0, 182.16, 394.16, 675.49, 908.73]);
    assert.equal(config.historico_ir_brackets!['2026_jan'][4].max, Infinity);
    assert.equal(config.historico_ir_metadata!['2025_jan'].validTo, '2025-04-30');
    assert.equal(config.historico_ir_metadata!['2025_maio'].validTo, '2025-12-31');
    assert.equal(config.historico_ir_metadata!['2025_maio'].rra.reductionApplicable, false);
    assert.equal(config.historico_ir_metadata!['2026_jan'].rra.reductionApplicable, true);
});

test('EA metadata does not invent source, validity, or automatic deductions', () => {
    const config = adapt(reviewed20261107);
    for (const table of Object.values(config.historico_ir_metadata!)) {
        assert.equal(table.rra.deductDependents, false);
        assert.equal(table.rra.deductComplementaryPension, false);
        assert.match(table.reference, /https:\/\//);
    }
    const legacy = adapt({ 'legacy': { deduction: 908.73, brackets: [] } });
    assert.deepEqual(legacy.historico_ir_metadata, {});
});

test('2026 redutor parameters are sourced and verification covers NM >= 1', () => {
    const reduction06 = adapt(reviewed20261106).historico_ir_metadata!['2026_jan'].rra.reduction!;
    assert.equal(reduction06.status, 'verified');
    assert.deepEqual(reduction06.verifiedMonths, [1]);

    const reduction07 = adapt(reviewed20261107).historico_ir_metadata!['2026_jan'].rra.reduction!;
    assert.equal(reduction07.status, 'verified');
    assert.equal(reduction07.mode, 'total');
    assert.equal(reduction07.verifiedMonths, undefined);
    assert.deepEqual([reduction07.exemptIncome, reduction07.partialIncome, reduction07.maxReduction, reduction07.intercept, reduction07.slope],
        [5000, 7350, 312.89, 978.62, 0.133145]);
    assert.match(reduction07.reference, /148383/);
});

test('configuration migration versions JSON and never updates existing calculation values in place', () => {
    assert.match(migration20261107, /current_value @> reviewed_tables/);
    assert.match(migration20261107, /SET valid_to = DATE '2026-11-06'/);
    assert.match(migration20261107, /current_value \|\| reviewed_tables/);
    assert.doesNotMatch(migration20261107, /UPDATE public\.global_config SET config_value/i);
    assert.doesNotMatch(migration20261107, /DELETE FROM/i);
});
