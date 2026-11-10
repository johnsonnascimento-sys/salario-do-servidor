import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig, type TransportIndemnityConfig } from '../src/types';
import { calculateTransportIndemnity, resolveTransportIndemnity } from '../src/services/agency/engine/modules/transportIndemnityCalculations';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';

const transport: TransportIndemnityConfig = {
  enabled: true, divisor: 20,
  versions: [{ validFrom: '2026-02-13', validTo: null, fullAmount: 2168.46, reference: 'ATN STM nº 935/2026' }],
  normativeLabel: 'ATN STM nº 212/2017 • nº 935/2026', info: 'Teste', notes: [],
  incidences: { ir: false, pss: false, funpresp: false },
};
const config: CourtConfig = {
  orgSlug: 'jmu', transportIndemnity: transport,
  bases: { salario: { tecnico: { A1: 6000 } }, funcoes: {} }, values: { food_allowance: 1000 },
  historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } },
  historico_ir: { teste: 100 }, historico_ir_brackets: {},
  payrollRules: { gajRate: .5, specificGratificationRate: .1, vrRateOnCj1: .1, monthDayDivisor: 30,
    overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: .06, irrfTopRate: .2 },
  careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
  previdenciaComplementar: { enabled: true, scope: 'patrocinado_vinculado', baseRule: 'excedente_teto_rgps',
    includeThirteenth: true, sponsoredRate: { min: .065, max: .085, step: .005, defaultRpc: .085 },
    facultativeRate: { minIfPositive: .025, default: 0 } },
};
const initial = (): CalculatorState => ({ ...INITIAL_STATE, anoRef: 2026, mesRef: 'NOVEMBRO', cargo: 'tecnico', padrao: 'A1',
  funcao: '0', tabelaPSS: 'teste', tabelaIR: 'teste', regimePrev: 'rpc', funprespParticipacao: 'patrocinado', funprespAliq: .085,
  auxAlimentacao: 1000, auxTransporteGasto: 700, transporteIndenizacaoAtivo: true, transporteIndenizacaoDias: 20 });
const calculate = (days: number, court = config, competence = '2026-11') => calculateTransportIndemnity({
  ...mapStateToAgencyParams({ ...initial(), transporteIndenizacaoDias: days }, 'jmu', court), competencia: competence,
});
const round = (value: number) => Math.round(value * 100) / 100;

test('transporte: todos os valores legais, sem arredondamento prévio do vigésimo', () => {
  const examples = [[0, 0], [1, 108.42], [2, 216.85], [5, 542.12], [10, 1084.23], [15, 1626.35], [19, 2060.04], [20, 2168.46], [22, 2168.46]];
  for (const [days, amount] of examples) {
    const result = calculate(days);
    assert.equal(result.amount, amount, `${days} dias`);
    assert.equal(result.days, days);
    assert.equal(result.eligibleDays, Math.min(days, 20));
    assert.equal(result.status, days === 0 ? 'zero' : days >= 20 ? 'full' : 'proportional');
  }
});

test('transporte: negativos, decimais, não finitos e quantidade incompatível com o mês são inválidos', () => {
  for (const days of [-1, 1.5, NaN, Infinity, -Infinity, 31, '2' as any]) {
    const result = calculate(days);
    assert.equal(result.status, 'invalid', String(days));
    assert.equal(result.amount, 0);
  }
  assert.equal(calculate(28, config, '2027-02').status, 'full');
  assert.equal(calculate(29, config, '2027-02').status, 'invalid');
  assert.equal(calculate(29, config, '2028-02').status, 'full');
});

test('transporte: configuração, divisor, vigência e desabilitação são explícitos', () => {
  assert.equal(calculate(20, { ...config, transportIndemnity: undefined }).status, 'unavailable');
  assert.equal(calculate(20, { ...config, transportIndemnity: { ...transport, enabled: false } }).amount, 0);
  assert.equal(calculate(20, config, '2026-01').status, 'unavailable');
  const transition = calculate(20, config, '2026-02');
  assert.equal(transition.status, 'unavailable');
  assert.match(transition.reason!, /vigência muda/);
  assert.equal(calculate(20, config, '2026-03').amount, 2168.46);
  assert.equal(calculate(20, config, '2026-13').status, 'unavailable');
  assert.equal(resolveTransportIndemnity({ ...transport, divisor: 0 }, '2026-11').status, 'unavailable');
  assert.equal(resolveTransportIndemnity({ ...transport, incidences: { ir: true, pss: false, funpresp: false } }, '2026-11').status, 'unavailable');
  assert.equal(calculate(2, { ...config, transportIndemnity: { ...transport, divisor: 10,
    versions: [{ validFrom: '2026-03-01', fullAmount: 100, reference: 'Config teste' }] } }).amount, 20);
  assert.equal(resolveTransportIndemnity({ ...transport, versions: [transport.versions[0], transport.versions[0]] }, '2026-11').status, 'unavailable');
});

test('transporte: crédito no motor é isento e não altera alimentação, auxílio-transporte, diárias ou outras bases', async () => {
  const engine = new AgencyCalculationEngine();
  const state = { ...initial(), heQtd50: 2, diariasQtd: 2, gaactaAtivo: true };
  const before = await engine.calculateTotal(mapStateToAgencyParams({ ...state, transporteIndenizacaoAtivo: false }, 'jmu', config));
  const after = await engine.calculateTotal(mapStateToAgencyParams(state, 'jmu', config));
  assert.equal(after.breakdown.transporteIndenizacaoValor, 2168.46);
  assert.equal(round(after.netSalary - before.netSalary), 2168.46);
  assert.equal(after.totalDeductions, before.totalDeductions);
  for (const field of ['pss', 'irrf', 'funpresp', 'baseRpps', 'baseFunpresp', 'auxAlimentacao', 'auxTransporte', 'auxTransporteDebito',
    'diariasValor', 'diariasDescAlim', 'diariasDescTransp', 'heTotal', 'gaactaBase']) {
    assert.equal(after.breakdown[field], before.breakdown[field], field);
  }
  assert.equal(after.breakdown.auxAlimentacao, 1000);
  assert.equal(after.breakdown.auxTransporte, 700);
});

test('transporte: restauração nova/antiga conserva entrada, remove resultados obsoletos e não trunca decimais', () => {
  const restored = hydrateCalculatorState(JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState({
    ...initial(), transporteIndenizacaoValor: 9999, transporteIndenizacaoMemory: calculate(20),
  }))));
  assert.equal(restored.transporteIndenizacaoAtivo, true);
  assert.equal(restored.transporteIndenizacaoDias, 20);
  assert.equal(restored.transporteIndenizacaoValor, 0);
  assert.equal(restored.transporteIndenizacaoMemory, undefined);
  assert.equal(hydrateCalculatorState({ nome: 'Antigo' }).transporteIndenizacaoAtivo, false);
  assert.equal(hydrateCalculatorState({ nome: 'Antigo' }).transporteIndenizacaoDias, 0);
  assert.equal(hydrateCalculatorState({ transporteIndenizacaoDias: 1.5 }).transporteIndenizacaoDias, 1.5);
});

test('transporte: hook inclui uma linha, recalcula dias e remove crédito ao desativar ou trocar para órgão sem regra', async () => {
  const engine = new AgencyCalculationEngine();
  const agency = { slug: 'jmu', name: 'JMU', type: 'judiciary' };
  let current = initial();
  let currentConfig = config;
  let latest!: ReturnType<typeof useCalculatorResults>;
  function Probe() { latest = useCalculatorResults(current, engine, currentConfig, agency); return null; }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(React.createElement(Probe)); });
  assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
  const rows = () => latest.resultRows.filter(row => row.label === 'INDENIZAÇÃO DE TRANSPORTE');
  assert.equal(rows().length, 1);
  assert.equal(rows()[0].value, 2168.46);
  const net = latest.calculatedState.liquido;
  current = { ...current, transporteIndenizacaoDias: 2 };
  await act(async () => { tree.update(React.createElement(Probe)); });
  assert.equal(rows()[0].value, 216.85);
  current = { ...current, transporteIndenizacaoAtivo: false };
  await act(async () => { tree.update(React.createElement(Probe)); });
  assert.equal(rows().length, 0);
  assert.equal(round(net - latest.calculatedState.liquido), 2168.46);
  current = { ...current, transporteIndenizacaoAtivo: true };
  currentConfig = { ...config, orgSlug: 'cjf', transportIndemnity: undefined };
  await act(async () => { tree.update(React.createElement(Probe)); });
  assert.equal(rows().length, 0);
  assert.equal(latest.calculatedState.transporteIndenizacaoMemory?.status, 'unavailable');
  await act(async () => { tree.unmount(); });
});
