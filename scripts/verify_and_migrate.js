import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local manually to get DATABASE_URL
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/DATABASE_URL="([^"]+)"/);

if (!match) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const connectionString = match[1];
const client = new pg.Client({ connectionString });

async function run() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const sqlPath = path.resolve(__dirname, '../MANUAL_MIGRATE.sql');
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        console.log('Executing migration...');
        const res = await client.query(sql);
        console.log('Migration executed successfully.');

        // Check counts
        const orgCount = await client.query('SELECT count(*) FROM org_config');
        console.log('Organications in config:', orgCount.rows[0].count);

    } catch (err) {
        console.error('Migration failed:', err);
        fs.writeFileSync(path.join(__dirname, 'migration_error.log'), JSON.stringify(err, null, 2));
    } finally {
        await client.end();
    }
}

run();
