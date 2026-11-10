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
import { exportToPDF, exportToExcel } from '../src/services/exportService';
import { PresetInstanceCard } from '../src/components/Calculator/PresetInstanceCard';

const transport: TransportIndemnityConfig = {
  enabled: true, divisor: 20, transitionPolicy: 'latest_in_month',
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
  assert.equal(transition.status, 'full');
  assert.equal(transition.amount, 2168.46);
  assert.equal(transition.transitionDate, '2026-02-13');
  assert.match(transition.transitionWarning!, /13\/02\/2026/);
  assert.match(transition.transitionWarning!, /simulação/);
  assert.equal(resolveTransportIndemnity({ ...transport, transitionPolicy: undefined }, '2026-02').status, 'unavailable');
  assert.equal(calculate(20, config, '2026-03').amount, 2168.46);
  assert.equal(calculate(20, config, '2026-13').status, 'unavailable');
  assert.equal(resolveTransportIndemnity({ ...transport, divisor: 0 }, '2026-11').status, 'unavailable');
  assert.equal(resolveTransportIndemnity({ ...transport, incidences: { ir: true, pss: false, funpresp: false } }, '2026-11').status, 'unavailable');
  assert.equal(calculate(2, { ...config, transportIndemnity: { ...transport, divisor: 10,
    versions: [{ validFrom: '2026-03-01', fullAmount: 100, reference: 'Config teste' }] } }).amount, 20);
  assert.equal(resolveTransportIndemnity({ ...transport, versions: [transport.versions[0], transport.versions[0]] }, '2026-11').status, 'unavailable');
});

test('transporte: versões históricas selecionam valor, divisor, incidências e fundamento da competência', () => {
  const exempt = { ir: false, pss: false, funpresp: false };
  const historical: TransportIndemnityConfig = {
    ...transport,
    // Conflicting legacy data must have no effect after parameters are versioned.
    divisor: 99, incidences: { ir: true, pss: true, funpresp: true },
    versions: [
      { validFrom: '2022-10-21', validTo: '2026-02-12', fullAmount: 2075.88, divisor: 20,
        incidences: exempt, reference: 'ATN STM nº 596/2022', normativeLabel: 'ATN STM nº 212/2017 • nº 596/2022' },
      { validFrom: '2026-02-13', validTo: '2027-12-31', fullAmount: 2168.46, divisor: 20,
        incidences: exempt, reference: 'ATN STM nº 935/2026', normativeLabel: 'ATN STM nº 212/2017 • nº 935/2026' },
      // Synthetic future divisor tests temporal isolation, not an official rule.
      { validFrom: '2028-01-01', validTo: '2028-12-31', fullAmount: 3000, divisor: 10,
        incidences: exempt, reference: 'Fixture futura' },
      { validFrom: '2029-01-01', fullAmount: 4000, divisor: 5,
        incidences: { ir: true, pss: false, funpresp: false }, reference: 'Fixture tributada' },
    ],
  };
  const court = { ...config, transportIndemnity: historical };
  for (const competence of ['2022-11', '2025-01', '2026-01']) {
    const result = calculate(10, court, competence);
    assert.equal(result.amount, 1037.94);
    assert.equal(result.fullAmount, 2075.88);
    assert.equal(result.divisor, 20);
    assert.equal(result.normativeLabel, 'ATN STM nº 212/2017 • nº 596/2022');
    assert.equal(calculate(22, court, competence).amount, 2075.88);
  }
  assert.equal(calculate(10, court, '2026-03').amount, 1084.23);
  assert.equal(calculate(10, court, '2026-03').normativeLabel, 'ATN STM nº 212/2017 • nº 935/2026');
  assert.equal(calculate(5, court, '2028-01').amount, 1500);
  assert.equal(calculate(5, court, '2028-01').divisor, 10);
  assert.equal(calculate(5, court, '2029-01').status, 'unavailable');
  assert.match(calculate(5, court, '2029-01').reason!, /incidências incompatíveis/);
  for (const competence of ['2022-09']) {
    assert.equal(calculate(10, court, competence).status, 'unavailable', competence);
    assert.equal(calculate(10, court, competence).amount, 0);
  }
  for (const [competence, amount, date] of [['2022-10', 2075.88, '2022-10-21'], ['2026-02', 2168.46, '2026-02-13']] as const) {
    const result = calculate(20, court, competence);
    assert.equal(result.amount, amount);
    assert.equal(result.status, 'full');
    assert.equal(result.transitionDate, date);
    assert.match(result.transitionWarning!, /valor atualizado/);
  }
  assert.equal(calculate(20, court, '2026-01').transitionWarning, undefined);
  assert.equal(calculate(20, court, '2026-03').transitionWarning, undefined);
  const before = JSON.stringify(historical);
  calculate(10, court, '2025-01');
  assert.equal(JSON.stringify(historical), before, 'resolver não altera a configuração histórica');
});

test('transporte: convenção de transição não mascara sobreposição nem estende vigência encerrada', () => {
  const base = transport.versions[0];
  const conflicting: TransportIndemnityConfig = { ...transport, versions: [
    { ...base, validFrom: '2025-01-01', validTo: '2026-02-15', fullAmount: 2075.88 },
    base,
  ] };
  const conflict = resolveTransportIndemnity(conflicting, '2026-02');
  assert.equal(conflict.status, 'unavailable');
  assert.match(conflict.reason!, /sobrepostas/);
  const ended = resolveTransportIndemnity({ ...transport, versions: [
    { ...base, validFrom: '2025-01-01', validTo: '2026-02-12' },
  ] }, '2026-02');
  assert.equal(ended.status, 'unavailable');
  assert.equal(ended.amount, 0);
  const reversed = resolveTransportIndemnity({ ...transport, versions: [
    base,
    { ...base, validFrom: '2025-01-01', validTo: '2026-02-12', fullAmount: 2075.88 },
  ] }, '2026-02');
  assert.equal(reversed.fullAmount, 2168.46);
  assert.equal(reversed.transitionDate, '2026-02-13');
});

test('transporte: configuração versionada incompleta não herda silenciosamente parâmetros legados', () => {
  const version = { ...transport.versions[0], divisor: 20, incidences: { ir: false, pss: false, funpresp: false } };
  for (const broken of [
    { ...version, divisor: undefined },
    { ...version, incidences: undefined },
    { ...version, incidences: { ir: false, pss: false } as any },
    { ...version, divisor: 0 },
  ]) {
    const result = resolveTransportIndemnity({ ...transport, versions: [broken] }, '2026-11');
    assert.equal(result.status, 'unavailable');
    assert.equal(result.amount, 0);
  }
  const mixed = resolveTransportIndemnity({ ...transport, versions: [
    { validFrom: '2025-01-01', validTo: '2025-12-31', fullAmount: 2075.88, reference: 'Legada' },
    version,
  ] }, '2025-01');
  assert.equal(mixed.status, 'unavailable');
  assert.match(mixed.reason!, /preservar o histórico/);
  // Entirely legacy configurations remain supported during database/frontend rollout.
  assert.equal(calculate(10).amount, 1084.23);
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

const cjfTransport: TransportIndemnityConfig = {
  enabled: true,
  competenceMode: 'previous_month',
  divisor: 20,
  versions: [
    {
      validFrom: '2025-01-01',
      validTo: '2025-12-31',
      fullAmount: 2289.21,
      divisor: 20,
      incidences: { ir: false, pss: false, funpresp: false },
      publicationDate: '2025-02-13',
      financialEffectsFrom: '2025-01-01',
      normativeLabel: 'Res. CJF nº 4/2008 • Portaria nº 43/2025',
      reference: 'Portaria CJF nº 43, de 22/01/2025 (DOU 13/02/2025, Seção 1, p. 119)'
    },
    {
      validFrom: '2026-01-01',
      validTo: null,
      fullAmount: 2391.30,
      divisor: 20,
      incidences: { ir: false, pss: false, funpresp: false },
      publicationDate: '2026-04-08',
      financialEffectsFrom: '2026-01-01',
      normativeLabel: 'Res. CJF nº 4/2008 • Portaria nº 182/2026',
      reference: 'Portaria CJF nº 182, de 06/04/2026 (DOU 08/04/2026, Seção 1, p. 177)'
    }
  ],
  normativeLabel: 'Res. CJF nº 4/2008 • Portaria nº 182/2026',
  info: 'Ressarcimento das despesas com veículo particular utilizado em serviço externo pelo Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal.',
  notes: [
    'O pagamento é realizado no mês seguinte ao da execução do serviço externo (art. 56 da Resolução CJF nº 4/2008).'
  ],
  incidences: { ir: false, pss: false, funpresp: false }
};

const cjfConfig: CourtConfig = {
  ...config,
  orgSlug: 'cjf',
  orgName: 'Justiça Federal (CJF e TRFs)',
  transportIndemnity: cjfTransport,
  dailies: {
    rates: { analista: 806.82, tecnico: 660.13 },
    normativeInfo: { generalRuleLabel: 'Resolução CNJ Nº 73/2009', branchRuleLabel: 'Resolução CJF Nº 340/2015' }
  }
};

const calculateCJF = (days: number, court = cjfConfig, competence = '2026-05') => calculateTransportIndemnity({
  ...mapStateToAgencyParams({ ...initial(), transporteIndenizacaoDias: days }, 'cjf', court), competencia: competence,
});

test('transporte CJF: todos os valores com R$ 2.391,30 e arredondamento robusto em meio centavo', () => {
  const examples = [
    [0, 0],
    [1, 119.57],
    [2, 239.13],
    [5, 597.83],
    [10, 1195.65],
    [19, 2271.74],
    [20, 2391.30],
    [22, 2391.30],
  ];
  for (const [days, amount] of examples) {
    const res = calculateCJF(days, cjfConfig, '2026-05');
    assert.equal(res.amount, amount, `Dias: ${days}`);
    assert.equal(res.days, days);
    assert.equal(res.eligibleDays, Math.min(days, 20));
    assert.equal(res.status, days === 0 ? 'zero' : days >= 20 ? 'full' : 'proportional');
  }
});

test('transporte CJF: negativos, decimais, não finitos e limites do calendário do mês de serviço', () => {
  for (const days of [-1, 1.5, NaN, Infinity, -Infinity, '5' as any]) {
    const res = calculateCJF(days, cjfConfig, '2026-05');
    assert.equal(res.status, 'invalid', String(days));
    assert.equal(res.amount, 0);
  }
  // Pagamento em 2026-03 -> mês de serviço 2026-02 (fevereiro de 2026 possui 28 dias)
  const feb28 = calculateCJF(28, cjfConfig, '2026-03');
  assert.equal(feb28.status, 'full');
  assert.equal(feb28.maxDays, 28);
  const feb29 = calculateCJF(29, cjfConfig, '2026-03');
  assert.equal(feb29.status, 'invalid');
  assert.match(feb29.reason!, /entre 0 e 28/);

  // Pagamento em 2028-03 -> mês de serviço 2028-02 (ano bissexto: fevereiro possui 29 dias)
  const leap29 = calculateCJF(29, cjfConfig, '2028-03');
  assert.equal(leap29.status, 'full');
  assert.equal(leap29.maxDays, 29);
  const leap30 = calculateCJF(30, cjfConfig, '2028-03');
  assert.equal(leap30.status, 'invalid');
  assert.match(leap30.reason!, /entre 0 e 29/);

  // Pagamento em 2026-05 -> mês de serviço 2026-04 (abril possui 30 dias)
  assert.equal(calculateCJF(30, cjfConfig, '2026-05').status, 'full');
  assert.equal(calculateCJF(31, cjfConfig, '2026-05').status, 'invalid');
});

test('transporte CJF: virada dezembro/janeiro entre serviço e pagamento', () => {
  // Folha de Janeiro/2026: pagamento 2026-01, serviço executado em 2025-12
  const decService = calculateCJF(10, cjfConfig, '2026-01');
  assert.equal(decService.serviceCompetence, '2025-12');
  assert.equal(decService.paymentCompetence, '2026-01');
  assert.equal(decService.fullAmount, 2289.21);
  assert.equal(decService.amount, 1144.61);
  assert.equal(decService.maxDays, 31);
  assert.equal(decService.normativeLabel, 'Res. CJF nº 4/2008 • Portaria nº 43/2025');

  // Folha de Fevereiro/2026: pagamento 2026-02, serviço executado em 2026-01
  const janService = calculateCJF(10, cjfConfig, '2026-02');
  assert.equal(janService.serviceCompetence, '2026-01');
  assert.equal(janService.paymentCompetence, '2026-02');
  assert.equal(janService.fullAmount, 2391.30);
  assert.equal(janService.amount, 1195.65);
  assert.equal(janService.maxDays, 31);
  assert.equal(janService.normativeLabel, 'Res. CJF nº 4/2008 • Portaria nº 182/2026');
});

test('transporte CJF: fronteiras de publicação e efeitos financeiros de 2025 e 2026 com documentação explícita', () => {
  // Pagamento 2025-01 (serviço 2024-12): período anterior sem presunção de regra
  const prior2025 = calculateCJF(20, cjfConfig, '2025-01');
  assert.equal(prior2025.status, 'unavailable');
  assert.match(prior2025.reason!, /12\/2024/);

  // Pagamento 2025-02 (serviço 2025-01): Portaria 43/2025 publicada em 13/02/2025 com efeitos a 01/01/2025
  const feb2025 = calculateCJF(20, cjfConfig, '2025-02');
  assert.equal(feb2025.amount, 2289.21);
  assert.equal(feb2025.publicationDate, '2025-02-13');
  assert.equal(feb2025.financialEffectsFrom, '2025-01-01');
  assert.match(feb2025.transitionWarning!, /13\/02\/2025/);
  assert.match(feb2025.transitionWarning!, /01\/01\/2025/);

  // Pagamento 2026-02 (serviço 2026-01): Portaria 182/2026 publicada em 08/04/2026 com efeitos a 01/01/2026
  const feb2026 = calculateCJF(20, cjfConfig, '2026-02');
  assert.equal(feb2026.amount, 2391.30);
  assert.equal(feb2026.publicationDate, '2026-04-08');
  assert.equal(feb2026.financialEffectsFrom, '2026-01-01');
  assert.match(feb2026.transitionWarning!, /08\/04\/2026/);
  assert.match(feb2026.transitionWarning!, /01\/01\/2026/);

  // Pagamento 2026-05 (serviço 2026-04): publicação ocorrida no DOU em 08/04/2026
  const may2026 = calculateCJF(20, cjfConfig, '2026-05');
  assert.equal(may2026.amount, 2391.30);
  assert.equal(may2026.status, 'full');
  assert.equal(may2026.transitionWarning, undefined);
});

test('transporte CJF: configuração ausente, órgão sem habilitação e vigências conflitantes', () => {
  assert.equal(calculateCJF(20, { ...cjfConfig, transportIndemnity: undefined }).status, 'unavailable');
  assert.equal(calculateCJF(20, { ...cjfConfig, transportIndemnity: { ...cjfTransport, enabled: false } }).amount, 0);

  const conflicting: TransportIndemnityConfig = {
    ...cjfTransport,
    versions: [
      {
        validFrom: '2025-01-01', validTo: '2026-03-31', fullAmount: 2289.21, divisor: 20,
        incidences: { ir: false, pss: false, funpresp: false }, reference: 'Conflito 1'
      },
      {
        validFrom: '2026-01-01', validTo: null, fullAmount: 2391.30, divisor: 20,
        incidences: { ir: false, pss: false, funpresp: false }, reference: 'Conflito 2'
      }
    ]
  };
  const conflict = resolveTransportIndemnity(conflicting, '2026-03');
  assert.equal(conflict.status, 'unavailable');
  assert.match(conflict.reason!, /sobrepostas/);
});

test('transporte CJF: motor é isento e não altera auxílio-alimentação, auxílio-transporte ou diárias', async () => {
  const engine = new AgencyCalculationEngine();
  const state = { ...initial(), auxAlimentacao: 1784.42, auxTransporteGasto: 850, diariasQtd: 3, transporteIndenizacaoDias: 20 };
  const before = await engine.calculateTotal(mapStateToAgencyParams({ ...state, transporteIndenizacaoAtivo: false }, 'cjf', cjfConfig));
  const after = await engine.calculateTotal(mapStateToAgencyParams(state, 'cjf', cjfConfig));

  assert.equal(after.breakdown.transporteIndenizacaoValor, 2391.30);
  assert.equal(round(after.netSalary - before.netSalary), 2391.30);
  assert.equal(after.totalDeductions, before.totalDeductions);
  assert.equal(after.breakdown.auxAlimentacao, 1784.42);
  assert.equal(after.breakdown.auxTransporte, before.breakdown.auxTransporte);
  assert.equal(after.breakdown.diariasValor, before.breakdown.diariasValor);
  assert.equal(after.breakdown.pss, before.breakdown.pss);
  assert.equal(after.breakdown.irrf, before.breakdown.irrf);
  assert.equal(after.breakdown.funpresp, before.breakdown.funpresp);
});

test('transporte CJF: diárias no mês não excluem automaticamente a indenização', async () => {
  const engine = new AgencyCalculationEngine();
  const state = { ...initial(), diariasQtd: 5, transporteIndenizacaoAtivo: true, transporteIndenizacaoDias: 15 };
  const res = await engine.calculateTotal(mapStateToAgencyParams(state, 'cjf', cjfConfig));

  assert.equal(res.breakdown.transporteIndenizacaoValor, 1793.48);
  assert(res.breakdown.diariasValor > 0);
  assert.equal(res.breakdown.transporteIndenizacaoMemory?.eligibleDays, 15);
});

test('transporte CJF: hook inclui crédito único no holerite, recalcula dias e remove ao desativar', async () => {
  const engine = new AgencyCalculationEngine();
  const agency = { slug: 'cjf', name: 'Justiça Federal', type: 'judiciary' };
  let current = { ...initial(), anoRef: 2026, mesRef: 'MAIO', transporteIndenizacaoAtivo: true, transporteIndenizacaoDias: 20 };
  let currentConfig = cjfConfig;
  let latest!: ReturnType<typeof useCalculatorResults>;
  function Probe() { latest = useCalculatorResults(current, engine, currentConfig, agency); return null; }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(React.createElement(Probe)); });

  assert.equal(latest.calculationStatus, 'ready');
  const rows = () => latest.resultRows.filter(r => r.label === 'INDENIZAÇÃO DE TRANSPORTE');
  assert.equal(rows().length, 1);
  assert.equal(rows()[0].value, 2391.30);
  assert.equal(rows()[0].type, 'C');

  // Recalcular com 5 dias
  current = { ...current, transporteIndenizacaoDias: 5 };
  await act(async () => { tree.update(React.createElement(Probe)); });
  assert.equal(rows()[0].value, 597.83);

  // Desativar
  current = { ...current, transporteIndenizacaoAtivo: false };
  await act(async () => { tree.update(React.createElement(Probe)); });
  assert.equal(rows().length, 0);

  await act(async () => { tree.unmount(); });
});

test('transporte CJF: exportação preserva mês de serviço, pagamento e alertas em PDF e Excel', async () => {
  const state: CalculatorState = {
    ...initial(),
    nome: 'OFICIAL DE JUSTIÇA',
    anoRef: 2026,
    mesRef: 'FEVEREIRO',
    transporteIndenizacaoAtivo: true,
    transporteIndenizacaoDias: 20,
    transporteIndenizacaoValor: 2391.30,
    transporteIndenizacaoMemory: calculateCJF(20, cjfConfig, '2026-02')
  };
  const rows = [
    { type: 'C', label: 'VENCIMENTO', value: 8000 },
    { type: 'C', label: 'INDENIZAÇÃO DE TRANSPORTE', value: 2391.30 }
  ];
  const captured: any[] = [];
  (globalThis as any).__exportFilesTest = (blob: any, filename: string) => captured.push({ blob, filename });

  exportToPDF(state, rows, cjfConfig);
  exportToExcel(state, rows, cjfConfig);

  assert.equal(captured.length, 2);
  const pdfFile = captured.find(c => c.filename.endsWith('.pdf'));
  const excelFile = captured.find(c => c.filename.endsWith('.xlsx'));
  assert(pdfFile && excelFile);

  const pdfText = Buffer.from(await pdfFile.blob.arrayBuffer()).toString('latin1');
  assert(pdfText.includes('Indenização de Transporte'));
  assert(pdfText.includes('01/2026') || pdfText.includes('Janeiro/2026') || pdfText.includes('2.391,30'));
});

test('transporte: acessibilidade do botão Info com mouse, teclado e Escape', async () => {
  const listeners: Record<string, Function[]> = {};
  (globalThis as any).document = {
    addEventListener: (type: string, fn: Function) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      listeners[type] = (listeners[type] || []).filter(l => l !== fn);
    },
    dispatchEvent: (event: any) => {
      (listeners[event.type] || []).forEach(fn => fn(event));
      return true;
    }
  };

  const state = { ...initial(), transporteIndenizacaoAtivo: true, transporteIndenizacaoDias: 20,
    transporteIndenizacaoMemory: calculateCJF(20, cjfConfig, '2026-05') };
  const instance = { key: 'preset-indenizacao_transporte', presetId: 'indenizacao_transporte' as const };
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      React.createElement(PresetInstanceCard, {
        instance,
        presetLabel: 'Indenização de Transporte',
        reorderMode: false,
        draggingPreset: null,
        handlePresetDragStart: () => {},
        handlePresetDragOver: () => {},
        handlePresetDrop: () => {},
        handlePresetDragEnd: () => {},
        removePreset: () => {},
        state,
        update: () => {},
        styles: { card: 'card', innerBox: 'innerBox', label: 'label', input: 'input' },
        isNovoAQ: false,
        competenciaReferencia: 'Maio/2026',
        functionKeys: [],
        updateOvertimeEntry: () => {},
        updateSubstitutionEntry: () => {},
        courtConfig: cjfConfig,
        lines: []
      })
    );
  });

  const infoButton = tree.root.findByProps({ 'aria-label': 'Informações sobre indenização de transporte' });
  assert.equal(infoButton.props['aria-expanded'], false);

  // Click / focus abre info
  await act(async () => {
    infoButton.props.onClick({ stopPropagation: () => {} });
  });
  assert.equal(infoButton.props['aria-expanded'], true);
  const tooltip = tree.root.findByProps({ role: 'tooltip' });
  assert(tooltip.props.children.includes('Oficial de Justiça Avaliador Federal'));

  // Escape fecha
  await act(async () => {
    (globalThis as any).document.dispatchEvent({ type: 'keydown', key: 'Escape' });
  });
  assert.equal(infoButton.props['aria-expanded'], false);

  await act(async () => { tree.unmount(); });
});
