import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STATE, type CourtConfig } from '../src/types';
import type { IAgencyCalculationParams } from '../src/services/agency/engine/types';
import { calculateBase, calculateBaseComponents } from '../src/services/agency/engine/modules/baseCalculations';
import { calculateDeductions } from '../src/services/agency/engine/modules/deductionsCalculations';
import { calculateCommissionIncomeTax, calculateCommissionInss, resolveCommissionPay } from '../src/services/agency/engine/modules/commissionCalculations';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';

const tableSource = 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15293.htm';
const config: CourtConfig = {
    orgSlug: 'jmu', powerName: 'PJU',
    bases: { salario: { tecnico: { C13: 6000 } }, funcoes: { cj3: 10029.94, fc3: 1644.51 } },
    historico_pss: {}, historico_ir: { teste: 908.73 }, values: { deducao_dep: 189.59 },
    historico_ir_brackets: { teste: [
        { min: 0, max: 2428.80, rate: 0, deduction: 0 },
        { min: 2428.81, max: 2826.65, rate: 0.075, deduction: 182.16 },
        { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 394.16 },
        { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 675.49 },
        { min: 4664.69, max: Infinity, rate: 0.275, deduction: 908.73 },
    ] },
    historico_ir_metadata: { teste: { validFrom: '2026-01-01', validTo: '2027-01-01',
        reference: 'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tabelas/2026',
        rra: { deductDependents: false, deductComplementaryPension: false, reductionApplicable: false },
        payroll: { simplifiedDeduction: 607.20, reductionApplicable: true, reduction: {
            status: 'verified', exemptIncome: 5000, partialIncome: 7350, maxReduction: 312.89,
            intercept: 978.62, slope: 0.133145, reference: 'Lei nº 15.270/2025, art. 3º-A',
        } } } },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    payrollRules: { gajRate: 1.4, specificGratificationRate: 0.35, vrRateOnCj1: 0.065,
        monthDayDivisor: 30, overtimeMonthHours: 175, transportWorkdays: 22,
        transportDiscountRate: 0.06, irrfTopRate: 0.275 },
    commission: { enabled: true, versions: [
        { validFrom: '2026-01-01', validTo: '2026-07-01', cjIntegral: { cj3: 15430.68 },
            fc: { fc3: 1644.51 }, cjOptionRate: 0.65, source: 'Tabela oficial anterior a julho/2026' },
        { validFrom: '2026-07-01', validTo: '2027-01-01', cjIntegral: { cj1: 11870, cj2: 14659.71, cj3: 16665.13, cj4: 18812.93 },
            fc: { fc1: 1312.57, fc2: 1526.19, fc3: 1776.07, fc4: 2498.33, fc5: 2875.02, fc6: 3956.81 },
            cjOptionRate: 0.65, source: tableSource },
    ] },
    rgps: { versions: [{ validFrom: '2026-01-01', validTo: '2027-01-01', teto: 8475.55,
        faixas: [{ ate: 1621, aliq: 0.075 }, { ate: 2902.84, aliq: 0.09 }, { ate: 4354.27, aliq: 0.12 }, { ate: 8475.55, aliq: 0.14 }],
        source: 'Portaria Interministerial MPS/MF nº 13/2026' }] },
};

function params(patch: Partial<IAgencyCalculationParams> = {}): IAgencyCalculationParams {
    return { ...INITIAL_STATE, orgSlug: 'jmu', agencyConfig: config, competencia: '2026-07',
        cargo: 'tecnico', padrao: 'C13', funcao: 'cj3', periodo: 2,
        aqTituloVR: 5, aqTreinoVR: 5, aqTituloPerc: 0.1, aqTreinoPerc: 0.03,
        vpni_lei: 400, vpni_decisao: 200, ats: 300, gratEspecificaTipo: 'gae', gratEspecificaValor: 900,
        funprespParticipacao: 'patrocinado', funprespAliq: 0.085, funprespFacul: 0,
        tabelaIR: 'teste', tabelaPSS: '', recebeAbono: true,
        dependents: 0,
        commissionProfile: { kind: 'exclusive_cj' }, ...patch } as IAgencyCalculationParams;
}

test('CJ integral uses the official full table and suppresses stale career remuneration', async () => {
    const input = params();
    assert.equal(await calculateBase(input), 16665.13);
    const components = await calculateBaseComponents(input);
    assert.equal(components.funcaoValor, 16665.13);
    assert.equal(components.vencimento + components.gaj + components.aqTitulo + components.aqTreino + components.gratEspecifica + components.ats, 0);
    assert.equal(components.commissionMemory?.source, tableSource);
    const deduction = await calculateDeductions(16665.13, input);
    assert.equal(deduction.pss, 0);
    assert.equal(deduction.funpresp, 0);
    assert.equal(deduction.inss, 988.09);
    assert.equal(deduction.irrf, 3402.46);
});

test('each CJ level and each FC level resolve the configured payment amount', () => {
    for (const [funcao, amount] of Object.entries(config.commission!.versions[1].cjIntegral)) {
        assert.equal(resolveCommissionPay(params({ funcao })).funcaoValor, amount);
    }
    for (const [funcao, amount] of Object.entries(config.commission!.versions[1].fc)) {
        const pay = resolveCommissionPay(params({ funcao, commissionProfile: { kind: 'external', originLink: 'statutory',
            pensionRegime: 'rpps', payment: 'origin', withholdingMonthly: 0 } }));
        assert.equal(pay.funcaoValor, amount);
        assert.equal(pay.originRemuneration, 0);
    }
});

test('external CJ option and FC add origin remuneration only when paid on the Judiciary payroll', async () => {
    const external = { kind: 'external' as const, originLink: 'statutory' as const, pensionRegime: 'rpps' as const,
        cjOption: 'effective_plus_65' as const, payment: 'origin' as const, originRemuneration: 7000, withholdingMonthly: 125 };
    assert.equal(await calculateBase(params({ commissionProfile: external })), 10832.33);
    const paidHere = params({ commissionProfile: { ...external, payment: 'judiciary' } });
    assert.equal(await calculateBase(paidHere), 17832.33);
    const deduction = await calculateDeductions(17832.33, paidHere);
    assert.equal(deduction.pss, 125);
    assert.equal(deduction.inss, 0);
    assert.equal(deduction.irrf, 3828.18);
    assert.equal(await calculateBase(params({ funcao: 'fc3', commissionProfile: { ...external, payment: 'judiciary' } })), 8776.07);
    assert.equal(await calculateBase(params({ commissionProfile: { ...external, payment: 'judiciary', cjOption: 'full' } })), 16665.13);
});

test('invalid FC, unconfirmed source withholding, missing tables and overlapping validity remain pending', async () => {
    assert.throws(() => resolveCommissionPay(params({ funcao: 'fc3' })), /exige cargo efetivo/);
    await assert.rejects(() => calculateDeductions(16665.13, params({ commissionProfile: { kind: 'external',
        originLink: 'statutory', pensionRegime: 'rpps', payment: 'origin', cjOption: 'full' } })), /retenção previdenciária documentada/);
    assert.throws(() => resolveCommissionPay(params({ competencia: '2027-01' })), /sem regra/);
    assert.throws(() => resolveCommissionPay(params({ agencyConfig: { ...config, commission: { ...config.commission!, enabled: false } } })), /não habilitada/);
    const overlap = { ...config, commission: { enabled: true, versions: [config.commission!.versions[1], config.commission!.versions[1]] } };
    assert.throws(() => resolveCommissionPay(params({ agencyConfig: overlap })), /inequívocas/);
    assert.throws(() => calculateCommissionInss(params(), -1), /não negativo/);
});

test('the July boundary selects exact table values and the former career path retains its table', async () => {
    assert.equal(resolveCommissionPay(params({ competencia: '2026-06' })).funcaoValor, 15430.68);
    assert.equal(resolveCommissionPay(params({ competencia: '2026-07' })).funcaoValor, 16665.13);
    const legacy = params({ commissionProfile: undefined, aqTituloVR: 0, aqTreinoVR: 0,
        gratEspecificaTipo: '0', gratEspecificaValor: 0, vpni_lei: 0, vpni_decisao: 0, ats: 0 });
    assert.equal(await calculateBase(legacy), 6000 + 8400 + 10029.94);
});

test('INSS uses concurrent earnings and a separate annual contribution ceiling', () => {
    const input = params({ commissionProfile: { kind: 'exclusive_cj', otherRgpsBase: 8000, otherRgpsThirteenthBase: 0 } });
    const monthly = calculateCommissionInss(input, 16665.13);
    assert.equal(monthly.amount, 66.58);
    assert.equal(monthly.totalBase, 8475.55);
    assert.equal(calculateCommissionInss(input, 16665.13, '13').amount, 988.09);
    assert.equal(calculateCommissionInss(params({ commissionProfile: { kind: 'exclusive_cj', otherRgpsBase: 10000 } }), 16665.13).amount, 0);
});

test('RGPS applies its own manual incidence and attributes the vacation increment once', async () => {
    const smallConfig = { ...config, commission: { enabled: true, versions: [{ ...config.commission!.versions[1], cjIntegral: { cj3: 2000 } }] } };
    const input = params({ agencyConfig: smallConfig, rgpsVacationBase: 1000,
        rubricasExtras: [{ id: 'new', tipo: 'C', descricao: 'Crédito tributável e contributivo', valor: 100,
            incideIR: true, incideINSS: true, incidePSS: false },
        { id: 'old', tipo: 'C', descricao: 'Crédito antigo sem opção RGPS', valor: 100,
            incideIR: true, incidePSS: true }] });
    const deduction = await calculateDeductions(2200, input);
    assert.equal(deduction.rgpsMemory?.base, 3100);
    assert.equal(deduction.inss, 260.60);
    assert.equal(deduction.vacationInss, 95.91);
    assert.equal(deduction.irrf, 0);
    const withPrincipal = await calculateDeductions(2200, { ...input, commissionVacationPayInMonthly: 2000 });
    assert.equal(withPrincipal.inss, 260.60);
    assert.equal(withPrincipal.vacationInss, 253.10);
    assert.equal(withPrincipal.incomeTaxMemory?.gross, 200);
});

test('progressive payroll IR chooses the beneficial deduction and the 2026 reduction by gross income', async () => {
    assert.equal(calculateCommissionIncomeTax(params(), 1776.07, 0).amount, 0);
    assert.equal(calculateCommissionIncomeTax(params(), 5000, 0).amount, 0);
    const partial = calculateCommissionIncomeTax(params(), 6000, 0);
    assert.equal(partial.amount, 394.54);
    assert.equal(partial.reduction, 179.75);
    assert.equal(partial.deduction, 607.20);
    assert.equal(partial.simplified, true);
    assert.equal(calculateCommissionIncomeTax(params(), 6000, 700).amount, 369.02);
    assert.equal(calculateCommissionIncomeTax(params(), 6000, 0, '13').amount, 394.54);
    assert.equal(calculateCommissionIncomeTax(params(), 7350, 0).amount, 945.54);
    assert.equal(calculateCommissionIncomeTax(params(), 7607.20, 0).amount, 1016.27);
    const external = params({ funcao: 'fc3', commissionProfile: { kind: 'external', originLink: 'statutory',
        pensionRegime: 'rpps', payment: 'origin', withholdingMonthly: 0 } });
    assert.equal((await calculateDeductions(1776.07, external)).irrf, 0);
    assert.throws(() => calculateCommissionIncomeTax(params({ agencyConfig: { ...config, historico_ir_metadata: {} } }), 6000, 0), /vigência e fonte/);
});

test('the normal calculation path settles monthly, vacation and annual CJ withholding without duplicate income', async () => {
    const state = { ...INITIAL_STATE, mesRef: 'JULHO', anoRef: 2026, tabelaIR: 'teste', funcao: 'cj3',
        commissionProfile: { kind: 'exclusive_cj' as const, vacationTaxableRemuneration: 16665.13 },
        cargo: 'tecnico', padrao: 'C13', periodo: 2, aqTituloVR: 5, vpni_lei: 900, ferias1_3: 1,
        thirteenthPayroll: { version: 1 as const, firstSelected: true, secondSelected: true,
            firstMode: 'automatico' as const, secondMode: 'automatico' as const, advances: [], secondEntries: [] },
    };
    const calculation = await new AgencyCalculationEngine().calculateTotal(mapStateToAgencyParams(state, 'jmu', config));
    const result = calculation.breakdown;
    assert.equal(result.funcaoValor, 16665.13);
    assert.equal(result.vencimento + result.gaj + result.vpniLei + result.aqTitulo, 0);
    assert.equal(result.feriasConstitucional, 5555.04);
    assert.equal(result.inss, 988.09);
    assert.equal(result.inss13, 988.09);
    assert.equal(result.pss + result.pss13, 0);
    assert.equal(result.irrf, 0);
    assert.equal(result.commissionIncomeTax.find((tax: { tipo: string }) => tax.tipo === 'ferias').gross, 22220.17);
    assert.equal(result.gratificacaoNatalina, 16665.13);
    assert.equal(Math.round((result.gratificacaoNatalina - result.debitoPrimeiraParcela13) * 100), 833256);
    assert.equal(Math.round((calculation.netSalary + calculation.totalDeductions) * 100) / 100, 38885.3);
});

test('external public employment uses documented PJU annual and holiday entries without importing the other payroll', async () => {
    const engine = new AgencyCalculationEngine();
    const external = { kind: 'external' as const, originLink: 'public_employee' as const, pensionRegime: 'rgps' as const,
        payment: 'judiciary' as const, originRemuneration: 5000, vacationPaysOriginRemuneration: true,
        thirteenthPaysOriginRemuneration: true, vacationTaxableRemuneration: 0, withholdingMonthly: 100,
        withholdingVacation: 0, withholdingThirteenth: 20 };
    const input = params({ funcao: 'fc3', commissionProfile: external, ferias1_3: 1,
        feriasIncideVencimento: false, decimoIncideVencimento: false,
        thirteenthPayroll: { version: 1, firstSelected: true, secondSelected: true,
            firstMode: 'automatico', secondMode: 'automatico', advances: [], secondEntries: [] } });
    const result = (await engine.calculateTotal(input)).breakdown;
    assert.equal(result.originRemuneration, 5000);
    assert.equal(result.feriasConstitucional, 592.02);
    assert.equal(result.gratificacaoNatalina, 1776.07);
    assert.equal(result.inss, 100);
    assert.equal(result.inss13, 20);

    const saved = stripCalculatedFieldsFromCalculatorState({ ...INITIAL_STATE, funcao: 'fc3', commissionProfile: external, inssMensal: 100 });
    const restored = hydrateCalculatorState(saved);
    assert.deepEqual(restored.commissionProfile, external);
    assert.equal(restored.inssMensal, undefined);
    assert.equal(hydrateCalculatorState({ funcao: 'fc3' }).commissionProfile, undefined);
});

test('external CJ on the full payment option uses the documented origin base for transport', async () => {
    const engine = new AgencyCalculationEngine();
    const external = { kind: 'external' as const, originLink: 'statutory' as const, pensionRegime: 'rpps' as const,
        cjOption: 'full' as const, withholdingMonthly: 0, originBasicSalary: 5000 };
    const input = params({ commissionProfile: external, auxTransporteGasto: 500 });
    const result = (await engine.calculateTotal(input)).breakdown;
    assert.equal(result.auxTransporte, 500);
    assert.equal(result.auxTransporteDebito, 220);
    await assert.rejects(() => engine.calculateTotal({ ...input, commissionProfile: { ...external, originBasicSalary: undefined } }),
        /base documentada/);
});

test('historical CJF leave uses the documented amount and the applicable levels and days', async () => {
    const local = { ...config, orgSlug: 'cjf', commission: { ...config.commission!, compensatoryLeave: {
        validFrom: '2026-01-01', validTo: '2026-06-01', source: 'Resoluções 965 e 971',
        documentedGross: true, maxDays: 4, eligibleFunctions: ['cj2', 'cj3', 'cj4'],
    } } };
    const engine = new AgencyCalculationEngine();
    const input = params({ agencyConfig: local, competencia: '2026-05', licencaDias: 3,
        commissionProfile: { kind: 'exclusive_cj', compensatoryLeaveEligible: true, compensatoryLeaveDocumentedGross: 1234.56 } });
    assert.equal((await engine.calculateTotal(input)).breakdown.licencaCompensatoria, 1234.56);
    await assert.rejects(() => engine.calculateTotal({ ...input, licencaDias: 5 }), /até 4 dias/);
    await assert.rejects(() => engine.calculateTotal({ ...input, competencia: '2026-07' }), /vigência/);
});
