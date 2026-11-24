import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  plugins: [{
    name: 'normative-catalog-test',
    enforce: 'pre',
    resolveId: source => source.includes('lib/supabase') ? '\0catalog-test-client' : undefined,
    load: id => id === '\0catalog-test-client'
      ? 'export const supabase = { rpc: (...args) => globalThis.__catalogTestRpc(...args) }' : undefined,
  }],
});

try {
  const { applicationOnDate, emptyAct, filterCatalog, saveNormativeAct } =
    await server.ssrLoadModule('/src/services/admin/normativeCatalog.ts');
  const divisor = {
    id: 'divisor', org: 'jmu', subject: 'Serviço extraordinário', rule: 'Divisor', provision: 'Art. 7º',
    from: '2025-08-01', to: '', impact: 'Divisor por jornada', status: 'implemented', evidence: 'Configuração',
  };
  const limit = { ...divisor, id: 'limit', rule: 'Limite', provision: 'Art. 6º', status: 'review' };
  const prior = { id: 'prior', revision: 1, document: {
    ...emptyAct(), issuer: 'STM', number: '374', year: '2025', validFrom: '2025-08-01', applications: [divisor, limit],
  }};
  const revision = { kind: 'amends', targetId: prior.id, applicationId: limit.id, provision: 'Art. 6º', from: '2026-01-01' };
  const successor = { id: 'successor', revision: 1, document: {
    ...emptyAct(), issuer: 'STM', number: '999', year: '2026', validFrom: '2026-01-01', relations: [revision],
  }};
  const filters = { query: 'servico extraordinario', org: 'jmu', status: '', date: '', archived: false };
  const ids = (records, overrides) => filterCatalog(records, { ...filters, ...overrides })
    .map(({ act, pending }) => [act.id, pending]);

  assert.deepEqual(ids([prior], { query: '374/2025' }), [['prior', false]]);
  assert.deepEqual(ids([prior, successor], { org: 'cjf' }), []);
  assert.deepEqual(ids([prior, successor], { date: '2025-12-31' }), [['prior', false]]);
  assert.deepEqual(ids([prior, successor], { date: '2026-01-01' }), [['prior', false], ['successor', false]]);
  assert.equal(applicationOnDate(divisor, '2026-01-01', [revision]), 'active');
  assert.equal(applicationOnDate(limit, '2026-01-01', [revision]), 'ended');
  assert.equal(applicationOnDate(limit, '2025-12-31', [revision]), 'active');

  const unknown = { ...successor, document: { ...successor.document, relations: [{ ...revision, from: '' }] } };
  assert.deepEqual(ids([prior, unknown], { date: '2026-01-01', status: 'review' }),
    [['prior', false], ['prior', true], ['successor', true]]);
  const archived = { ...prior, document: { ...prior.document, archived: true } };
  assert.deepEqual(ids([archived], {}), []);
  assert.deepEqual(ids([archived], { archived: true }), [['prior', false]]);

  const { calculateOvertime } = await server.ssrLoadModule('/src/services/agency/engine/modules/overtimeCalculations.ts');
  const params = {
    periodo: 0, cargo: 'tecnico', padrao: 'C13', funcao: 'sem_funcao', recebeAbono: false,
    aqTituloVR: 0, aqTreinoVR: 0, aqTituloPerc: 0, aqTreinoPerc: 0,
    agencyConfig: {
      orgSlug: 'jmu', bases: { salario: { tecnico: { C13: 9052.83 } }, funcoes: {} }, values: {},
      payrollRules: { gajRate: 1.4, overtimeMonthHours: 175, vrRateOnCj1: 0.05 },
      careerCatalog: { noFunctionCode: 'sem_funcao' },
    },
    overtimeEntries: [{ id: 'he-jmu', qtd50: 10, qtd100: 0, usarSubstituicaoFuncao: false }],
  };
  const before = await calculateOvertime(params);
  assert.equal(before.heVal50, 1862.30);
  const edited = { ...prior.document, notes: 'Conferência administrativa' };
  globalThis.__catalogTestRpc = async (name, payload) => {
    assert.equal(name, 'admin_save_normative_act');
    assert.deepEqual(payload, { p_id: prior.id, p_revision: 1, p_document: edited });
    return { data: prior.id };
  };
  assert.equal(await saveNormativeAct(prior, edited), prior.id);
  assert.deepEqual(await calculateOvertime(params), before);
  console.log('Catálogo: filtros, histórico por data e isolamento do cálculo de horas extras conferidos.');
} finally {
  delete globalThis.__catalogTestRpc;
  await server.close();
}
