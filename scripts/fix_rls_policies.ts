import { Client } from 'pg';

const DEV_DB_URL = 'postgresql://postgres:TYeDN3JhvglQsQtu@db.fdzuykiwqzzmlzjtnbfi.supabase.co:5432/postgres';

async function fixRLSPolicies() {
    console.log('🔧 Fixing RLS Policies on DEV database...');

    const client = new Client({
        connectionString: DEV_DB_URL,
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // Fix shared_tables policies
        console.log('\n📋 Fixing shared_tables policies...');

        // Drop existing policies
        await client.query(`DROP POLICY IF EXISTS "Public Read Active Tables" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Read All" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Insert" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Update" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Delete" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable read access for all users" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable insert for authenticated users" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable update for authenticated users" ON shared_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable delete for authenticated users" ON shared_tables`);
        console.log('   Dropped old policies');

        // Create new policies
        await client.query(`
            CREATE POLICY "Enable read access for all users" ON shared_tables
            FOR SELECT USING (true)
        `);
        await client.query(`
            CREATE POLICY "Enable insert for authenticated users" ON shared_tables
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)
        `);
        await client.query(`
            CREATE POLICY "Enable update for authenticated users" ON shared_tables
            FOR UPDATE USING (auth.uid() IS NOT NULL)
        `);
        await client.query(`
            CREATE POLICY "Enable delete for authenticated users" ON shared_tables
            FOR DELETE USING (auth.uid() IS NOT NULL)
        `);
        console.log('   ✅ Created new policies for shared_tables');

        // Fix regime_tables policies
        console.log('\n📋 Fixing regime_tables policies...');

        // Drop existing policies
        await client.query(`DROP POLICY IF EXISTS "Public Read Active Regime Tables" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Read All Regime Tables" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Insert Regime Tables" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Update Regime Tables" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Authenticated Delete Regime Tables" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable read access for all users" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable insert for authenticated users" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable update for authenticated users" ON regime_tables`);
        await client.query(`DROP POLICY IF EXISTS "Enable delete for authenticated users" ON regime_tables`);
        console.log('   Dropped old policies');

        // Create new policies
        await client.query(`
            CREATE POLICY "Enable read access for all users" ON regime_tables
            FOR SELECT USING (true)
        `);
        await client.query(`
            CREATE POLICY "Enable insert for authenticated users" ON regime_tables
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)
        `);
        await client.query(`
            CREATE POLICY "Enable update for authenticated users" ON regime_tables
            FOR UPDATE USING (auth.uid() IS NOT NULL)
        `);
        await client.query(`
            CREATE POLICY "Enable delete for authenticated users" ON regime_tables
            FOR DELETE USING (auth.uid() IS NOT NULL)
        `);
        console.log('   ✅ Created new policies for regime_tables');

        // Verify
        console.log('\n📊 Verifying policies...');
        const result = await client.query(`
            SELECT tablename, policyname, cmd
            FROM pg_policies
            WHERE tablename IN ('shared_tables', 'regime_tables')
            ORDER BY tablename, policyname
        `);
        console.table(result.rows);

        console.log('\n✅ RLS Policies fixed successfully!');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

fixRLSPolicies();
