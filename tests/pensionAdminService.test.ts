import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AdminService } from '../src/services/admin/AdminService';
import { configurationToday } from '../src/services/admin/configVersionValidation';

const seed = JSON.parse(await readFile(resolve('supabase/seeds/pju_pension_catalog_2026.json'), 'utf8'));
const config = () => structuredClone(seed.config_value);
const today = configurationToday();
const previous = (patch: Record<string, unknown> = {}) => ({ id: 'published', power_name: 'PJU',
    config_key: 'previdencia_complementar', config_value: config(), valid_from: '2020-01-01', valid_to: null, ...patch });
const payload = (patch: Record<string, unknown> = {}): any => ({ power_name: 'PJU', config_key: 'previdencia_complementar',
    config_value: config(), valid_from: today, valid_to: null, ...patch });

function backend(responses: Array<{ data: any; error?: any }> = []) {
    const reads: any[] = [];
    const writes: any[] = [];
    const rpcs: any[] = [];
    const queued = [...responses];
    const api = {
        from(table: string) {
            const state: any = { table, filters: [] };
            const finish = async () => {
                if (state.write) return { data: { id: 'written', ...state.write }, error: null };
                reads.push(structuredClone(state));
                const response = queued.shift();
                assert.ok(response, 'unexpected Supabase read; only this mock is available');
                return { error: null, ...response };
            };
            const chain: any = {
                select(columns: string) { state.columns = columns; return chain; },
                eq(column: string, value: unknown) { state.filters.push([column, value]); return chain; },
                limit(count: number) { state.limit = count; return chain; },
                upsert(value: any) { state.write = structuredClone(value); writes.push({ table, value: structuredClone(value) }); return chain; },
                single: finish,
                maybeSingle: finish,
                then(resolveValue: any, rejectValue: any) { return finish().then(resolveValue, rejectValue); },
            };
            return chain;
        },
        async rpc(name: string, args: any) {
            rpcs.push({ name, args: structuredClone(args) });
            return { data: null, error: null };
        },
    };
    (globalThis as any).__pensionSupabaseMock = api;
    return { reads, writes, rpcs };
}
const noWrites = (mock: ReturnType<typeof backend>) => {
    assert.deepEqual(mock.writes, [], 'guard must run before any upsert');
    assert.deepEqual(mock.rpcs, [], 'guard must run before any versioning RPC');
};
async function blocked(fn: () => Promise<unknown>, mock: ReturnType<typeof backend>, message?: RegExp) {
    await assert.rejects(fn, message);
    noWrites(mock);
}

test('upsert cannot overwrite a published pension id, including disguising it with another config key', async () => {
    for (const key of ['previdencia_complementar', 'other_setting']) {
        const mock = backend([{ data: previous() }]);
        await blocked(() => AdminService.upsertPowerConfig(payload({ id: 'published', config_key: key })), mock, /versionamento/);
        assert.deepEqual(mock.reads[0].filters, [['id', 'published']]);
    }
    const mock = backend([{ data: previous({ config_key: 'other_setting' }) }]);
    await blocked(() => AdminService.upsertPowerConfig(payload({ id: 'published' })), mock, /versionamento/);
});

test('id-less pension insertion cannot bypass an existing active or inactive configuration', async () => {
    for (const valid_to of [null, '2025-01-01']) {
        const mock = backend([{ data: [previous({ valid_to })] }]);
        await blocked(() => AdminService.upsertPowerConfig(payload()), mock, /versionamento/);
        assert.deepEqual(mock.reads[0].filters, [['power_name', 'PJU'], ['config_key', 'previdencia_complementar']]);
    }
});

test('first reviewed pension configuration may be inserted, preserving parsed JSON and selected power', async () => {
    const mock = backend([{ data: [] }]);
    const submitted = payload({ config_value: JSON.stringify(config()) });
    const result = await AdminService.upsertPowerConfig(submitted);
    assert.equal(mock.writes.length, 1);
    assert.equal(mock.writes[0].table, 'power_config');
    assert.equal(mock.writes[0].value.power_name, 'PJU');
    assert.deepEqual(mock.writes[0].value.config_value, config());
    assert.equal(result.id, 'written');
    assert.deepEqual(mock.rpcs, []);
});

test('power versioning rejects changes of identity, nonposterior or invalid dates, future schedule and inactive origin before RPC', async () => {
    const cases = [
        { before: previous(), change: { power_name: 'OTHER' }, message: /Preserve poder/ },
        { before: previous(), change: { config_key: 'other_setting' }, message: /Preserve poder/ },
        { before: previous({ config_key: 'other_setting' }), change: {}, message: /Preserve poder/ },
        { before: previous(), change: { valid_from: '2020-01-01' }, message: /após|posterior/ },
        { before: previous(), change: { valid_from: '2019-12-31' }, message: /após|posterior/ },
        { before: previous(), change: { valid_from: '2026-02-30' }, message: /data válida/ },
        { before: previous(), change: { valid_from: 'not-a-date' }, message: /data válida/ },
        { before: previous(), change: { valid_from: '9999-01-01' }, message: /futuras/ },
        { before: previous({ valid_from: '9999-01-01' }), change: {}, message: /após|posterior/ },
        { before: previous({ valid_to: '2025-01-01' }), change: {}, message: /ativa/ },
        { before: previous(), change: { valid_to: today }, message: /permanecer ativa/ },
    ];
    for (const item of cases) {
        const mock = backend([{ data: item.before }]);
        await blocked(() => AdminService.versionPowerConfig(payload({ previous_id: 'published', ...item.change })), mock, item.message);
        assert.ok(mock.reads[0].columns.includes('valid_to'));
    }
});

test('immutable catalog/history validation is reached on the real versioning route before any RPC', async () => {
    for (const mutate of [
        (next: any) => { next.rubric_catalog[0].classification = 'excluida'; },
        (next: any) => { next.historical_rules[0].configuration.sponsored_rate.max = .09; },
        (next: any) => { next.historical_rules = []; },
    ]) {
        const next = config();
        mutate(next);
        const mock = backend([{ data: previous() }]);
        await blocked(() => AdminService.versionPowerConfig(payload({ previous_id: 'published', config_value: next })), mock, /reescrita|preserve/);
    }
});

test('valid real versioning route invokes exactly the intended RPC with preserved identity and previous id', async () => {
    const mock = backend([{ data: previous() }]);
    await AdminService.versionPowerConfig(payload({ previous_id: 'published' }));
    assert.deepEqual(mock.writes, []);
    assert.equal(mock.rpcs.length, 1);
    assert.deepEqual(mock.rpcs[0], { name: 'admin_version_power_config', args: {
        p_previous_id: 'published', p_power_name: 'PJU', p_config_key: 'previdencia_complementar',
        p_config_value: config(), p_valid_from: today, p_valid_to: null,
    } });
});

test('failed origin reads block power upsert/version and org upsert without writes', async () => {
    for (const invoke of [
        () => AdminService.upsertPowerConfig(payload({ id: 'published' })),
        () => AdminService.upsertPowerConfig(payload()),
        () => AdminService.versionPowerConfig(payload({ previous_id: 'published' })),
        () => AdminService.upsertOrgConfig({ org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', configuration: {} }),
    ]) {
        const mock = backend([{ data: null, error: { message: 'read failed' } }]);
        await blocked(invoke, mock, /conferir/);
    }
});

test('org route cannot shadow or erase catalog/history arrays before upsert', async () => {
    const org = (configuration: any): any => ({ org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', configuration });
    for (const field of ['rubric_catalog', 'historical_rules']) {
        const supplied = { previdencia_complementar: { [field]: config()[field] } };
        const created = backend([{ data: null }]);
        await blocked(() => AdminService.upsertOrgConfig(org(supplied)), created, /catálogo e histórico/);
        const changed = structuredClone(supplied);
        changed.previdencia_complementar[field][0].source = 'https://example.test/local-rewrite';
        const edited = backend([{ data: { configuration: supplied } }]);
        await blocked(() => AdminService.upsertOrgConfig(org(changed)), edited, /catálogo e histórico/);
        const removed = backend([{ data: { configuration: supplied } }]);
        await blocked(() => AdminService.upsertOrgConfig(org({})), removed, /catálogo e histórico/);
    }
});

test('org route permits unrelated partial flags and exact previously stored arrays', async () => {
    const preserved = { previdencia_complementar: { rubric_catalog: config().rubric_catalog } };
    for (const [before, after] of [
        [null, { previdencia_complementar: { incidence_rules: { fc: true } } }],
        [{ configuration: preserved }, preserved],
    ]) {
        const mock = backend([{ data: before }]);
        const result = await AdminService.upsertOrgConfig({ org_slug: 'jmu', org_name: 'JMU', power_name: 'PJU', configuration: after as any });
        assert.equal(result.id, 'written');
        assert.equal(mock.writes.length, 1);
        assert.deepEqual(mock.writes[0].value.configuration, after);
        assert.deepEqual(mock.rpcs, []);
    }
});
