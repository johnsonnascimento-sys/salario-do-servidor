import { Client } from 'pg';

const DEV_DB_URL = 'postgresql://postgres:TYeDN3JhvglQsQtu@db.fdzuykiwqzzmlzjtnbfi.supabase.co:5432/postgres';

async function fullAnalysis() {
    console.log('🔍 FULL DATABASE ANALYSIS\n');
    console.log('='.repeat(60));

    const client = new Client({
        connectionString: DEV_DB_URL,
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // 1. List all tables
        console.log('📋 1. ALL TABLES IN PUBLIC SCHEMA:');
        const allTables = await client.query(`
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.table(allTables.rows);

        // 2. Check specific tables
        console.log('\n📋 2. CHECKING REQUIRED TABLES:');
        const requiredTables = ['shared_tables', 'regime_tables', 'courts', 'settings'];
        for (const tableName of requiredTables) {
            const exists = allTables.rows.find(r => r.table_name === tableName);
            console.log(`   ${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'EXISTS' : 'MISSING'}`);
        }

        // 3. Check RLS status on each table
        console.log('\n📋 3. RLS STATUS:');
        const rlsStatus = await client.query(`
            SELECT relname as table_name, 
                   relrowsecurity as rls_enabled,
                   relforcerowsecurity as rls_forced
            FROM pg_class 
            JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
            WHERE pg_namespace.nspname = 'public'
            AND relname IN ('shared_tables', 'regime_tables', 'courts', 'settings')
        `);
        console.table(rlsStatus.rows);

        // 4. Check policies
        console.log('\n📋 4. ALL POLICIES:');
        const policies = await client.query(`
            SELECT tablename, policyname, permissive, roles, cmd, 
                   SUBSTRING(qual::text, 1, 50) as condition
            FROM pg_policies
            WHERE schemaname = 'public'
            ORDER BY tablename, policyname
        `);
        if (policies.rows.length === 0) {
            console.log('   ⚠️ NO POLICIES FOUND!');
        } else {
            console.table(policies.rows);
        }

        // 5. Count rows in each table
        console.log('\n📋 5. DATA COUNT:');
        for (const tableName of requiredTables) {
            const exists = allTables.rows.find(r => r.table_name === tableName);
            if (exists) {
                try {
                    const count = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`   ${tableName}: ${count.rows[0].count} rows`);
                } catch (e: any) {
                    console.log(`   ${tableName}: ERROR - ${e.message}`);
                }
            }
        }

        // 6. Sample data from shared_tables
        console.log('\n📋 6. SAMPLE DATA FROM shared_tables:');
        try {
            const sample = await client.query(`
                SELECT id, type, version, is_active, 
                       SUBSTRING(description, 1, 30) as description
                FROM shared_tables 
                ORDER BY created_at DESC
                LIMIT 5
            `);
            if (sample.rows.length === 0) {
                console.log('   ⚠️ TABLE IS EMPTY!');
            } else {
                console.table(sample.rows);
            }
        } catch (e: any) {
            console.log(`   ERROR: ${e.message}`);
        }

        // 7. Sample data from regime_tables
        console.log('\n📋 7. SAMPLE DATA FROM regime_tables:');
        try {
            const sample = await client.query(`
                SELECT id, regime, type, version, is_active
                FROM regime_tables 
                ORDER BY created_at DESC
                LIMIT 5
            `);
            if (sample.rows.length === 0) {
                console.log('   ⚠️ TABLE IS EMPTY!');
            } else {
                console.table(sample.rows);
            }
        } catch (e: any) {
            console.log(`   ERROR: ${e.message}`);
        }

        // 8. Check courts table
        console.log('\n📋 8. COURTS DATA:');
        try {
            const courts = await client.query(`
                SELECT id, name, slug, parent_id, visible
                FROM courts 
                ORDER BY name
                LIMIT 10
            `);
            if (courts.rows.length === 0) {
                console.log('   ⚠️ TABLE IS EMPTY!');
            } else {
                console.table(courts.rows);
            }
        } catch (e: any) {
            console.log(`   ERROR: ${e.message}`);
        }

        // 9. Ensure RLS is DISABLED for testing
        console.log('\n🔓 9. ENSURING RLS IS DISABLED:');
        for (const tableName of ['shared_tables', 'regime_tables', 'courts']) {
            try {
                await client.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY`);
                console.log(`   ✅ Disabled RLS on ${tableName}`);
            } catch (e: any) {
                console.log(`   ⚠️ ${tableName}: ${e.message}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ ANALYSIS COMPLETE\n');
        console.log('🔴 IMPORTANT: If error 406 persists after disabling RLS,');
        console.log('   the issue is NOT with RLS policies but with API Gateway/Headers.');

    } catch (err: any) {
        console.error('❌ Connection Error:', err.message);
    } finally {
        await client.end();
    }
}

fullAnalysis();
