import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validatePensionConfigurationInput, validatePensionConfigurationChange, validateOrgPensionOverrideChange } from '../src/services/admin/pensionConfigValidation';

const seed = JSON.parse(await readFile(resolve('supabase/seeds/pju_pension_catalog_2026.json'), 'utf8'));
const configuration = () => structuredClone(seed.config_value);
const rejects = (fn: () => void, message?: RegExp) => assert.throws(fn, message ?? /Configuração previdenciária|Catálogo previdenciário/);

test('reviewed seed is accepted and validation never mutates the submitted object', () => {
    const value = configuration();
    const before = structuredClone(value);
    assert.doesNotThrow(() => validatePensionConfigurationInput(value));
    assert.deepEqual(value, before);
    assert.doesNotThrow(() => validatePensionConfigurationChange(value, structuredClone(value)));
});

test('full configuration requires a catalog; every catalog rule requires source and valid month bounds', () => {
    rejects(() => validatePensionConfigurationInput({}));
    rejects(() => validatePensionConfigurationInput(null));
    for (const patch of [{ source: '' }, { source: ' ' }, { source: undefined }, { valid_from: undefined },
        { valid_from: '2026-13' }, { valid_to: '2026-01' }, { valid_to: '2025-12' }, { classification: 'opcional' }]) {
        const value = configuration();
        Object.assign(value.rubric_catalog[0], patch);
        rejects(() => validatePensionConfigurationInput(value));
    }
});

test('same-rubric overlap is rejected while adjacent versions and distinct-rubric periods are valid', () => {
    const value = configuration();
    value.rubric_catalog.push({ ...value.rubric_catalog[0], valid_from: '2026-06', valid_to: '2027-06' });
    rejects(() => validatePensionConfigurationInput(value), /sobrepostas/);
    value.rubric_catalog.at(-1).valid_from = '2027-01';
    assert.doesNotThrow(() => validatePensionConfigurationInput(value));
});

test('historical versions require unique identity, provenance, PSS table and valid nonoverlapping intervals', () => {
    for (const patch of [{ id: '' }, { source: '' }, { tabela_pss: '' }, { valid_from: undefined },
        { valid_from: '2026-00' }, { valid_to: '2026-04' }, { valid_to: '2026-03' }]) {
        const value = configuration();
        Object.assign(value.historical_rules[0], patch);
        rejects(() => validatePensionConfigurationInput(value));
    }
    const duplicated = configuration();
    duplicated.historical_rules.push(structuredClone(duplicated.historical_rules[0]));
    rejects(() => validatePensionConfigurationInput(duplicated), /ID único/);
    duplicated.historical_rules[1].id = 'another';
    rejects(() => validatePensionConfigurationInput(duplicated), /sobrepostas/);
    duplicated.historical_rules[1].valid_from = '2027-01';
    duplicated.historical_rules[1].valid_to = '2028-01';
    assert.doesNotThrow(() => validatePensionConfigurationInput(duplicated));
});

test('historical snapshot cannot be absent, recursive, malformed or dependent on missing rate bounds', () => {
    const changes = [
        (rule: any) => { delete rule.configuration; },
        (rule: any) => { rule.configuration = []; },
        (rule: any) => { rule.configuration.historical_rules = []; },
        (rule: any) => { delete rule.configuration.rubric_catalog; },
        (rule: any) => { delete rule.configuration.enabled; },
        (rule: any) => { delete rule.configuration.include_thirteenth; },
        (rule: any) => { rule.configuration.base_rule = 'other'; },
        (rule: any) => { delete rule.configuration.sponsored_rate; },
        (rule: any) => { delete rule.configuration.linked_rate; },
        (rule: any) => { rule.configuration.sponsored_rate.min = NaN; },
        (rule: any) => { rule.configuration.linked_rate.max = Infinity; },
        (rule: any) => { rule.configuration.linked_rate.step = 0; },
        (rule: any) => { rule.configuration.sponsored_rate.max = 0.01; },
        (rule: any) => { delete rule.configuration.facultative_rate; },
        (rule: any) => { rule.configuration.facultative_rate.min_if_positive = -0.01; },
    ];
    for (const change of changes) {
        const value = configuration();
        change(value.historical_rules[0]);
        rejects(() => validatePensionConfigurationInput(value));
    }
});

test('published rubric and historical versions cannot be removed or rewritten by an admin update', () => {
    const previous = configuration();
    for (const change of [
        (next: any) => { next.rubric_catalog.shift(); },
        (next: any) => { next.historical_rules = []; },
        (next: any) => { next.rubric_catalog[0].classification = 'excluida'; },
        (next: any) => { next.rubric_catalog[0].source = 'https://example.test/revised'; },
        (next: any) => { next.historical_rules[0].configuration.sponsored_rate.max = .09; },
        (next: any) => { next.historical_rules[0].source = 'https://example.test/revised'; },
        (next: any) => { next.rubric_catalog[0].valid_to = null; },
        (next: any) => { next.historical_rules[0].valid_to = '2027-02'; },
    ]) {
        const next = structuredClone(previous);
        change(next);
        rejects(() => validatePensionConfigurationChange(previous, next), /preserve|reescrita/);
    }
    // Object key order is not a change to published contents.
    const reordered = structuredClone(previous);
    reordered.rubric_catalog[0] = Object.fromEntries(Object.entries(reordered.rubric_catalog[0]).reverse());
    assert.doesNotThrow(() => validatePensionConfigurationChange(previous, reordered));
});

test('an open published version may close at a valid month and be followed by a new adjacent version', () => {
    const previous = configuration();
    previous.rubric_catalog[0].valid_to = null;
    previous.historical_rules[0].valid_to = null;
    const next = structuredClone(previous);
    next.rubric_catalog[0].valid_to = '2027-01';
    next.rubric_catalog.push({ ...next.rubric_catalog[0], valid_from: '2027-01', valid_to: '2028-01',
        source: 'https://example.test/future-reviewed-rule' });
    next.historical_rules[0].valid_to = '2027-01';
    next.historical_rules.push({ ...structuredClone(next.historical_rules[0]), id: 'future-reviewed-version',
        valid_from: '2027-01', valid_to: '2028-01', source: 'https://example.test/future-cost-plan', tabela_pss: '2027' });
    assert.doesNotThrow(() => validatePensionConfigurationChange(previous, next, '2027-01-05'));
    rejects(() => validatePensionConfigurationChange(previous, next), /fronteira|vigência|versão|fechamento/);
    rejects(() => validatePensionConfigurationChange(previous, next, '2026-11-05'), /fronteira|vigência|versão|fechamento/);
    const noSuccessor = structuredClone(next);
    noSuccessor.rubric_catalog.pop();
    noSuccessor.historical_rules.pop();
    rejects(() => validatePensionConfigurationChange(previous, noSuccessor, '2027-01-05'), /sucessora|vigência|versão|fechamento/);
    const retrospective = structuredClone(next);
    retrospective.rubric_catalog[0].valid_to = '2026-07';
    retrospective.rubric_catalog.at(-1).valid_from = '2026-07';
    retrospective.historical_rules[0].valid_to = '2026-07';
    retrospective.historical_rules.at(-1).valid_from = '2026-07';
    rejects(() => validatePensionConfigurationChange(previous, retrospective, '2026-11-05'), /fronteira|vigência|versão|fechamento/);
    assert.equal(previous.rubric_catalog[0].valid_to, null);
    assert.equal(previous.historical_rules[0].valid_to, null);
});

test('partial org override can omit catalog, but cannot bypass validation when supplying one or a history', () => {
    assert.doesNotThrow(() => validatePensionConfigurationInput({ incidence_rules: { fc: true } }, true));
    assert.doesNotThrow(() => validatePensionConfigurationInput({}, true));
    assert.doesNotThrow(() => validatePensionConfigurationInput({ rubric_catalog: configuration().rubric_catalog }, true));
    assert.doesNotThrow(() => validatePensionConfigurationInput({ historical_rules: configuration().historical_rules }, true));
    rejects(() => validatePensionConfigurationInput({ rubric_catalog: null }, true));
    rejects(() => validatePensionConfigurationInput({ rubric_catalog: [{ id: 'unreviewed' }] }, true));
    rejects(() => validatePensionConfigurationInput({ historical_rules: [{}] }, true));
});

test('org overrides cannot create or rewrite legal catalog/history, while unchanged inherited local arrays are retained', () => {
    assert.doesNotThrow(() => validateOrgPensionOverrideChange(undefined, { incidence_rules: { fc: true } }));
    for (const field of ['rubric_catalog', 'historical_rules']) {
        const candidate = { [field]: configuration()[field] };
        rejects(() => validateOrgPensionOverrideChange(undefined, candidate), /catálogo|histórico|PJU|órgão|poder/);
        assert.doesNotThrow(() => validateOrgPensionOverrideChange(candidate, structuredClone(candidate)));
        const changed = structuredClone(candidate);
        changed[field][0].source = 'https://example.test/unauthorized-rewrite';
        rejects(() => validateOrgPensionOverrideChange(candidate, changed), /catálogo|histórico|PJU|órgão|poder/);
    }
});
