import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

// Read-only: uses the same public Supabase client and ConfigService as the application.
const target = process.env.PENSION_TARGET_PROJECT;
if (!target || new URL(process.env.VITE_SUPABASE_URL).hostname !== `${target}.supabase.co`) {
  throw new Error('Informe PENSION_TARGET_PROJECT e URL pública correspondente ao projeto revisado.');
}
const server = await createServer({ configFile: false, mode: 'production',
  ssr: { noExternal: ['react-router-dom'] }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const seed = JSON.parse(await readFile('supabase/seeds/pju_pension_catalog_2026.json', 'utf8'));
  const { ConfigService } = await server.ssrLoadModule('/src/services/config/ConfigService.ts');
  const { supabase } = await server.ssrLoadModule('/src/lib/supabase.ts');
  if (process.env.PENSION_CONFIG_SNAPSHOT) {
    const before = JSON.parse((await readFile(process.env.PENSION_CONFIG_SNAPSHOT, 'utf8')).replace(/^\uFEFF/, ''));
    const [{ data: global, error: globalError }, { data: power, error: powerError }, { data: org, error: orgError }] = await Promise.all([
      supabase.from('global_config').select('*').is('valid_to', null),
      supabase.from('power_config').select('*').eq('power_name', 'PJU'),
      supabase.from('org_config').select('*').eq('org_slug', 'jmu'),
    ]);
    assert.ok(!globalError && !powerError && !orgError, 'Leitura pública das configurações deve estar disponível.');
    // Management SQL and PostgREST serialize timestamptz with different offsets.
    const normalized = row => Object.fromEntries(Object.entries(row).map(([key, value]) =>
      [key, ['created_at', 'updated_at'].includes(key) && typeof value === 'string' ? new Date(value).toISOString() : value]));
    const sorted = rows => rows.map(normalized).sort((a, b) => a.id.localeCompare(b.id));
    assert.deepEqual(sorted(global), sorted(before.global_config));
    assert.deepEqual(sorted(org), sorted(before.org_config));
    assert.equal(power.length, before.power_config.length + 1);
    for (const previous of before.power_config) {
      const actual = power.find(item => item.id === previous.id);
      assert.ok(actual, 'Registro anterior preservado.');
      if (previous.config_key === 'previdencia_complementar' && previous.valid_to === null) {
        assert.deepEqual(normalized(actual), normalized({ ...previous, valid_to: '2026-11-04' }));
      } else assert.deepEqual(normalized(actual), normalized(previous));
    }
    assert.equal(power.filter(item => item.config_key === 'previdencia_complementar' && item.valid_to === null).length, 1);
    console.log('APROVADO: JSONs e registros anteriores preservados no projeto, com alteração apenas da vigência anterior e uma nova versão.');
  }
  const { mapEffectiveConfigToCourtConfig } = await server.ssrLoadModule('/src/services/config/mapEffectiveConfig.ts');
  const effective = await new ConfigService().getEffectiveConfig('jmu');
  assert.deepEqual(effective.previdencia_complementar.rubric_catalog, seed.config_value.rubric_catalog);
  assert.deepEqual(effective.previdencia_complementar.historical_rules, seed.config_value.historical_rules);
  console.log('APROVADO: configuração efetiva pública da JMU contém o catálogo e histórico revisados, sem override divergente.');
  const { runPensionFormScenarios } = await server.ssrLoadModule('/tests/pensionHomologation.tsx');
  await runPensionFormScenarios(mapEffectiveConfigToCourtConfig(effective));
  console.log('Validação do projeto concluída com acesso público somente leitura; sem publicação, autenticação ou gravação de holerites.');
} finally { await server.close(); }
