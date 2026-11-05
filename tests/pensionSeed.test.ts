import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import type { EffectiveConfig } from '../src/services/config/types';
import { validatePensionConfigurationInput } from '../src/services/admin/pensionConfigValidation';
import { resolvePensionRubricRule } from '../src/services/agency/engine/modules/pensionCatalog';

const seed = JSON.parse(await readFile(resolve('supabase/seeds/pju_pension_catalog_2026.json'), 'utf8'));
const sql = await readFile(resolve('supabase/migrations/20261105_pju_pension_catalog.sql'), 'utf8');
const config = seed.config_value;
const catalog = config.rubric_catalog;
const yearMonth = /^\d{4}-(0[1-9]|1[0-2])$/;
const known = (id: string) => catalog.find((entry: any) => entry.id === id);

test('canonical seed is byte-independent JSON identical to the reviewed SQL payload', () => {
    const embedded = sql.match(/\$pension_seed\$([\s\S]*?)\$pension_seed\$::jsonb/);
    assert.ok(embedded, 'migration must embed the complete canonical candidate');
    assert.deepEqual(JSON.parse(embedded[1]), seed);
    assert.equal(seed.valid_from, '2026-11-05');
    assert.equal(seed.power_name, 'PJU');
    assert.equal(seed.config_key, 'previdencia_complementar');
});

test('catalog separates permanent, optional, excluded and unresolved legal classes', () => {
    assert.equal(known('vencimento_basico').classification, 'obrigatoria');
    assert.equal(known('gaj').classification, 'obrigatoria');
    for (const id of ['fc_cj', 'local_trabalho']) assert.equal(known(id).classification, 'facultativa');
    for (const id of ['auxilio_alimentacao', 'diarias']) assert.equal(known(id).classification, 'excluida');
    for (const id of ['gas', 'gae', 'aq_treinamento', 'outra_nao_classificada']) {
        assert.equal(known(id).classification, 'pendente');
    }
    assert.equal(new Set(catalog.map((entry: any) => entry.id)).size, catalog.length);
    for (const entry of catalog) {
        assert.ok(yearMonth.test(entry.valid_from));
        assert.ok(yearMonth.test(entry.valid_to));
        assert.ok(entry.valid_from < entry.valid_to);
        assert.equal(entry.valid_from, '2026-01');
        assert.equal(entry.valid_to, '2027-01');
        assert.ok(seed.source_documents.some((source: any) => source.url === entry.source));
        assert.equal(new URL(entry.source).protocol, 'https:');
    }
});

test('cost-plan ranges, minimum URPs and facultative contribution retain distinct semantics', () => {
    assert.deepEqual(config.sponsored_rate, { min: 0.065, max: 0.085, step: 0.005, default_rpc: 0.085 });
    assert.deepEqual(config.linked_rate, { min: 0.065, max: 0.22, step: 0.005 });
    assert.deepEqual(config.facultative_rate, { min_if_positive: 0.025, default: 0 });
    assert.equal(config.minimum_urp_units, 10);
    assert.equal(config.costing_disclosure.loading_normal, 0.0325);
    assert.equal(config.costing_disclosure.fcbe_share_of_normal, 0.1348);
    assert.equal(config.costing_disclosure.admin_remido_assistido, 0.0028);
    assert.equal(config.costing_disclosure.loading_facultative, 0);
    assert.equal(config.costing_disclosure.effective_from, '2026-04-01');
    assert.ok(!Object.hasOwn(config, 'incidence_rules'), 'candidate must preserve monthly org flags');
});

test('URPs match the specific published table and never extrapolate November', () => {
    assert.deepEqual(config.urp_by_competence, {
        '2024-11': 188.19, '2025-11': 197, '2026-01': 198, '2026-02': 198.66,
        '2026-03': 200.05, '2026-04': 201.81, '2026-05': 203.16, '2026-06': 204.34,
        '2026-07': 204.66, '2026-08': 204.81, '2026-09': 204.15, '2026-10': 205.83,
    });
    assert.ok(!Object.hasOwn(config.urp_by_competence, '2026-11'));
    for (const month of Object.keys(config.urp_by_competence)) {
        assert.equal(config.urp_sources_by_competence[month], 'https://www.funprespjud.com.br/urp/index.php');
        assert.equal(seed.urp_publication_dates[month].slice(0, 7), month);
        assert.ok(seed.urp_publication_dates[month] <= seed.reviewed_at);
    }
});

test('historical snapshot is complete, isolated, and limited by verified cost-plan/PSS coverage', () => {
    assert.equal(config.historical_rules.length, 1);
    const rule = config.historical_rules[0];
    assert.equal(rule.id, 'pju-jud-2026-04');
    assert.equal(rule.valid_from, '2026-04');
    assert.equal(rule.valid_to, '2027-01');
    assert.equal(rule.tabela_pss, '2026');
    assert.equal(rule.source, config.references.plano_custeio_url);
    assert.deepEqual(rule.configuration.rubric_catalog, catalog);
    assert.deepEqual(rule.configuration.incidence_rules, { fc: true, gas: false, gae: false, aqTreino: false });
    assert.ok(!Object.hasOwn(rule.configuration, 'historical_rules'));
    assert.deepEqual(rule.configuration.urp_by_competence, config.urp_by_competence);
    assert.deepEqual(rule.configuration.sponsored_rate, config.sponsored_rate);
});

test('reviewed candidate passes the actual admin validator and reaches the official engine without widening validity', () => {
    assert.doesNotThrow(() => validatePensionConfigurationInput(config));
    const mapped = mapEffectiveConfigToCourtConfig({ org_slug: 'seed-validation', org_name: 'Seed validation', power_name: 'PJU',
        previdencia_complementar: config } as EffectiveConfig).previdenciaComplementar;
    assert.equal(resolvePensionRubricRule(mapped, 'fc_cj', '2026-07').classification, 'facultativa');
    assert.equal(resolvePensionRubricRule(mapped, 'gas', '2026-07').classification, 'pendente');
    assert.throws(() => resolvePensionRubricRule(mapped, 'fc_cj', '2027-01'), /vigente/);
    assert.throws(() => resolvePensionRubricRule(mapped, 'fc_cj', '2025-12'), /vigente/);
    const historic = mapped!.historicalRules![0];
    assert.equal(historic.tabelaPSS, '2026');
    assert.equal(historic.validFrom, '2026-04');
    assert.equal(historic.validTo, '2027-01');
    assert.equal(resolvePensionRubricRule(historic.configuration, 'diarias', '2026-07').classification, 'excluida');
});

const modulePath = process.env.PENSION_PGLITE_MODULE;
const PGlite = modulePath ? createRequire(resolve('package.json'))(modulePath).PGlite : undefined;
const postgresOptions = { skip: !PGlite && 'Set PENSION_PGLITE_MODULE to an external @electric-sql/pglite module for disposable PostgreSQL checks' };
const previousValue = () => ({
    enabled: true, custom_preserved: 'reviewed-before',
    incidence_rules: { fc: false, gas: true, gae: true, aqTreino: true },
    references: { prior_source: 'https://example.test/previous' },
    urp_by_competence: { '2026-07': 204.66 },
});
async function database(value: any = previousValue(), withPss = true) {
    const db = new PGlite();
    await db.exec(`
        create table public.power_config (
            id bigint generated always as identity primary key,
            power_name text not null, config_key text not null, config_value jsonb not null,
            valid_from date not null, valid_to date,
            unique(power_name,config_key,valid_from));
        create table public.global_config (
            id bigint generated always as identity primary key,
            config_key text not null, config_value jsonb not null,
            valid_from date not null, valid_to date);
    `);
    await db.query('insert into power_config(power_name,config_key,config_value,valid_from) values ($1,$2,$3,$4)',
        ['PJU', 'previdencia_complementar', JSON.stringify(value), '2026-10-19']);
    if (withPss) await db.query('insert into global_config(config_key,config_value,valid_from) values ($1,$2,$3)',
        ['pss_tables', JSON.stringify({ '2026': { ceiling: 8475.55, rates: [{ min: 0, max: 8475.55, rate: .14 }] } }), '2026-01-01']);
    return db;
}
async function expectAtomicFailure(value: any, message: RegExp, withPss = true) {
    const db = await database(value, withPss);
    try {
        await assert.rejects(() => db.exec(sql), message);
        await db.exec('rollback');
        const rows = (await db.query('select config_value,valid_to from power_config')).rows;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].valid_to, null);
        assert.deepEqual(rows[0].config_value, value);
    } finally { await db.close(); }
}

test('PostgreSQL: versions atomically, preserves monthly flags, and reapplication preserves admin edits', postgresOptions, async () => {
    const before = previousValue();
    const db = await database(before);
    try {
        await db.exec(sql);
        let rows = (await db.query('select config_value,valid_from::text,valid_to::text from power_config order by valid_from')).rows;
        assert.equal(rows.length, 2);
        assert.equal(rows[0].valid_to, '2026-11-04');
        assert.deepEqual(rows[0].config_value, before);
        assert.equal(rows[1].valid_from, '2026-11-05');
        assert.equal(rows[1].valid_to, null);
        assert.deepEqual(rows[1].config_value.incidence_rules, before.incidence_rules);
        assert.equal(rows[1].config_value.custom_preserved, 'reviewed-before');
        assert.equal(rows[1].config_value.references.prior_source, before.references.prior_source);
        assert.deepEqual(rows[1].config_value.rubric_catalog, catalog);
        assert.deepEqual(rows[1].config_value.historical_rules, config.historical_rules);
        assert.equal(rows[1].config_value.urp_sources_by_competence['2026-07'], 'https://www.funprespjud.com.br/urp/index.php');
        await db.exec("update power_config set config_value=config_value || '{\"admin_review_marker\":true}'::jsonb where valid_to is null");
        await db.exec(sql);
        rows = (await db.query('select config_value from power_config order by valid_from')).rows;
        assert.equal(rows.length, 2);
        assert.equal(rows[1].config_value.admin_review_marker, true);
    } finally { await db.close(); }
});

test('PostgreSQL: conflicting URP leaves prior configuration untouched', postgresOptions, async () => {
    await expectAtomicFailure({ ...previousValue(), urp_by_competence: { '2026-07': 202.98 } }, /Conflito na URP/);
});

test('PostgreSQL: conflicting catalog interpretation cannot overwrite an admin decision', postgresOptions, async () => {
    await expectAtomicFailure({ ...previousValue(), rubric_catalog: [{ ...known('fc_cj'), classification: 'excluida' }] }, /Conflito de catálogo/);
});

test('PostgreSQL: overlapping historical snapshot is rejected atomically', postgresOptions, async () => {
    await expectAtomicFailure({ ...previousValue(), historical_rules: [{ ...config.historical_rules[0], id: 'other-review' }] }, /Conflito de regra histórica/);
});

test('PostgreSQL: disjoint versions and exact preexisting seeded entries are retained without duplicates', postgresOptions, async () => {
    const priorRule = { ...config.historical_rules[0], id: 'prior', valid_from: '2025-04', valid_to: '2026-01' };
    const priorRubric = { ...known('fc_cj'), valid_from: '2025-01', valid_to: '2026-01' };
    const db = await database({ ...previousValue(), rubric_catalog: [priorRubric, known('fc_cj')], historical_rules: [priorRule] });
    try {
        await db.exec(sql);
        const value = (await db.query('select config_value from power_config where valid_to is null')).rows[0].config_value;
        assert.equal(value.rubric_catalog.length, catalog.length + 1);
        assert.deepEqual(value.rubric_catalog[0], priorRubric);
        assert.equal(value.historical_rules.length, 2);
        assert.deepEqual(value.historical_rules[0], priorRule);
    } finally { await db.close(); }
});

test('PostgreSQL: missing or ambiguous PSS dependency fails before versioning', postgresOptions, async () => {
    await expectAtomicFailure(previousValue(), /Tabela global de PSS ausente ou ambígua/, false);
});

test('PostgreSQL: competing active versions cannot be silently reconciled', postgresOptions, async () => {
    const db = await database();
    try {
        await db.exec("insert into power_config(power_name,config_key,config_value,valid_from) values ('PJU','previdencia_complementar','{}','2026-10-20')");
        await assert.rejects(() => db.exec(sql), /Mais de uma configuração/);
        await db.exec('rollback');
        assert.equal((await db.query('select * from power_config where valid_to is null')).rows.length, 2);
    } finally { await db.close(); }
});

test('PostgreSQL: same-date foreign candidate is never treated as this seed', postgresOptions, async () => {
    const db = await database();
    try {
        await db.exec("update power_config set valid_from='2026-11-05'");
        await assert.rejects(() => db.exec(sql), /Já existe versão PJU/);
        await db.exec('rollback');
        assert.equal((await db.query('select * from power_config')).rows.length, 1);
    } finally { await db.close(); }
});
