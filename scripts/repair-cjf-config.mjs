// Administrative repair of the missing CJF registration; no new calculation rules.
// Default: read-only verification. --prepare writes the guarded migration locally.
// --rehearse executes it in a transaction and rolls back. --apply commits only
// after full effective-config and engine-result equality has been established.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer, loadEnv } from 'vite';
import pg from 'pg';

const args = process.argv.slice(2);
const envDirIndex = args.indexOf('--env-dir');
const envDir = resolve(envDirIndex < 0 ? '.' : args[envDirIndex + 1]);
const env = loadEnv('production', envDir, '');
assert(env.DATABASE_URL && env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY,
    'Configure the administrative database URL and public application configuration.');
const project = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
const dbTarget = new URL(env.DATABASE_URL);
assert(dbTarget.hostname === `db.${project}.supabase.co`, 'Database and public project must match.');
const migrationPath = 'supabase/migrations/20261106_register_cjf_config.sql';
const prepare = args.includes('--prepare');
const apply = args.includes('--apply');
const rehearse = args.includes('--rehearse');
assert([prepare, apply, rehearse].filter(Boolean).length <= 1, 'Choose a single operation.');
const caIndex = args.indexOf('--ca');
const caPath = caIndex < 0 ? env.PGSSLROOTCERT : args[caIndex + 1];
const client = new pg.Client({ connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: true, ...(caPath ? { ca: readFileSync(caPath, 'utf8') } : {}) } });
const server = await createServer({ configFile: false, mode: 'production', envDir,
    server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
let inTransaction = false;
let failed = false;
let committed = false;
try {
    const { ConfigService } = await server.ssrLoadModule('/src/services/config/ConfigService.ts');
    const { deepMergeMultiple } = await server.ssrLoadModule('/src/services/config/mergeConfig.ts');
    const { mapEffectiveConfigToCourtConfig: adapt } = await server.ssrLoadModule('/src/services/config/mapEffectiveConfig.ts');
    const { mapStateToAgencyParams: params } = await server.ssrLoadModule('/src/services/agency/adapters/stateToParams.ts');
    const { AgencyCalculationEngine } = await server.ssrLoadModule('/src/services/agency/engine/AgencyCalculationEngine.ts');
    const { INITIAL_STATE } = await server.ssrLoadModule('/src/types.ts');
    const service = new ConfigService();
    // Compiled TypeScript private methods are used only by this administrative
    // verification, to capture the exact fallback shipped in the checked-out app.
    const fallback = service.getTransitionalOrgFallback('cjf');
    assert(fallback, 'This repair requires the reviewed CJF fallback.');
    await client.connect();
    await client.query(apply || rehearse ? 'BEGIN' : 'BEGIN READ ONLY');
    inTransaction = true;
    if (apply || rehearse) {
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query('LOCK TABLE global_config, power_config, org_config IN SHARE ROW EXCLUSIVE MODE');
    }
    const snapshot = async () => ({
        global: (await client.query('SELECT * FROM global_config ORDER BY id')).rows,
        power: (await client.query('SELECT * FROM power_config ORDER BY id')).rows,
        org: (await client.query('SELECT * FROM org_config ORDER BY org_slug')).rows,
    });
    const before = await snapshot();
    const toConfig = rows => Object.fromEntries(rows.filter(r => !r.valid_to).map(r => [r.config_key, r.config_value]));
    const activePower = before.power.filter(r => r.power_name === 'PJU' && !r.valid_to);
    for (const rows of [before.global.filter(r => !r.valid_to), activePower]) {
        assert.equal(new Set(rows.map(r => r.config_key)).size, rows.length, 'Duplicate active configuration keys.');
    }
    const global = toConfig(before.global);
    const power = toConfig(activePower);
    const base = deepMergeMultiple(global, power);
    const effective = org => ({ ...deepMergeMultiple(base, org.configuration),
        org_slug: org.org_slug, org_name: org.org_name, power_name: org.power_name });
    const baseline = effective(fallback);
    const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const minimalOverride = (inherited, target) => {
        const result = {};
        for (const [key, value] of Object.entries(target)) {
            try { assert.deepEqual(inherited?.[key], value); continue; } catch {}
            result[key] = isObject(value) && isObject(inherited?.[key])
                ? minimalOverride(inherited[key], value) : value;
        }
        return result;
    };
    const candidate = { ...fallback, configuration: minimalOverride(base, deepMergeMultiple(base, fallback.configuration)) };
    assert.deepEqual(effective(candidate), baseline, 'Minimal override changes effective rules.');
    const existing = before.org.find(r => r.org_slug === 'cjf');
    if (existing) {
        assert.equal(existing.power_name, 'PJU');
        assert.deepEqual(existing.configuration, candidate.configuration, 'Existing CJF differs; manual review required.');
    }
    const sqlJson = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
    if (prepare) {
        assert(!existing, 'CJF is already registered; do not regenerate the repair.');
        const expectedPower = { dailies_rules: power.dailies_rules, payroll_rules: power.payroll_rules };
        const sql = `-- CJF only: move the published 5114567 fallback to minimal database overrides.\n-- No changes to legal rates or engine. Preserve global/PJU history and all other organs.\n-- Prepared against project ${project}; verified with scripts/repair-cjf-config.mjs.\n-- Run in an administrative transaction; the verifier rehearses with ROLLBACK.\nDO $repair$\nDECLARE\n  expected_power jsonb := ${sqlJson(expectedPower)};\n  proposed_config jsonb := ${sqlJson(candidate.configuration)};\n  actual_power jsonb;\n  current_config jsonb;\n  current_power text;\nBEGIN\n  LOCK TABLE global_config, power_config, org_config IN SHARE ROW EXCLUSIVE MODE;\n  SELECT configuration, power_name INTO current_config, current_power FROM org_config WHERE org_slug = 'cjf';\n  IF FOUND THEN\n    IF current_config IS DISTINCT FROM proposed_config OR current_power IS DISTINCT FROM 'PJU' THEN\n      RAISE EXCEPTION 'Existing CJF configuration differs: refusing to overwrite';\n    END IF;\n    RETURN;\n  END IF;\n  IF (SELECT count(*) FROM power_config WHERE power_name = 'PJU' AND valid_to IS NULL AND config_key IN ('dailies_rules','payroll_rules')) <> 2 THEN\n    RAISE EXCEPTION 'Missing or duplicate active PJU rules';\n  END IF;\n  SELECT jsonb_object_agg(config_key,config_value) INTO actual_power FROM power_config\n    WHERE power_name = 'PJU' AND valid_to IS NULL AND config_key IN ('dailies_rules','payroll_rules');\n  IF actual_power IS DISTINCT FROM expected_power THEN\n    RAISE EXCEPTION 'PJU configuration changed: recalculate and review the minimal override';\n  END IF;\n  INSERT INTO org_config (org_slug, org_name, power_name, configuration)\n    VALUES ('cjf', 'Justiça Federal (CJF e TRFs)', 'PJU', proposed_config);\nEND\n$repair$;\n`;
        writeFileSync(migrationPath, sql);
        console.log('Guarded migration prepared:', migrationPath);
        console.log('Minimal CJF overrides:', JSON.stringify(candidate.configuration, null, 2));
    }
    if (apply || rehearse) {
        // Backup contains configuration tables only, never credentials or payslips.
        if (apply) writeFileSync('cjf-config-backup.json.local', JSON.stringify(before, null, 2));
        await client.query(readFileSync(migrationPath, 'utf8'));
        const after = await snapshot();
        assert.deepEqual(after.global, before.global);
        assert.deepEqual(after.power, before.power);
        assert.deepEqual(after.org.filter(r => r.org_slug !== 'cjf'), before.org.filter(r => r.org_slug !== 'cjf'));
        const inserted = after.org.find(r => r.org_slug === 'cjf');
        assert.deepEqual(effective(inserted), baseline, 'Database insertion changes effective rules.');
        // A second execution must be a complete no-op, including timestamps.
        await client.query(readFileSync(migrationPath, 'utf8'));
        assert.deepEqual(await snapshot(), after, 'Migration is not idempotent.');
    }
    const oldConfig = adapt(baseline);
    const newConfig = adapt(effective(candidate));
    const engine = new AgencyCalculationEngine();
    const functions = [oldConfig.careerCatalog.noFunctionCode, ...Object.keys(oldConfig.bases.funcoes)];
    const scenarios = [];
    for (const cargo of Object.keys(oldConfig.bases.salario)) {
        const standards = Object.keys(oldConfig.bases.salario[cargo]);
        for (const padrao of [standards[0], standards.at(-1)]) {
            for (const funcao of functions) {
                scenarios.push({ cargo, padrao, funcao, aqTituloVR: 2, aqTreinoVR: 0.2,
                    heQtd50: 4, heQtd100: 2, dependentes: 1 });
            }
        }
    }
    const cargo = Object.keys(oldConfig.bases.salario)[0];
    const baseState = { ...INITIAL_STATE, cargo, padrao: Object.keys(oldConfig.bases.salario[cargo])[0],
        funcao: oldConfig.careerCatalog.noFunctionCode, anoRef: 2026, mesRef: 'NOVEMBRO',
        tabelaIR: Object.keys(oldConfig.historico_ir)[0], tabelaPSS: Object.keys(oldConfig.historico_pss)[0],
        periodo: oldConfig.adjustment_schedule?.[0]?.period ?? 0 };
    for (const flag of [null, 'diariasAssessoramentoMagistrado', 'diariasAcompanhamentoIntegral', 'diariasEquipeTrabalho']) {
        for (let count = 0; count <= 4; count++) {
            const trechos = ['ida_origem', 'ida_destino', 'volta_origem', 'volta_destino'].slice(0, count);
            scenarios.push({ diariasQtd: 3.5, diariasEmbarque: 'completo', diariasTrechosTransporte: trechos,
                diariasModoDesconto: 'periodo', diariasDataInicio: '2026-11-06', diariasDataFim: '2026-11-09',
                diariasAutoridadeAssistida: 'desembargador_trf', diariasEquipeTrabalhoMaiorCargo: 'analista',
                diariasAssessoramentoMagistrado: flag === 'diariasAcompanhamentoIntegral' || flag === 'diariasAssessoramentoMagistrado',
                ...(flag ? { [flag]: true } : {}) });
        }
    }
    scenarios.push({ diariasQtd: 4, diariasModoDesconto: 'manual', diariasExtHospedagem: true,
        diariasExtAlimentacao: true, diariasExtTransporte: true });
    scenarios.push({ regimePrev: 'rpc', funprespParticipacao: 'nao', rubricasExtras: [
        { id: 'repair-credit', tipo: 'C', descricao: 'Verificação', valor: 200, ir: true, pss: true },
        { id: 'repair-debit', tipo: 'D', descricao: 'Verificação', valor: 50 },
    ] });
    for (const scenario of scenarios) {
        const state = { ...baseState, ...scenario };
        const oldResult = await engine.calculateTotal(params(state, 'cjf', oldConfig));
        const newResult = await engine.calculateTotal(params(state, 'cjf', newConfig));
        assert(Number.isFinite(oldResult.netSalary) && oldResult.breakdown.vencimento > 0, 'Invalid baseline calculation.');
        assert.deepEqual(newResult, oldResult, 'Calculation regression.');
    }
    console.log(`Verified: exact effective configuration; ${scenarios.length} engine scenarios; project ${project}.`);
    if (apply) {
        await client.query('COMMIT'); inTransaction = false; committed = true;
        service.clearCache();
        const published = await service.getEffectiveConfig('cjf');
        assert.deepEqual(published, baseline, 'Public configuration differs after commit.');
        console.log('COMMITTED: CJF registered; public configuration matches the baseline.');
    } else {
        await client.query('ROLLBACK'); inTransaction = false;
        console.log(rehearse ? 'REHEARSAL PASSED: insertion and second execution rolled back.' : 'READ ONLY: no database changes.');
    }
} catch (error) {
    if (inTransaction) await client.query('ROLLBACK').catch(() => {});
    if (committed) console.error('CJF registration is already COMMITTED; post-commit verification failed. Do not assume rollback.');
    console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : (error.code || error.message));
    failed = true;
} finally {
    await client.end();
    await server.close();
}
if (failed) process.exitCode = 1;
