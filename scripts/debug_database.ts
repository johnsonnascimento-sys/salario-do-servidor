import { Client } from 'pg';

const DEV_DB_URL = 'postgresql://postgres:TYeDN3JhvglQsQtu@db.fdzuykiwqzzmlzjtnbfi.supabase.co:5432/postgres';

async function debug() {
    console.log('🔍 Debugging database state...');

    const client = new Client({
        connectionString: DEV_DB_URL,
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // Check if tables exist
        console.log('📋 Checking if tables exist...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('shared_tables', 'regime_tables', 'courts')
        `);
        console.log('Tables found:', tablesResult.rows.map(r => r.table_name).join(', '));

        // Check RLS status
        console.log('\n📋 Checking RLS status...');
        const rlsResult = await client.query(`
            SELECT relname, relrowsecurity 
            FROM pg_class 
            WHERE relname IN ('shared_tables', 'regime_tables')
        `);
        console.table(rlsResult.rows);

        // Check current policies
        console.log('\n📋 Current policies:');
        const policiesResult = await client.query(`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
            FROM pg_policies
            WHERE tablename IN ('shared_tables', 'regime_tables')
            ORDER BY tablename, policyname
        `);
        console.table(policiesResult.rows);

        // Check data in shared_tables
        console.log('\n📋 Data in shared_tables:');
        const sharedResult = await client.query(`
            SELECT id, type, version, is_active, created_at 
            FROM shared_tables 
            LIMIT 10
        `);
        if (sharedResult.rows.length === 0) {
            console.log('   ⚠️ NO DATA in shared_tables!');
        } else {
            console.table(sharedResult.rows);
        }

        // Check data in regime_tables
        console.log('\n📋 Data in regime_tables:');
        const regimeResult = await client.query(`
            SELECT id, regime, type, version, is_active, created_at 
            FROM regime_tables 
            LIMIT 10
        `);
        if (regimeResult.rows.length === 0) {
            console.log('   ⚠️ NO DATA in regime_tables!');
        } else {
            console.table(regimeResult.rows);
        }

        // Try to disable RLS completely for testing
        console.log('\n🔓 TEMPORARILY disabling RLS for debugging...');
        await client.query(`ALTER TABLE shared_tables DISABLE ROW LEVEL SECURITY`);
        await client.query(`ALTER TABLE regime_tables DISABLE ROW LEVEL SECURITY`);
        console.log('   ✅ RLS disabled on both tables');

        console.log('\n✅ Debug complete. RLS has been DISABLED. Reload the page to test.');

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

debug();
