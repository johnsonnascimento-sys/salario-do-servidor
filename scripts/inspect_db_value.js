import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        console.log('Connected.');

        const res = await client.query(`
            SELECT config_key, config_value, pg_typeof(config_value) as type
            FROM power_config
            WHERE power_name = 'PJU' AND config_key = 'salary_bases'
        `);

        if (res.rows.length === 0) {
            console.log('No record found for salary_bases!');
        } else {
            const row = res.rows[0];
            console.log('Type in DB:', row.type);
            console.log('Value type in JS:', typeof row.config_value);
            // console.log('Value content:', JSON.stringify(row.config_value, null, 2));

            // Check deep access
            if (row.config_value && row.config_value.analista) {
                console.log('Includes A1:', Object.keys(row.config_value.analista).includes('A1'));
                console.log('Value A1:', row.config_value.analista['A1']);
            } else {
                console.log('Cannot access analista property!');
            }
        }


    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
