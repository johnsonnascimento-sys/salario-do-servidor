import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createServer } from 'vite';

// Only configuration tables are imported; no users, payslips or external writes.
const snapshotPath = process.env.PENSION_CONFIG_SNAPSHOT;
const modulePath = process.env.PENSION_PGLITE_MODULE;
if (!snapshotPath || !modulePath) throw new Error('Informe PENSION_CONFIG_SNAPSHOT e PENSION_PGLITE_MODULE para homologação local.');
const snapshot = JSON.parse((await readFile(snapshotPath, 'utf8')).replace(/^\uFEFF/, ''));
const { PGlite } = createRequire(resolve('package.json'))(modulePath);
const db = new PGlite();
let server;
try {
  await db.exec(`create table public.global_config(id uuid primary key default gen_random_uuid(),config_key text,config_value jsonb,valid_from date,valid_to date);
    create table public.power_config(id uuid primary key default gen_random_uuid(),power_name text,config_key text,config_value jsonb,valid_from date,valid_to date,unique(power_name,config_key,valid_from));
    create table public.org_config(id uuid primary key default gen_random_uuid(),org_slug text,org_name text,power_name text,configuration jsonb);`);
  const columns = {
    global_config: ['id', 'config_key', 'config_value', 'valid_from', 'valid_to'],
    power_config: ['id', 'power_name', 'config_key', 'config_value', 'valid_from', 'valid_to'],
    org_config: ['id', 'org_slug', 'org_name', 'power_name', 'configuration'],
  };
  for (const [table, fields] of Object.entries(columns)) {
    if (!Array.isArray(snapshot[table]) || !snapshot[table].length) throw new Error(`Snapshot sem ${table}.`);
    for (const row of snapshot[table]) await db.query(`insert into ${table} (${fields.join(',')}) values (${fields.map((_, index) => `$${index + 1}`).join(',')})`,
      fields.map(field => typeof row[field] === 'object' && row[field] !== null ? JSON.stringify(row[field]) : row[field] ?? null));
  }
  // A narrow read-only transport, backed by real PostgreSQL queries. ConfigService remains unchanged.
  globalThis.__pensionLocalTransport = { from(table) {
    if (!(table in columns)) throw new Error('Tabela fora da homologação de configuração.');
    const filters = [];
    const parameters = [];
    const query = {
      select() { return query; },
      eq(field, value) {
        if (!columns[table].includes(field)) throw new Error('Coluna não permitida.');
        parameters.push(value); filters.push(`${field}=$${parameters.length}`); return query;
      },
      is(field, value) {
        if (!columns[table].includes(field) || value !== null) throw new Error('Filtro não permitido.');
        filters.push(`${field} is null`); return query;
      },
      async single() {
        const result = await query;
        return result.data?.length === 1 ? { data: result.data[0], error: null } : { data: null, error: { message: 'Configuração não única', code: 'PGRST116' } };
      },
      async maybeSingle() {
        const result = await query;
        return result.data?.length === 0 ? { data: null, error: null } : query.single();
      },
      async then(onSuccess, onFailure) {
        try {
          const result = await db.query(`select * from ${table}${filters.length ? ` where ${filters.join(' and ')}` : ''}`, parameters);
          return onSuccess({ data: result.rows, error: null });
        } catch (error) { if (onFailure) return onFailure(error); throw error; }
      },
    };
    return query;
  } };
  globalThis.__pensionHomologationDB = db;
  server = await createServer({ configFile: false, ssr: { noExternal: ['react-router-dom'] },
    server: { middlewareMode: true, hmr: false }, appType: 'custom',
    plugins: [{ name: 'local-pension-config-transport', enforce: 'pre',
      resolveId(source, importer) {
        if (source.endsWith('/lib/supabase') && importer?.includes('/services/config/')) return '\0pension-local-db';
      },
      load(id) { if (id === '\0pension-local-db') return 'export const supabase = globalThis.__pensionLocalTransport;'; },
    }],
  });
  const { runPensionHomologation } = await server.ssrLoadModule('/tests/pensionHomologation.tsx');
  await runPensionHomologation(db);
} finally {
  await server?.close();
  await db.close();
  delete globalThis.__pensionLocalTransport;
  delete globalThis.__pensionHomologationDB;
}
