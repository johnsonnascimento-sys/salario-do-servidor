import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig } from '../src/types';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { buildPensionAuditRows } from '../src/utils/pensionExport';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';

const config: CourtConfig = {
 bases: { salario: { teste: { A1: 6000 } }, funcoes: { fc1: 1000 } },
 historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
 historico_ir: { teste: 100 }, historico_ir_brackets: {}, values: {},
 payrollRules: { gajRate: 0.5, specificGratificationRate: 0.1, vrRateOnCj1: 0.1, monthDayDivisor: 30,
 overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: 0.06, irrfTopRate: 0.2 },
 careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
 previdenciaComplementar: { enabled: true, scope: 'patrocinado_vinculado', baseRule: 'excedente_teto_rgps',
 includeThirteenth: true, sponsoredRate: { min: 0.065, max: 0.085, step: 0.005, defaultRpc: 0.085 },
 facultativeRate: { minIfPositive: 0.025, default: 0 }, incidenceRules: { fc: true, gas: true, gae: true, aqTreino: true } }
};
const initial = (): CalculatorState => ({ ...INITIAL_STATE, anoRef: 2026, mesRef: 'SETEMBRO', cargo: 'teste', padrao: 'A1',
 funcao: 'fc1', tabelaPSS: 'teste', tabelaIR: 'teste', regimePrev: 'rpc', funprespParticipacao: 'patrocinado', funprespAliq: 0.085,
 adiant13Venc: 1, segunda13Venc: 1, adiant13FC: 1, segunda13FC: 1 });
const round = (n: number) => Math.round(n * 100) / 100;

test('real hook reconciles payroll rows, 13th deduction, independent input invalidation and audit export', async () => {
 const engine = new AgencyCalculationEngine();
 const agency = { slug: 'jmu', name: 'JMU', type: 'judiciary' };
 let current = initial();
 let latest!: ReturnType<typeof useCalculatorResults>;
 function Probe() { latest = useCalculatorResults(current, engine, config, agency); return null; }
 let tree!: ReturnType<typeof create>;
 await act(async () => { tree = create(React.createElement(Probe)); });
 assert.equal(latest.calculationStatus, 'ready', latest.calculationError ?? '');
 const check = () => {
  const credits = latest.resultRows.filter(r => r.type === 'C').reduce((sum, r) => sum + r.value, 0);
  const debits = latest.resultRows.filter(r => r.type === 'D').reduce((sum, r) => sum + r.value, 0);
  assert.equal(round(debits), round(latest.calculatedState.totalDescontos));
  assert.equal(round(credits - debits), round(latest.calculatedState.liquido));
 };
 check();
 assert.equal(latest.resultRows.find(r => r.label.includes('FUNPRESP') && r.label.includes('13º'))?.value, 340);
 assert.equal(latest.calculatedState.pensionMemory?.mensal.competencia, '2026-09');
 assert.ok(buildPensionAuditRows(latest.calculatedState.pensionMemory).some(([key, value]) => key === 'Desconto Funpresp na folha' && value === 340));
 const grossLines = buildPresetGrossLines({ instance: { key: 'decimo', presetId: 'decimo' },
  state: { ...current, ...latest.calculatedState }, courtConfig: config, currentTables: { funcoes: { fc1: 1000 } },
  isNovoAQ: false, noFunctionCode: '0', currentFunctionValue: 1000, gratificacaoEspecificaCalculada: 0 });
 assert.equal(grossLines.find(r => r.label === 'Desconto Funpresp (Total 13º salário)')?.value, 340);
 const before = latest.calculatedState.valFunpresp;
 current = { ...current, funprespIncluirFC: true };
 await act(async () => { tree.update(React.createElement(Probe)); });
 assert.equal(latest.calculatedState.valFunpresp - before, 85);
 check();
 current = { ...current, funprespFacul: 0.025, funprespFaculValor: 150, funprespFaculForma: 'externo' };
 await act(async () => { tree.update(React.createElement(Probe)); });
 check();
 assert.equal(latest.resultRows.filter(r => r.label.includes('FACULTATIVA')).length, 0);
 assert.equal(latest.calculatedState.pensionMemory?.mensal.aporteExterno, 150);
 current = { ...current, funprespAliq: -1 };
 await act(async () => { tree.update(React.createElement(Probe)); });
 assert.equal(latest.calculationStatus, 'error');
 assert.match(latest.calculationError ?? '', /Previdência/);
 assert.deepEqual(latest.resultRows, []);
 await act(async () => tree.unmount());
});

test('legacy sponsored snapshots require review and preserve explicit new inputs through serialization', () => {
 const old = { ...initial() };
 delete old.funprespIncluirFC;
 delete old.funprespRevisarOpcoes;
 const restored = hydrateCalculatorState(old);
 assert.equal(restored.funprespRevisarOpcoes, true);
 const revised = { ...restored, funprespRevisarOpcoes: false, funprespIncluirGAS: true, funprespIncluirAQTreino: true,
 pensionRetroEntries: [{ id: 'retro', competencia: '2026-08', modo: 'manual' as const, justificativa: 'Memória da folha', ajusteComplementar: 10 }] };
 const roundtrip = hydrateCalculatorState(JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(revised))));
 assert.equal(roundtrip.funprespRevisarOpcoes, false);
 assert.equal(roundtrip.funprespIncluirGAS, true);
 assert.equal(roundtrip.funprespIncluirAQTreino, true);
 assert.deepEqual(roundtrip.pensionRetroEntries, revised.pensionRetroEntries);
});
