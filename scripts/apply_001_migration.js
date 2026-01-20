
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// User provided (Pooler): postgres://postgres.fdzuykiwqzzmlzjtnbfi:[TYeDN3JhvglQsQtu]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
const RAW_CONNECTION_STRING = "postgres://postgres.fdzuykiwqzzmlzjtnbfi:[TYeDN3JhvglQsQtu]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres";
const connectionString = RAW_CONNECTION_STRING.replace(/:\[(.*?)\]@/, ':$1@');

const client = new Client({
    connectionString: connectionString,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to DEV database.');

        const sqlPath = path.resolve(__dirname, '../src/database/migrations/001_create_agency_schema.sql');
        console.log('Reading migration file:', sqlPath);
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log('Executing SQL...');
        await client.query(sql);
        console.log('Migration executed successfully.');

        console.log('Verifying "agencies" table...');
        const res = await client.query('SELECT count(*) as count, slug, name FROM agencies GROUP BY id, slug, name');

        console.log('Verification Result:', res.rows);

    } catch (err) {
        console.error('Error executing migration:', err);
    } finally {
        await client.end();
    }
}

run();
