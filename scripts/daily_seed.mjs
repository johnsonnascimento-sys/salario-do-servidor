#!/usr/bin/env node
/**
 * scripts/daily_seed.mjs
 *
 * Script de seed diário – Salário do Servidor
 * ─────────────────────────────────────────────
 * Estratégia:
 *   • Usa DATABASE_URL (conexão direta PostgreSQL) — contorna RLS.
 *   • A tabela `courts` (coluna `notes` tipo text) é usada para marcar
 *     registros de seed com a tag "daily_seed:YYYY-MM-DD".
 *   • Todo dia: exclui seeds de dias anteriores → insere N novos seeds.
 *
 * Uso:
 *   node scripts/daily_seed.mjs           → 5 registros (padrão)
 *   node scripts/daily_seed.mjs --n 10    → 10 registros
 *   node scripts/daily_seed.mjs --only-clean → só limpa, sem inserir
 *
 * Variáveis de ambiente (lidas de .env.local ou variáveis do sistema):
 *   DATABASE_URL  →  postgresql://user:pass@host:5432/postgres
 *
 * Cron (VPS – /etc/cron.d/salario-seed):
 *   0 3 * * * root /usr/bin/node /var/www/salario-do-servidor/scripts/daily_seed.mjs >> /var/log/salario-seed.log 2>&1
 */

import fs from 'fs';
import path from 'path';
import pkg from 'pg';

const { Client } = pkg;

// ── 1. Carregar variáveis de ambiente ───────────────────────────────────────
function loadEnv() {
  // Tenta .env.local primeiro (desenvolvimento local)
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
      const m = line.match(/^([^#=][^=]*)=(.*)$/);
      if (!m) return;
      const key = m[1].trim();
      const val = m[2].trim().replace(/\r$/, '').replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    });
  }
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL não encontrada em .env.local nem nas variáveis de ambiente.');
  process.exit(1);
}

// ── 2. Parse de argumentos ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const ONLY_CLEAN = args.includes('--only-clean');
const nIdx = args.indexOf('--n');
const N_RECORDS = nIdx !== -1 && args[nIdx + 1] ? parseInt(args[nIdx + 1], 10) : 5;

// ── 3. Dados para geração aleatória ─────────────────────────────────────────
const PREFIXOS   = ['Tribunal', 'Superior Tribunal', 'Conselho', 'Corte', 'Câmara'];
const ADJETIVOS  = ['Regional', 'Federal', 'Estadual', 'Superior', 'Nacional',
                    'Militar', 'Eleitoral', 'do Trabalho', 'de Justiça', 'de Contas'];
const PODERES    = ['Judiciário', 'Executivo', 'Legislativo', 'Ministério Público'];
const ESFERAS    = ['Federal', 'Estadual', 'Municipal', 'Distrital'];
const CARREIRAS  = ['analista', 'tecnico'];
const NIVEIS     = ['A1','A2','A3','A4','A5','B6','B7','B8','B9','B10','C11','C12','C13'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSlug(name) {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base + '_' + Date.now().toString(36).slice(-5);
}

function buildConfig(power) {
  const carreira = pick(CARREIRAS);
  const nivel = pick(NIVEIS);
  const base = parseFloat((Math.random() * 6000 + 3500).toFixed(2));
  return JSON.stringify({
    bases: { [carreira]: { [nivel]: base } },
    beneficios: {
      auxilio_alimentacao: parseFloat((Math.random() * 600 + 1200).toFixed(2)),
      auxilio_preescolar:  parseFloat((Math.random() * 300 + 900).toFixed(2)),
    },
    power_name: power === 'Judiciário' ? 'PJU' : power.replace(/\s+/g, '_').toUpperCase().slice(0, 5),
    seed: true,
  });
}

function gerarTribunal(todayTag) {
  const name  = `${pick(PREFIXOS)} ${pick(ADJETIVOS)} (Seed)`;
  const power = pick(PODERES);
  return {
    name,
    slug:    randomSlug(name),
    power,
    sphere:  pick(ESFERAS),
    visible: Math.random() > 0.4,
    config:  buildConfig(power),
    notes:   todayTag,  // coluna `notes` usada como tag de limpeza
  };
}

// ── 4. Data de hoje ──────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const TODAY_TAG = `daily_seed:${TODAY}`;

// ── 5. Verificar/adicionar coluna notes em courts ────────────────────────────
async function ensureNotesColumn(client) {
  // Adiciona silenciosamente se não existir (idempotente)
  await client.query(`
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS notes text;
  `);
}

// ── 6. Limpeza de seeds anteriores ──────────────────────────────────────────
async function cleanOldSeeds(client) {
  console.log('🧹  Removendo registros de seed de dias anteriores...');

  const { rows } = await client.query(
    `SELECT id, slug, notes FROM courts
     WHERE notes LIKE 'daily_seed:%' AND notes <> $1`,
    [TODAY_TAG]
  );

  if (rows.length === 0) {
    console.log('   ✅  Nenhum seed antigo encontrado.');
    return;
  }

  const ids = rows.map(r => r.id);
  await client.query(`DELETE FROM courts WHERE id = ANY($1::uuid[])`, [ids]);
  console.log(`   ✅  ${ids.length} registro(s) excluído(s): ${rows.map(r => r.slug).join(', ')}`);
}

// ── 7. Inserção de novos seeds ───────────────────────────────────────────────
async function insertSeeds(client) {
  console.log(`\n🌱  Inserindo ${N_RECORDS} tribunal(ais) com tag [${TODAY_TAG}]...`);

  const inserted = [];
  for (let i = 0; i < N_RECORDS; i++) {
    const t = gerarTribunal(TODAY_TAG);
    const { rows } = await client.query(
      `INSERT INTO courts (name, slug, power, sphere, visible, config, notes)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
       RETURNING id, slug, name, power, sphere`,
      [t.name, t.slug, t.power, t.sphere, t.visible, t.config, t.notes]
    );
    inserted.push(rows[0]);
  }

  console.log(`   ✅  ${inserted.length} registro(s) inserido(s):\n`);
  inserted.forEach(r =>
    console.log(`      • [${r.slug}] ${r.name} (${r.power} / ${r.sphere})`)
  );
}

// ── 8. Relatório ─────────────────────────────────────────────────────────────
async function printSummary(client) {
  const { rows } = await client.query(
    `SELECT COUNT(*) AS total FROM courts WHERE notes LIKE 'daily_seed:%'`
  );
  console.log(`\n📊  Total de registros de seed no banco: ${rows[0].total}`);
}

// ── 9. Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Salário do Servidor – Daily Seed');
  console.log(`  ${new Date().toLocaleString('pt-BR')}`);
  console.log('═══════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Força IPv4 – GitHub Actions falha com IPv6 ao Supabase (ENETUNREACH)
    family: 4,
  });
  await client.connect();

  try {
    await ensureNotesColumn(client);
    await cleanOldSeeds(client);

    if (!ONLY_CLEAN) {
      await insertSeeds(client);
    } else {
      console.log('\n⏭️  Modo --only-clean: inserção pulada.');
    }

    await printSummary(client);
    console.log('\n✅  Concluído.\n');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('💥  Erro inesperado:', err.message);
  process.exit(1);
});
