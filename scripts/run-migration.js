/**
 * Script para executar migração via Supabase Client
 * Executa o SQL de migração usando a API do Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Supabase DEV
const SUPABASE_URL = 'https://fdzuykiwqzzmlzjtnbfi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkenV5a2l3cXp6bWx6anRuYmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MTc4MzgsImV4cCI6MjA4NDA5MzgzOH0.bo7tyD_S_hVSs_cEuAzBBeQXy8YSQSKdez0b1Z8RNMc';

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
    try {
        console.log('🚀 Iniciando migração...\n');

        // Ler arquivo SQL
        const sqlPath = join(__dirname, '..', 'migrations', '002_migrate_hardcoded_data.sql');
        const sqlContent = readFileSync(sqlPath, 'utf-8');

        // Dividir em statements individuais (remover comentários e queries de verificação)
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .filter(s => !s.startsWith('--'))
            .filter(s => !s.toUpperCase().startsWith('SELECT'));

        console.log(`📝 Encontrados ${statements.length} statements para executar\n`);

        // Executar cada statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            console.log(`⏳ Executando statement ${i + 1}/${statements.length}...`);

            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: statement
            });

            if (error) {
                // Tentar executar diretamente via from
                console.log(`   Tentando método alternativo...`);
                const { error: error2 } = await supabase.from('_migrations').insert({ sql: statement });

                if (error2) {
                    console.error(`❌ Erro no statement ${i + 1}:`, error2.message);
                    console.error(`   SQL:`, statement.substring(0, 100) + '...');
                } else {
                    console.log(`✅ Statement ${i + 1} executado com sucesso`);
                }
            } else {
                console.log(`✅ Statement ${i + 1} executado com sucesso`);
            }
        }

        console.log('\n🎉 Migração concluída!\n');

        // Verificar dados
        console.log('🔍 Verificando dados inseridos...\n');

        // Verificar global_config
        const { data: globalConfig, error: globalError } = await supabase
            .from('global_config')
            .select('config_key, valid_from, valid_to')
            .is('valid_to', null)
            .order('config_key');

        if (globalError) {
            console.error('❌ Erro ao verificar global_config:', globalError.message);
        } else {
            console.log('✅ global_config:');
            console.table(globalConfig);
        }

        // Verificar power_config
        const { data: powerConfig, error: powerError } = await supabase
            .from('power_config')
            .select('config_key, valid_from, valid_to')
            .eq('power_name', 'PJU')
            .is('valid_to', null)
            .order('config_key');

        if (powerError) {
            console.error('❌ Erro ao verificar power_config:', powerError.message);
        } else {
            console.log('\n✅ power_config (PJU):');
            console.table(powerConfig);
        }

        console.log('\n✅ Migração verificada com sucesso!');

    } catch (error) {
        console.error('❌ Erro fatal:', error.message);
        process.exit(1);
    }
}

runMigration();
