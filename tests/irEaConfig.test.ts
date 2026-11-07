import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import type { EffectiveConfig, IRDeductionConfig } from '../src/services/config/types';

const migration = readFileSync('supabase/migrations/20261106_version_ir_ea_tables.sql', 'utf8');
const reviewed = JSON.parse(migration.match(/\$json\$([\s\S]*?)\$json\$::jsonb/)![1]) as IRDeductionConfig;
const adapt = (tables: IRDeductionConfig) => mapEffectiveConfigToCourtConfig({
    org_slug: 'cjf', org_name: 'CJF', power_name: 'PJU', ir_deduction: tables,
} as EffectiveConfig);

test('reviewed migration carries distinct historical validity and corrected May brackets', () => {
    const config = adapt(reviewed);
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
    const config = adapt(reviewed);
    for (const table of Object.values(config.historico_ir_metadata!)) {
        assert.equal(table.rra.deductDependents, false);
        assert.equal(table.rra.deductComplementaryPension, false);
        assert.match(table.reference, /https:\/\//);
    }
    const legacy = adapt({ 'legacy': { deduction: 908.73, brackets: [] } });
    assert.deepEqual(legacy.historico_ir_metadata, {});
});

test('2026 redutor parameters are sourced and verification is explicitly limited to NM=1', () => {
    const reduction = adapt(reviewed).historico_ir_metadata!['2026_jan'].rra.reduction!;
    assert.equal(reduction.status, 'verified');
    assert.equal(reduction.mode, 'total');
    assert.deepEqual(reduction.verifiedMonths, [1]);
    assert.deepEqual([reduction.exemptIncome, reduction.partialIncome, reduction.maxReduction, reduction.intercept, reduction.slope],
        [5000, 7350, 312.89, 978.62, 0.133145]);
    assert.match(reduction.reference, /148383/);
});

test('configuration migration versions JSON and never updates existing calculation values in place', () => {
    assert.match(migration, /current_value @> reviewed_tables/);
    assert.match(migration, /SET valid_to = DATE '2026-11-05'/);
    assert.match(migration, /current_value \|\| reviewed_tables/);
    assert.doesNotMatch(migration, /UPDATE public\.global_config SET config_value/i);
    assert.doesNotMatch(migration, /DELETE FROM/i);
});
