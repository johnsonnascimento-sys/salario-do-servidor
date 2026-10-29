import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STATE, type CourtConfig } from '../src/types';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { calculateThirteenth } from '../src/services/agency/engine/modules/thirteenthCalculations';
import { calculateCompensatoryLeave } from '../src/services/agency/engine/modules/leaveCalculations';
import { calculateDailies } from '../src/services/agency/engine/modules/dailiesCalculations';

// Deliberately synthetic rates, independently chosen to expose component mixing.
const config: CourtConfig = {
 bases: { salario: { teste: { A1: 6000 } }, funcoes: { fc1: 1000, fc2: 1500 } },
 historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
 historico_ir: { teste: 100 }, historico_ir_brackets: {}, values: { deducao_dep: 100 },
 payrollRules: { gajRate: 0.5, specificGratificationRate: 0.1, vrRateOnCj1: 0.1,
 monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22,
 transportDiscountRate: 0.06, irrfTopRate: 0.2 },
 careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
};
const params = (patch: Record<string, unknown> = {}) => mapStateToAgencyParams({ ...INITIAL_STATE,
 cargo: 'teste', padrao: 'A1', funcao: 'fc1', tabelaPSS: 'teste', tabelaIR: 'teste',
 regimePrev: 'antigo', dependentes: 0, funprespParticipacao: 'nao', ...patch }, 'jmu', config);
const engine = new AgencyCalculationEngine();

test('13º only second vencimento normalizes its first and never invents FC', async () => {
 const p = params({ segunda13Venc: 1 });
 const original = structuredClone(p);
 const r = await calculateThirteenth(p);
 assert.equal(r.adiant13Venc, 4500);
 assert.equal(r.adiant13FC, 0);
 assert.equal(r.primeiraParcelaDesconto, 4500);
 assert.equal(r.pss13, 900);
 assert.equal(r.ir13, 1520);
 assert.equal(r.memory.first.gross, 4500);
 assert.equal(r.memory.second.gross, 9000);
 assert.equal(r.memory.second.net, 2080);
 assert.equal(r.gratNatalinaTotal, 9000);
 assert.deepEqual(p, original);
});

test('13º only FC has no vencimento PSS or abatement', async () => {
 const r = await calculateThirteenth(params({ segunda13FC: 1 }));
 assert.equal(r.adiant13Venc, 0);
 assert.equal(r.adiant13FC, 500);
 assert.equal(r.pss13, 0);
 assert.equal(r.primeiraParcelaDesconto, 500);
 assert.equal(r.ir13, 100);
 assert.equal(r.memory.first.deductions, 0);
 assert.equal(r.memory.second.net, 400);
});

test('13º first-only component never joins another component second taxable base', async () => {
 const r = await calculateThirteenth(params({ adiant13Venc: 1, segunda13FC: 1 }));
 assert.equal(r.pss13, 0);
 assert.equal(r.ir13, 100);
 assert.equal(r.primeiraParcelaDesconto, 500);
 assert.equal(r.memory.first.gross, 5000);
 assert.equal(r.memory.second.gross, 1000);
});

test('13º both second components and first-only have consistent installment totals', async () => {
 const r = await calculateThirteenth(params({ segunda13Venc: 1, segunda13FC: 1 }));
 assert.equal(r.pss13, 900);
 assert.equal(r.ir13, 1720);
 assert.equal(r.primeiraParcelaDesconto, 5000);
 assert.equal(r.memory.second.net, 2380);
 assert.equal(r.memory.payroll.gross, 10000);
 assert.equal(r.memory.payroll.deductions, 7620);
 assert.equal(r.memory.payroll.net, 2380);
 const first = await calculateThirteenth(params({ adiant13Venc: 1, adiant13FC: 1 }));
 assert.equal(first.pss13 + first.ir13 + first.primeiraParcelaDesconto, 0);
 assert.equal(first.memory.first.net, 5000);
 assert.equal(first.memory.second.gross, 0);
 assert.equal(first.memory.payroll.net, 5000);
});

test('13º manual second requires matching first with field-specific validation', async () => {
 await assert.rejects(() => calculateThirteenth(params({ manualAdiant13: true, segunda13FC: 500 })),
  (e: any) => e.field === 'adiant13FC' && /primeira parcela/i.test(e.message));
 const r = await calculateThirteenth(params({ manualAdiant13: true, adiant13FC: 300, segunda13FC: 700 }));
 assert.equal(r.primeiraParcelaDesconto, 300);
 assert.equal(r.pss13, 0);
 assert.equal(r.memory.second.gross, 1000);
});

test('engine rejects negative/nonfinite inputs, direct leave rejects negative days', async () => {
 for (const patch of [{ licencaDias: -1 }, { auxTransporteGasto: NaN }, { heQtd50: Infinity },
  { rubricasExtras: [{ id: 'r', tipo: 'C', descricao: 'x', valor: -2 }] },
  { substitutionEntries: [{ id: 's', dias: { fc1: -1 } }] }]) {
  await assert.rejects(() => engine.calculateTotal(params(patch)), /inválid|negativ|finito/i);
 }
 await assert.rejects(() => calculateCompensatoryLeave(params({ licencaDias: -1 })), /licencaDias/);
});

test('substitution memory preserves actual per-instance amounts and incidences', async () => {
 const r = await engine.calculateTotal(params({ funcao: '0', substitutionEntries: [
  { id: 'monthly', dias: { fc1: 3 }, isEA: false, excluirIR: false, pssIsEA: false },
  { id: 'ea', dias: { fc2: 10 }, isEA: true, excluirIR: true, pssIsEA: true },
 ] }));
 assert.equal(r.breakdown.substituicao, 600);
 assert.deepEqual(r.calculationMemory?.substitutions.map(s => [s.id, s.total, s.isEA, s.excluirIR]),
  [['monthly', 100, false, false], ['ea', 500, true, true]]);
});

const dailyParams = (patch: Record<string, unknown> = {}) => ({ ...params(patch), agencyConfig: { ...config,
 dailies: { rates: { teste: 200 }, embarkationAdditional: { completo: 100, metade: 50 },
 discountRules: { foodDivisor: 20, transportDivisor: 20, excludeWeekendsAndHolidays: true,
 halfDailyOnBusinessReturnDay: true, halfDiscountOnBusinessReturnDay: true, holidays: ['2026-10-29'] } } } });

test('selected return holiday has zero discount in engine and its authoritative decomposition', async () => {
 const p = dailyParams({ diariasModoDesconto: 'periodo', diariasDataInicio: '2026-10-29',
  diariasDataFim: '2026-10-29', diariasFeriados: ['2026-10-29'], auxAlimentacao: 1000,
  diariasDescontarAlimentacao: true, diariasDescontarTransporte: true });
 const r = await calculateDailies(p);
 assert.equal(r.descAlim + r.descTransp, 0);
 assert.equal(r.memory.foodDiscountFull + r.memory.foodDiscountHalf, 0);
 assert.equal(r.memory.transportDiscountFull + r.memory.transportDiscountHalf, 0);
 assert.equal(r.memory.net, r.valor);
});

test('config fixed holidays do not apply when user selected none; half return is engine-owned', async () => {
 const p = dailyParams({ diariasModoDesconto: 'periodo', diariasDataInicio: '2026-10-29',
  diariasDataFim: '2026-10-29', diariasFeriados: [], auxAlimentacao: 1000,
  diariasDescontarAlimentacao: true, diariasDescontarTransporte: false });
 const r = await calculateDailies(p);
 assert.equal(r.descAlim, 25);
 assert.equal(r.memory.foodDiscountHalf, 25);
 assert.equal(r.memory.foodDiscountFull, 0);
 assert.equal(r.memory.quantity, 0.5);
 assert.equal(r.memory.net, 75);
});

test('invalid daily date ranges reject even with quantity zero', async () => {
 await assert.rejects(() => calculateDailies(dailyParams({ diariasModoDesconto: 'periodo',
  diariasDataInicio: '2026-10-30', diariasDataFim: '2026-10-29' })), /data final/i);
});

test('numeric adapter prevents deduction cancellation; pension adjustment policy stays specialized', async () => {
 assert.throws(() => params({ emprestimos: -100, planoSaude: 200 }), /emprestimos/);
 await assert.rejects(() => engine.calculateTotal(params({ pensionRetroEntries: [{ id: 'refund', competencia: '2026-08',
  modo: 'manual', ajusteRpps: -10, ajusteComplementar: -5, justificativa: 'Devolução documentada' }] })), /Previdência.*não negativo/);
});

test('effective adjustment flagged for review blocks until explicit configuration is provided', async () => {
 const p = params({ periodo: 2 });
 p.agencyConfig = { ...config, adjustment_schedule: [{ period: 2, percentage: 0.05, reviewRequired: true }] } as CourtConfig;
 await assert.rejects(() => engine.calculateTotal(p), /revisão administrativa/);
});

test('vetoed schedule entries are opt-in even when a later enacted period is selected; cache isolates projection', async () => {
 const p = params({ periodo: 3 });
 p.agencyConfig = { ...config, adjustment_schedule: [
  { period: 1, percentage: 0.1, status: 'promulgated' },
  { period: 2, percentage: 0.1, status: 'vetoed', vetoed: true },
  { period: 3, percentage: 0.1, status: 'promulgated' },
 ] } as CourtConfig;
 const standard = await engine.calculateTotal(p);
 const projection = await engine.calculateTotal({ ...p, simularDerrubadaVeto: true });
 assert.equal(Math.round(standard.breakdown.vencimento), 7260);
 assert.equal(Math.round(projection.breakdown.vencimento), 7986);
 assert.equal((await engine.calculateTotal(p)).breakdown.vencimento, standard.breakdown.vencimento);
});

test('selected daily reductions and enabled LDO require configuration, explicit zero is accepted', async () => {
 await assert.rejects(() => calculateDailies(dailyParams({ diariasQtd: 1, diariasExtHospedagem: true })), /glosa de hospedagem/);
 const p = dailyParams({ diariasQtd: 1, diariasExtHospedagem: true });
 p.agencyConfig.dailies.externalGloss = { hospedagem: 0, alimentacao: 0, transporte: 0 };
 assert.equal((await calculateDailies(p)).glosa, 0);
 p.agencyConfig.dailies.ldoCap = { enabled: true, perDiemLimit: undefined as unknown as number };
 await assert.rejects(() => calculateDailies(p), /limite LDO/);
});

test('minimum zero daily net posts only effective deductions and audits unapplied excess', async () => {
 const p = dailyParams({ diariasQtd: 1, diariasExtHospedagem: true, auxAlimentacao: 1000,
  diariasDescontarAlimentacao: true, diariasDiasDescontoAlimentacao: 1 });
 p.agencyConfig.dailies.externalGloss = { hospedagem: 1, alimentacao: 0, transporte: 0 };
 const r = await calculateDailies(p);
 assert.equal(r.valor, 0);
 assert.equal(r.bruto - r.corteLdo - r.glosa - r.deducoes, r.valor);
 assert.equal(r.memory.gross - r.memory.ldoCut - r.memory.externalGloss - r.memory.foodDiscount - r.memory.transportDiscount, r.memory.net);
 assert.equal(r.memory.calculatedAmounts.foodDiscount, 50);
 assert.equal(r.memory.foodDiscount, 0);
 assert.equal(r.memory.unappliedDeductions, 50);
});
