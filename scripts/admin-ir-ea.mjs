// Administrative IR configuration release. No credentials or payslips are logged.
// Default is read-only; --rehearse validates SQL twice and rolls back.
// --apply performs the same checks and commits the reviewed configuration.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEnv } from 'vite';
import pg from 'pg';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rehearse = args.includes('--rehearse');
assert(!(apply && rehearse), 'Choose one operation.');
const sqlIndex = args.indexOf('--sql');
assert(sqlIndex >= 0 && args[sqlIndex + 1], 'Specify the reviewed --sql migration.');
const caIndex = args.indexOf('--ca');
const env = loadEnv('production', process.cwd(), '');
assert(env.DATABASE_URL && env.VITE_SUPABASE_URL, 'Administrative configuration is missing.');
const database = new URL(env.DATABASE_URL);
const project = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
assert.equal(database.hostname, `db.${project}.supabase.co`, 'Database and application project differ.');
const client = new pg.Client({ connectionString: env.DATABASE_URL, ssl: {
    rejectUnauthorized: true,
    ca: readFileSync(caIndex >= 0 ? args[caIndex + 1] : 'supabase-ca.crt.local', 'utf8'),
} });
let transaction = false;
try {
    await client.connect();
    await client.query(apply || rehearse ? 'BEGIN' : 'BEGIN READ ONLY');
    transaction = true;
    const snapshot = async () => ({
        global: (await client.query('SELECT * FROM global_config ORDER BY id')).rows,
        power: (await client.query('SELECT * FROM power_config ORDER BY id')).rows,
        org: (await client.query('SELECT * FROM org_config ORDER BY org_slug')).rows,
    });
    const before = await snapshot();
    const active = before.global.filter(row => row.config_key === 'ir_deduction' && !row.valid_to);
    assert.equal(active.length, 1, 'Exactly one active global IR configuration is required.');
    console.log(`Project ${project}: one active IR configuration; ${before.org.length} organs. No user data accessed.`);
    if (apply || rehearse) {
        await client.query("SET LOCAL lock_timeout = '5s'");
        const sql = readFileSync(args[sqlIndex + 1], 'utf8');
        await client.query(sql);
        const after = await snapshot();
        assert.deepEqual(after.power, before.power, 'Power configuration changed.');
        assert.deepEqual(after.org, before.org, 'Organ configuration changed.');
        const unrelated = rows => rows.filter(row => row.config_key !== 'ir_deduction');
        assert.deepEqual(unrelated(after.global), unrelated(before.global), 'Other global configuration changed.');
        for (const row of before.global.filter(row => row.config_key === 'ir_deduction')) {
            const preserved = after.global.find(item => item.id === row.id);
            assert(preserved, 'Historical IR version was removed.');
            assert.deepEqual(preserved.config_value, row.config_value, 'Historical IR data was overwritten.');
        }
        const next = after.global.filter(row => row.config_key === 'ir_deduction' && !row.valid_to);
        assert.equal(next.length, 1, 'Migration must leave one active version.');
        for (const key of ['2025_jan', '2025_maio', '2026_jan']) {
            const table = next[0].config_value[key];
            assert(table?.brackets?.length === 5 && table.rra && table.reference, `Missing reviewed IR table: ${key}`);
        }
        await client.query(sql);
        assert.deepEqual(await snapshot(), after, 'Migration must be idempotent.');
        if (apply) {
            writeFileSync('ir-ea-config-backup.json.local', JSON.stringify(before, null, 2));
            await client.query('COMMIT'); transaction = false;
            console.log('COMMITTED: versioned global IR only; history preserved; idempotence verified.');
        } else {
            await client.query('ROLLBACK'); transaction = false;
            console.log('REHEARSAL PASSED: history, isolation and idempotence verified; rolled back.');
        }
    } else {
        await client.query('ROLLBACK'); transaction = false;
        console.log('READ ONLY: configuration unchanged.');
    }
} catch (error) {
    if (transaction) await client.query('ROLLBACK').catch(() => {});
    console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : error.code || 'Administrative verification failed.');
    process.exitCode = 1;
} finally {
    await client.end();
}
