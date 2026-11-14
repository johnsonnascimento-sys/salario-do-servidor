import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resolvePensionUrp, validateLinkedPensionSalary } from '../src/services/agency/engine/modules/pensionUrp';
import { calculateComplementaryPension, calculatePensionRetroactives } from '../src/services/agency/engine/modules/pensionCalculations';
import { INITIAL_STATE, type PrevidenciaComplementarConfig } from '../src/types';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';

const seed = JSON.parse(await readFile(resolve('supabase/seeds/pju_pension_catalog_2026.json'), 'utf8'));
const config: PrevidenciaComplementarConfig = {
    enabled: true, scope: 'test', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
    sponsoredRate: { min: .065, max: .085, step: .005, defaultRpc: .085 },
    linkedRate: { min: .065, max: .22, step: .005 }, facultativeRate: { minIfPositive: .025, default: 0 },
    minimumUrpUnits: seed.config_value.minimum_urp_units,
    urpByCompetence: { ...seed.config_value.urp_by_competence, '2026-11': 206.11 },
    urpSourcesByCompetence: { ...seed.config_value.urp_sources_by_competence, '2026-11': 'https://www.funprespjud.com.br/urp/index.php' },
};
const params = () => mapStateToAgencyParams({ ...INITIAL_STATE, regimePrev: 'antigo', funprespParticipacao: 'vinculado',
    funprespAliq: .065, funprespVinculadaInicio: '2026-10', funprespBaseIntegral: 2058.30, tabelaPSS: 'teste', anoRef: 2026, mesRef: 'NOVEMBRO' }, 'jmu', {
    previdenciaComplementar: structuredClone(config),
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } },
});

test('official reference examples: October subscription, annual reference and November publication', () => {
    assert.equal(resolvePensionUrp(config, '2026-11', '2026-10').reference?.minimo, 2058.30);
    assert.equal(resolvePensionUrp(config, '2026-11', '2025-07').reference?.minimo, 1970);
    assert.equal(resolvePensionUrp(config, '2026-11', '2026-11').reference?.minimo, 2061.10);
    assert.equal(resolvePensionUrp(config, '2027-01', '2026-10').reference?.minimo, 2061.10);
    assert.equal(resolvePensionUrp(config, '2026-12', '2026-10').reference?.competencia, '2026-10');
});

test('missing reference, invalid values, invalid source and future dates remain pending without extrapolation', () => {
    for (const value of [undefined, 0, -1, NaN, Infinity]) {
        const broken = { ...config, urpByCompetence: { '2026-11': value as number } };
        assert.match(resolvePensionUrp(broken, '2026-11', '2026-11').error!, /2026-11/);
    }
    for (const source of ['', ' ', undefined, 123, {}]) {
        const broken = { ...config, urpSourcesByCompetence: { '2026-11': source } } as any;
        assert.match(resolvePensionUrp(broken, '2026-11', '2026-11').error!, /2026-11/);
    }
    for (const units of [undefined, 0, NaN, Infinity, -1]) {
        assert.match(resolvePensionUrp({ ...config, minimumUrpUnits: units }, '2026-11', '2026-11').error!, /mínima/);
    }
    assert.match(resolvePensionUrp(config, '2026-11', '2026-12').error!, /início/);
    assert.match(resolvePensionUrp(config, '2026-13', '2026-10').error!, /competência/);
    assert.match(resolvePensionUrp(config, '2026-11', '').error!, /início/);
    assert.match(resolvePensionUrp({ ...config, urpByCompetence: seed.config_value.urp_by_competence }, '2026-11', '2026-11').error!, /2026-11/);
});

test('engine enforces precise minimum and maximum and records reference in monthly, 13th and historical memory', () => {
    const p = params();
    const ref = resolvePensionUrp(config, '2026-11', '2026-10').reference!;
    assert.match(validateLinkedPensionSalary(400, ref)!, /2\.058,30/);
    for (const amount of [400, 2058.29]) assert.throws(() => calculateComplementaryPension({ ...p, funprespBaseIntegral: amount }, 9000, 9000), /mínimo.*2\.058,30/);
    for (const amount of [2058.30, 9000]) assert.equal(calculateComplementaryPension({ ...p, funprespBaseIntegral: amount }, 9000, 9000).baseComplementar, amount);
    assert.throws(() => calculateComplementaryPension({ ...p, funprespBaseIntegral: 9000.01 }, 9000, 9000), /exceder/);
    for (const kind of ['mensal', '13'] as const) {
        const memory = calculateComplementaryPension(p, 9000, 9000, kind);
        assert.deepEqual(memory.urpReference, ref);
        assert.equal(memory.normal, 133.79);
        assert.equal(memory.patrocinador, 0);
    }
    const historical = calculatePensionRetroactives({ ...p, pensionRetroEntries: [{ id: 'old', competencia: '2026-10',
        modo: 'completo', tipo: 'mensal', tabelaPSS: 'teste', regimePrev: 'antigo', participacao: 'vinculado',
        inicioVinculado: '2026-10', salarioParticipacaoVinculado: 2058.30, aliquotaNormal: .065,
        baseRppsOriginal: 8000, baseRppsDevida: 9000, baseComplementarOriginal: 8000, baseComplementarDevida: 9000,
        contribuicaoRppsRecolhida: 800, contribuicaoComplementarRecolhida: 0 }] });
    assert.deepEqual(historical[0].urpReference, ref);
});

const sql = await readFile(resolve('supabase/migrations/20261114_pju_urp_november.sql'), 'utf8');
const modulePath = process.env.PENSION_PGLITE_MODULE;
const PGlite = modulePath ? createRequire(resolve('package.json'))(modulePath).PGlite : undefined;
test('PostgreSQL candidate preserves previous JSON, historical rules, idempotence and atomic conflict failure',
    { skip: !PGlite && 'PENSION_PGLITE_MODULE required for disposable PostgreSQL' }, async () => {
    const db = new PGlite();
    try {
        await db.exec(`create table power_config (id bigint generated always as identity primary key,
            power_name text, config_key text, config_value jsonb, valid_from date, valid_to date,
            unique(power_name,config_key,valid_from));`);
        const before = { ...seed.config_value, marker: 'preserve' };
        await db.query("insert into power_config(power_name,config_key,config_value,valid_from) values ('PJU','previdencia_complementar',$1,'2026-11-05')", [JSON.stringify(before)]);
        await db.exec(sql);
        await db.exec(sql);
        const rows = (await db.query('select config_value,valid_to::text from power_config order by valid_from')).rows;
        assert.equal(rows.length, 2);
        assert.deepEqual(rows[0].config_value, before);
        assert.equal(rows[0].valid_to, '2026-11-13');
        assert.deepEqual(rows[1].config_value, { ...before,
            urp_by_competence: { ...before.urp_by_competence, '2026-11': 206.11 },
            urp_sources_by_competence: { ...before.urp_sources_by_competence, '2026-11': 'https://www.funprespjud.com.br/urp/index.php' } });
        for (const change of ["'{urp_by_competence,2026-11}', '999'", "'{urp_sources_by_competence,2026-11}', '\"conflicting source\"'"]) {
            await db.exec(`update power_config set config_value=jsonb_set(config_value,${change}) where valid_to is null`);
            const beforeFailure = (await db.query('select * from power_config order by id')).rows;
            await assert.rejects(() => db.exec(sql), /Conflito/);
            await db.exec('rollback');
            assert.deepEqual((await db.query('select * from power_config order by id')).rows, beforeFailure);
            await db.exec("update power_config set config_value=jsonb_set(jsonb_set(config_value,'{urp_by_competence,2026-11}','206.11'),'{urp_sources_by_competence,2026-11}','\"https://www.funprespjud.com.br/urp/index.php\"') where valid_to is null");
        }
    } finally { await db.close(); }
});
