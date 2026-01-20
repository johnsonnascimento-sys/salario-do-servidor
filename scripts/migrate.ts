
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Manually parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envVars: Record<string, string> = {};
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envVars = envContent.split('\n').reduce((acc, line) => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            acc[match[1].trim()] = value;
        }
        return acc;
    }, {} as Record<string, string>);
}

const connectionString = envVars.DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local or process.env');
    process.exit(1);
}

console.log('Connecting to database...');

const client = new Client({
    connectionString: connectionString,
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected successfully.');

        const schemaPath = path.resolve(process.cwd(), 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

        console.log('Executing schema.sql...');
        await client.query(schemaSql);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
