import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STATE, type CourtConfig } from '../src/types';
import type { ThirteenthPayrollInput, ThirteenthEntry } from '../src/types/thirteenth';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { calculateThirteenth } from '../src/services/agency/engine/modules/thirteenthCalculations';
import { buildThirteenthReference, ThirteenthPendingError } from '../src/services/agency/engine/modules/thirteenthLedger';

// Synthetic table/amounts; these tests do not state official tax rates or use personal payroll data.
const configuration = (): CourtConfig => ({
    bases: { salario: { teste: { A1: 6000 } }, funcoes: { fc1: 1000 } },
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
    historico_ir: { teste: 0 }, values: { deducao_dep: 100 },
    payrollRules: { gajRate: 0.5, specificGratificationRate: 0.1, vrRateOnCj1: 0.1,
        monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: 0.06, irrfTopRate: 0.1 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    previdenciaComplementar: { enabled: true, scope: 'patrocinado', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
        sponsoredRate: { min: 0.065, max: 0.085, step: 0.005, defaultRpc: 0.085 },
        facultativeRate: { minIfPositive: 0.025, default: 0 }, incidenceRules: { fc: true, gas: true, gae: true, aqTreino: true },
        rubricCatalog: [{ id: 'eligible', label: 'Synthetic eligible credit', classification: 'obrigatoria', validFrom: '2024-01', source: 'Synthetic test fixture' }] },
});
const input = (patch: Partial<ThirteenthPayrollInput> = {}): ThirteenthPayrollInput => ({
    version: 1, firstSelected: true, secondSelected: true, firstMode: 'automatico', secondMode: 'automatico',
    advances: [], secondEntries: [], ...patch,
});
const row = (target: string, amount: number): ThirteenthEntry => ({ id: `entry-${target}`, target, amount, description: `Test ${target}` });
const parameters = () => mapStateToAgencyParams({ ...INITIAL_STATE, cargo: 'teste', padrao: 'A1', funcao: 'fc1',
    periodo: 0, tabelaPSS: 'teste', tabelaIR: 'teste', tipoCalculo: 'comum', regimePrev: 'antigo',
    funprespParticipacao: 'nao', funprespAliq: 0, funprespFacul: 0, dependentes: 0,
    adiant13Venc: 1, adiant13FC: 1, segunda13Venc: 1, segunda13FC: 1 }, 'jmu', configuration());

test('unified automatic selection closes the same reference and taxes as legacy groups', async () => {
    const params = parameters();
    const old = await calculateThirteenth(params);
    const result = await calculateThirteenth({ ...params, thirteenthPayroll: input() });
    for (const key of ['gratNatalinaTotal', 'adiant13Venc', 'adiant13FC', 'segunda13Venc', 'segunda13FC', 'primeiraParcelaDesconto', 'pss13', 'ir13'] as const) {
        assert.equal(result[key], old[key], key);
    }
    assert.equal(result.thirteenthMemory?.referenceTotal, 10000);
    assert.equal(result.thirteenthMemory?.firstTotal, 5000);
    assert.equal(result.thirteenthMemory?.secondTotal, 5000);
    assert.equal(old.thirteenthMemory, undefined);
});

test('multiple informed advances are debited once and do not duplicate the remuneration', async () => {
    const result = await calculateThirteenth({ ...parameters(), thirteenthPayroll: input({ firstMode: 'informado',
        advances: [row('vencimento', 2000), row('gaj', 1000), row('funcao', 400)] }) });
    assert.equal(result.thirteenthMemory?.firstTotal, 3400);
    assert.equal(result.thirteenthMemory?.secondTotal, 6600);
    assert.equal(result.segunda13Venc, 6000);
    assert.equal(result.segunda13FC, 600);
    assert.equal(result.primeiraParcelaDesconto, 3400);
    assert.equal(result.gratNatalinaTotal, 10000);
});

test('aggregated JMU-like advances need no fictional split between salary components', async () => {
    const result = await calculateThirteenth({ ...parameters(), thirteenthPayroll: input({ firstMode: 'informado',
        advances: [row('grupo:cargo', 3500), row('grupo:funcao', 400)] }) });
    assert.equal(result.segunda13Venc, 5500);
    assert.equal(result.segunda13FC, 600);
    assert.equal(result.pss13, 900);
    assert.deepEqual(result.thirteenthMemory?.advances.map(entry => entry.target), ['grupo:cargo', 'grupo:funcao']);
});

test('manual itemized closure respects AQ training and FC PSS exclusions', async () => {
    const params = parameters(); params.aqTreinoPerc = 0.05;
    const result = await calculateThirteenth({ ...params, thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
        advances: [row('vencimento', 1000), row('gaj', 500), row('funcao', 200)],
        secondEntries: [row('vencimento', 2500), row('aqTreino', 150)] }) });
    assert.equal(result.gratNatalinaTotal, 4350);
    assert.equal(result.pss13, 400);
    assert.equal(result.ir13, 395);
    assert.equal(result.pensionMemory?.componentes.aqTreino, 0);
    assert.equal(result.pensionMemory?.componentes.fc, 0);
});

for (const amount of [0, 0.5, 1]) {
    test(`manual amount ${amount} remains a monetary amount and settles its advance`, async () => {
        const result = await calculateThirteenth({ ...parameters(), funcao: '0', thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
            advances: [row('vencimento', 3000)], secondEntries: [row('vencimento', amount)] }) });
        assert.equal(result.segunda13Venc, amount);
        assert.equal(result.primeiraParcelaDesconto, 3000);
        assert.equal(result.pss13, Math.round((3000 + amount) * 0.1 * 100) / 100);
        assert.ok(result.ir13 > 0);
    });
}

test('selected dynamic credit retains its own IR/PSS and complementary nature', async () => {
    const params = parameters();
    params.regimePrev = 'rpc'; params.funprespParticipacao = 'patrocinado'; params.funprespAliq = 0.085; params.competencia = '2026-11';
    params.rubricasExtras = [{ id: 'credit', descricao: 'Synthetic credit', tipo: 'C', valor: 500,
        incideIR: false, incidePSS: false, incideFunpresp: true, pensionRubricId: 'eligible', isEA: false }];
    params.decimoRubricasInclusas = { credit: true };
    const result = await calculateThirteenth({ ...params, thirteenthPayroll: input() });
    assert.equal(result.gratNatalinaTotal, 10500);
    assert.equal(result.pss13, 500);
    assert.equal(result.pensionMemory?.baseComplementarIntegral, 9500);
    assert.equal(result.funpresp13, 382.5);
    assert.equal(result.ir13, 911.75);
    assert.equal(result.pensionMemory?.enquadramentos?.[0].rubricaId, 'credit');
});

test('abono mensal and separately calculated abono13 are not inserted twice in reference', async () => {
    const result = await calculateThirteenth({ ...parameters(), recebeAbono: true, abonoPermanencia: 800,
        thirteenthPayroll: input() });
    assert.equal(result.thirteenthMemory?.referenceTotal, 10800);
    assert.equal(result.thirteenthMemory?.components.find(item => item.id === 'abono')?.amount, 800);
    assert.equal(result.abono13, 980);
    assert.equal(result.gratNatalinaTotal, 11780);
    assert.equal(result.thirteenthMemory?.components.some(item => item.id === 'abono13'), false);
});

test('documented grouped closure at the full reference preserves heterogeneous component incidences', async () => {
    const params = parameters();
    params.rubricasExtras = [{ id: 'exempt', descricao: 'Synthetic exempt credit', tipo: 'C', valor: 500,
        incideIR: false, incidePSS: false, incideFunpresp: false, isEA: false }];
    params.decimoRubricasInclusas = { exempt: true };
    const result = await calculateThirteenth({ ...params, thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
        advances: [row('grupo:cargo', 3500), row('grupo:funcao', 400)],
        secondEntries: [row('grupo:cargo', 6000), row('grupo:funcao', 600)] }) });
    assert.equal(result.gratNatalinaTotal, 10500);
    assert.equal(result.pss13, 900);
    assert.equal(result.ir13, 910);
});

test('equal total never replaces a fully itemized manual allocation with the reference composition', async () => {
    const params = parameters(); params.funcao = '0'; params.aqTreinoPerc = 0.05;
    const result = await calculateThirteenth({ ...params, thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
        advances: [row('vencimento', 1000)], secondEntries: [row('gaj', 8300)] }) });
    assert.equal(result.gratNatalinaTotal, 9300);
    assert.equal(result.pss13, 930);
    assert.equal(result.pensionMemory?.baseRppsIntegral, 9300);
});

test('automatic first-half composition remains known when the equal-total second is itemized', async () => {
    const params = parameters(); params.funcao = '0'; params.aqTreinoPerc = 0.05;
    const result = await calculateThirteenth({ ...params, thirteenthPayroll: input({ firstMode: 'automatico', secondMode: 'manual',
        secondEntries: [row('gaj', 4650)] }) });
    assert.equal(result.gratNatalinaTotal, 9300);
    assert.equal(result.pss13, 915);
    assert.equal(result.pensionMemory?.baseRppsIntegral, 9150);
});

test('grouped equal-total shortcut rejects contradictory known itemized amounts', async () => {
    const params = parameters(); params.funcao = '0'; params.aqTreinoPerc = 0.05;
    await assert.rejects(() => calculateThirteenth({ ...params, thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
        advances: [row('grupo:cargo', 3000)], secondEntries: [row('vencimento', 6300)] }) }), /divergem da referência/);
    const consistent = await calculateThirteenth({ ...params, thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
        advances: [row('vencimento', 6000)], secondEntries: [row('grupo:cargo', 3300)] }) });
    assert.equal(consistent.pss13, 900);
});

test('types impose the same first/second selections while a second selection implies first', async () => {
    for (const type of ['jan', 'jun', 'nov'] as const) {
        const result = await calculateThirteenth({ ...parameters(), tipoCalculo: type,
            thirteenthPayroll: input({ firstSelected: false, secondSelected: false }) });
        assert.equal(result.thirteenthMemory?.firstSelected, true);
        assert.equal(result.thirteenthMemory?.secondSelected, type === 'nov');
    }
    const selected = await calculateThirteenth({ ...parameters(), thirteenthPayroll: input({ firstSelected: false }) });
    assert.equal(selected.thirteenthMemory?.firstSelected, true);
});

test('unknown targets, duplicate IDs/targets, group overlap, negative values and excess advances stay pending', async () => {
    for (const entries of [
        [row('unknown', 10)], [row('vencimento', -1)], [row('vencimento', 0.001)],
        [row('vencimento', 7000)], [row('grupo:funcao', 1001)],
        [row('vencimento', 1), { ...row('gaj', 1), id: 'entry-vencimento' }],
        [row('vencimento', 1), { ...row('vencimento', 2), id: 'different-id' }],
        [row('grupo:cargo', 100), row('vencimento', 100)],
    ]) {
        await assert.rejects(() => calculateThirteenth({ ...parameters(), thirteenthPayroll: input({ firstMode: 'informado', advances: entries }) }), ThirteenthPendingError);
    }
    const reference = await buildThirteenthReference({ ...parameters(), thirteenthPayroll: input({ firstMode: 'informado', advances: [row('unknown', 1)] }) });
    assert.equal(reference.referenceTotal, 10000);
});

test('unknown nature and partial grouped/itemized tax settlement require identification', async () => {
    await assert.rejects(() => calculateThirteenth({ ...parameters(), decimoOutrasParcelas: 100,
        thirteenthPayroll: input() }), /identifique as incidências/);
    await assert.rejects(() => calculateThirteenth({ ...parameters(), thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
        advances: [row('grupo:cargo', 3000)], secondEntries: [row('vencimento', 1000)] }) }), /discrimine as verbas/);
    const closed = await calculateThirteenth({ ...parameters(), funcao: '0', thirteenthPayroll: input({ firstMode: 'informado', secondMode: 'manual',
        advances: [row('grupo:cargo', 3000)], secondEntries: [row('vencimento', 6000)] }) });
    assert.equal(closed.pss13, 900);
});

test('function removed or excluded cannot receive a residual function ledger entry', async () => {
    for (const change of [{ funcao: '0' }, { decimoIncideFuncao: false }]) {
        await assert.rejects(() => calculateThirteenth({ ...parameters(), ...change, thirteenthPayroll: input({ firstMode: 'informado', advances: [row('grupo:funcao', 10)] }) }), /composição ativa/);
        const result = await calculateThirteenth({ ...parameters(), ...change, thirteenthPayroll: input() });
        assert.equal(result.adiant13FC, 0);
        assert.equal(result.segunda13FC, 0);
    }
});
