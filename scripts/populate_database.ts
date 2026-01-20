import { Client } from 'pg';

const DEV_DB_URL = 'postgresql://postgres:TYeDN3JhvglQsQtu@db.fdzuykiwqzzmlzjtnbfi.supabase.co:5432/postgres';

// ============================================
// Data from src/data.ts
// ============================================

const BASES_2025 = {
    salario: {
        'analista': { 'C13': 9292.14, 'C12': 9021.50, 'C11': 8758.73, 'B10': 8503.62, 'B9': 8255.95, 'B8': 7810.73, 'B7': 7583.23, 'B6': 7362.37, 'A5': 7147.92, 'A4': 6939.75, 'A3': 6565.50, 'A2': 6374.26, 'A1': 6188.61 },
        'tec': { 'C13': 5663.47, 'C12': 5498.51, 'C11': 5338.36, 'B10': 5182.88, 'B9': 5031.90, 'B8': 4760.56, 'B7': 4621.90, 'B6': 4487.29, 'A5': 4356.59, 'A4': 4229.69, 'A3': 4001.60, 'A2': 3885.06, 'A1': 3771.88 },
        'auxiliar': { 'C13': 3394.11, 'C12': 3295.25, 'C11': 3199.27, 'B10': 3106.09, 'B9': 3015.62, 'B8': 2852.84, 'B7': 2769.75, 'B6': 2689.08, 'A5': 2610.76, 'A4': 2534.72, 'A3': 2398.07, 'A2': 2328.22, 'A1': 2260.41 }
    },
    funcoes: {
        'fc1': 1215.34, 'fc2': 1413.14, 'fc3': 1644.51, 'fc4': 2313.27, 'fc5': 2662.06, 'fc6': 3663.71,
        'cj1': 7143.98, 'cj2': 8822.98, 'cj3': 10029.94, 'cj4': 11322.60
    }
};

const HISTORICO_PSS = {
    '2026': {
        teto_rgps: 8475.55,
        faixas: [
            { min: 0.00, max: 1621.00, rate: 0.075 },
            { min: 1621.01, max: 2902.84, rate: 0.090 },
            { min: 2902.85, max: 4354.27, rate: 0.120 },
            { min: 4354.28, max: 8475.55, rate: 0.140 },
            { min: 8475.56, max: 14514.30, rate: 0.145 },
            { min: 14514.31, max: 29028.58, rate: 0.165 },
            { min: 29028.59, max: 56605.73, rate: 0.190 },
            { min: 56605.74, max: 999999999, rate: 0.220 }
        ]
    },
    '2025': {
        teto_rgps: 8157.41,
        faixas: [
            { min: 0.00, max: 1518.00, rate: 0.075 },
            { min: 1518.01, max: 2793.88, rate: 0.090 },
            { min: 2793.89, max: 4190.83, rate: 0.120 },
            { min: 4190.84, max: 8157.41, rate: 0.140 },
            { min: 8157.42, max: 13969.49, rate: 0.145 },
            { min: 13969.50, max: 27938.96, rate: 0.165 },
            { min: 27938.97, max: 54480.97, rate: 0.190 },
            { min: 54480.98, max: 999999999, rate: 0.220 }
        ]
    }
};

const HISTORICO_IR = {
    '2025_maio': { deduction: 908.73 },
    '2024_fev': { deduction: 896.00 }
};

// ============================================
// Main Script
// ============================================

async function populateDatabase() {
    console.log('🚀 POPULATING DATABASE\n');
    console.log('='.repeat(60));

    const client = new Client({
        connectionString: DEV_DB_URL,
    });

    try {
        await client.connect();
        console.log('✅ Connected to database\n');

        // ============================================
        // 1. Populate shared_tables (IR Tables)
        // ============================================
        console.log('📋 1. POPULATING shared_tables (IR Tables)...');

        // Clear existing IR tables
        await client.query(`DELETE FROM shared_tables WHERE type = 'IR_TABLE'`);
        console.log('   Cleared existing IR tables');

        for (const [version, data] of Object.entries(HISTORICO_IR)) {
            await client.query(`
                INSERT INTO shared_tables (type, version, data, description, is_active)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                'IR_TABLE',
                version,
                JSON.stringify(data),
                `Tabela IR ${version}`,
                version === '2025_maio' // Apenas 2025_maio ativo
            ]);
            console.log(`   ✅ Inserted IR_TABLE v${version} (active: ${version === '2025_maio'})`);
        }

        // ============================================
        // 2. Populate regime_tables (PJU)
        // ============================================
        console.log('\n📋 2. POPULATING regime_tables (PJU)...');

        const REGIME_CODE = 'PJU';

        // Clear existing PJU tables
        await client.query(`DELETE FROM regime_tables WHERE regime = $1`, [REGIME_CODE]);
        console.log(`   Cleared existing ${REGIME_CODE} tables`);

        // Insert CARGO_TABLE (salaries)
        await client.query(`
            INSERT INTO regime_tables (regime, type, version, data, description, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            REGIME_CODE,
            'CARGO_TABLE',
            '2025',
            JSON.stringify({ salario: BASES_2025.salario }),
            'Tabela de Cargos e Salários PJU 2025',
            true
        ]);
        console.log('   ✅ Inserted CARGO_TABLE v2025');

        // Insert FC_CJ_TABLE (functions)
        await client.query(`
            INSERT INTO regime_tables (regime, type, version, data, description, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            REGIME_CODE,
            'FC_CJ_TABLE',
            '2025',
            JSON.stringify(BASES_2025.funcoes),
            'Tabela de Funções FC/CJ PJU 2025',
            true
        ]);
        console.log('   ✅ Inserted FC_CJ_TABLE v2025');

        // Insert PSS_TABLE for each version
        for (const [version, data] of Object.entries(HISTORICO_PSS)) {
            await client.query(`
                INSERT INTO regime_tables (regime, type, version, data, description, is_active)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                REGIME_CODE,
                'PSS_TABLE',
                version,
                JSON.stringify(data),
                `Tabela PSS ${version}`,
                version === '2026' // 2026 é a mais recente
            ]);
            console.log(`   ✅ Inserted PSS_TABLE v${version}`);
        }

        // ============================================
        // 3. Verify Data
        // ============================================
        console.log('\n📋 3. VERIFYING DATA...');

        const sharedCount = await client.query(`SELECT COUNT(*) as count FROM shared_tables`);
        console.log(`   shared_tables: ${sharedCount.rows[0].count} rows`);

        const regimeCount = await client.query(`SELECT COUNT(*) as count FROM regime_tables`);
        console.log(`   regime_tables: ${regimeCount.rows[0].count} rows`);

        // Show all tables
        console.log('\n📋 4. CURRENT DATA:');

        const shared = await client.query(`SELECT type, version, is_active FROM shared_tables ORDER BY type, version`);
        console.log('\n   shared_tables:');
        console.table(shared.rows);

        const regime = await client.query(`SELECT regime, type, version, is_active FROM regime_tables ORDER BY type, version`);
        console.log('\n   regime_tables:');
        console.table(regime.rows);

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE POPULATED SUCCESSFULLY!\n');
        console.log('📝 Summary:');
        console.log(`   • ${sharedCount.rows[0].count} global tables (IR)`);
        console.log(`   • ${regimeCount.rows[0].count} regime tables (PSS, Salários, Funções)`);
        console.log('\n🔄 Recarregue a página para ver os dados do banco!');

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

populateDatabase();
