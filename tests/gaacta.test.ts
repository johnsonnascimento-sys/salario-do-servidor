import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateGaacta } from '../src/services/agency/engine/modules/gaactaCalculations';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { INITIAL_STATE } from '../src/types';

// Config mock para testes da JMU em 2026
const mockJmuConfig: any = {
    orgSlug: 'jmu',
    careerCatalog: {
        noFunctionCode: '0',
        noFunctionLabel: 'Sem função',
        cargoLabels: { analista: 'Analista Judiciário', tecnico: 'Técnico Judiciário' }
    },
    payrollRules: {
        gajRate: 1.4,
        monthDayDivisor: 30,
        vrRateOnCj1: 0.05,
        overtimeMonthHours: 175,
        specificGratificationRate: 0.35,
    },
    benefits: {
        auxilio_alimentacao: 0,
        auxilio_transporte: 0,
        assistencia_pre_escolar: 0
    },
    values: {
        cj1_integral_base: 10990.74,
        reajustes: [
            { period: 0, percentage: 0 },
            { period: 1, percentage: 8.0 }
        ]
    },
    bases: {
        salario: {
            analista: {
                C13: 9292.14 // reajustado em 8% = 10035.51
            }
        },
        funcoes: {
            cj3: 10029.94 // reajustado em 8% = 10832.33
        }
    },
    historico_pss: {
        '2026': {
            teto_rgps: 8475.55,
            faixas: [
                { min: 0, max: 1621.00, rate: 0.075 },
                { min: 1621.01, max: 2902.84, rate: 0.090 },
                { min: 2902.85, max: 4354.27, rate: 0.120 },
                { min: 4354.28, max: 8475.55, rate: 0.140 },
                { min: 8475.56, max: 14514.30, rate: 0.145 },
                { min: 14514.31, max: 29028.58, rate: 0.165 },
                { min: 29028.59, max: 56605.73, rate: 0.190 },
                { min: 56605.74, max: 999999999, rate: 0.220 }
            ]
        }
    },
    historico_ir: {
        '2025_maio': {
            deduction: 908.73,
            brackets: [
                { min: 0, max: 2259.20, rate: 0, deduction: 0 },
                { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
                { min: 2826.66, max: 3751.05, rate: 0.150, deduction: 381.44 },
                { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
                { min: 4664.69, max: null, rate: 0.275, deduction: 908.73 }
            ]
        }
    }
};

test('GAACTA: Servidor comissionado CJ-3 tem elegibilidade confirmada', async () => {
    const params: any = {
        orgSlug: 'jmu',
        agencyConfig: mockJmuConfig,
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        gaactaAtivo: true,
        grossSalary: 0,
        dependents: 0,
        discounts: 0
    };

    const result = await calculateGaacta(params);
    assert.equal(result.isElegivel, true);
    assert.equal(result.percentual, 0.15);
    assert.ok(result.baseCalculo > 0);
    assert.equal(result.valor, Math.round(result.baseCalculo * 0.15 * 100) / 100);
});

test('GAACTA: Servidor sem cargo em comissao (sem CJ) nao e elegivel', async () => {
    const params: any = {
        orgSlug: 'jmu',
        agencyConfig: mockJmuConfig,
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'fc5',
        gaactaAtivo: true,
        grossSalary: 0,
        dependents: 0,
        discounts: 0
    };

    const result = await calculateGaacta(params);
    assert.equal(result.isElegivel, false);
});

test('GAACTA: Caso Real STM - Servidora Ana Cristina Pimentel Carneiro (CJ-03)', async () => {
    const params: any = {
        orgSlug: 'jmu',
        agencyConfig: mockJmuConfig,
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        aqTituloVR: 1.317,
        aqTreinoVR: 0.763,
        ats: 1103.91,
        vpni_lei: 5939.00,
        vpni_decisao: 0,
        gaactaAtivo: true,
        gaactaOutrasParcelas: 321.39,
        gaactaManualBase: true,
        gaactaBaseManualValor: 43516.33,
        grossSalary: 0,
        dependents: 0,
        discounts: 0
    };

    const result = await calculateGaacta(params);
    assert.equal(result.baseCalculo, 43516.33);
    assert.equal(result.valor, 6527.45);
});

test('GAACTA: Composicao flexivel por checkboxes permite desmarcar parcelas', async () => {
    const paramsComTodas: any = {
        orgSlug: 'jmu',
        agencyConfig: mockJmuConfig,
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        ats: 1000,
        vpni_lei: 2000,
        gaactaAtivo: true,
        gaactaIncideVencimento: true,
        gaactaIncideGAJ: true,
        gaactaIncideFuncao: true,
        gaactaIncideATS: true,
        gaactaIncideVPNI: true,
        grossSalary: 0,
        dependents: 0,
        discounts: 0
    };

    const resComTodas = await calculateGaacta(paramsComTodas);

    const paramsSemVpni = {
        ...paramsComTodas,
        gaactaIncideVPNI: false
    };

    const resSemVpni = await calculateGaacta(paramsSemVpni);
    assert.equal(Math.round((resComTodas.baseCalculo - resSemVpni.baseCalculo) * 100) / 100, 2000);
    assert.equal(Math.round((resComTodas.valor - resSemVpni.valor) * 100) / 100, 300); // 15% de 2000 = 300
});

test('GAACTA: Checkbox de Abono de Permanencia altera dinamicamente a base e a gratificacao', async () => {
    const engine = new AgencyCalculationEngine();

    const stateSemAbono: any = {
        ...INITIAL_STATE,
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false,
        gaactaAtivo: true,
        gaactaIncideAbono: false
    };

    const paramsSemAbono = mapStateToAgencyParams(stateSemAbono, 'jmu', mockJmuConfig);
    const resultSemAbono = await engine.calculateTotal(paramsSemAbono);

    const stateComAbono: any = {
        ...stateSemAbono,
        gaactaIncideAbono: true
    };

    const paramsComAbono = mapStateToAgencyParams(stateComAbono, 'jmu', mockJmuConfig);
    const resultComAbono = await engine.calculateTotal(paramsComAbono);

    // No RPC em 2026, a contribuicao do PSS sobre o teto do RGPS (8475.55) e R$ 988,09
    const expectedPss = resultSemAbono.breakdown.pss; // 988.09
    assert.ok(expectedPss > 0, 'PSS deve ser maior que zero');

    // A base da GAACTA deve aumentar exatamente no valor do PSS (abono)
    const diffBase = Math.round((resultComAbono.breakdown.gaactaBase - resultSemAbono.breakdown.gaactaBase) * 100) / 100;
    assert.equal(diffBase, expectedPss);

    // O valor da GAACTA com abono deve corresponder a 15% da nova base
    const expectedGaactaComAbono = Math.round(resultComAbono.breakdown.gaactaBase * 0.15 * 100) / 100;
    assert.equal(resultComAbono.breakdown.gaacta, expectedGaactaComAbono);
    assert.ok(resultComAbono.breakdown.gaacta > resultSemAbono.breakdown.gaacta);
});

test('GAACTA: Integracao com AgencyCalculationEngine comprova natureza indenizatoria (sem descontos)', async () => {
    const engine = new AgencyCalculationEngine();

    const state: any = {
        ...INITIAL_STATE,
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        gaactaAtivo: true,
        gaactaManualBase: true,
        gaactaBaseManualValor: 43516.33
    };

    const params = mapStateToAgencyParams(state, 'jmu', mockJmuConfig);
    const result = await engine.calculateTotal(params);

    assert.equal(result.breakdown.gaacta, 6527.45);
    assert.equal(result.breakdown.gaactaBase, 43516.33);

    // Comparar com o mesmo calculo sem GAACTA para provar que descontos de PSS e IRRF nao sao afetados
    const stateSemGaacta = {
        ...state,
        gaactaAtivo: false,
        gaactaManualBase: false,
        gaactaBaseManualValor: 0
    };
    const paramsSemGaacta = mapStateToAgencyParams(stateSemGaacta, 'jmu', mockJmuConfig);
    const resultSemGaacta = await engine.calculateTotal(paramsSemGaacta);

    // Deducoes identicas (GAACTA e 100% isenta)
    assert.equal(result.totalDeductions, resultSemGaacta.totalDeductions);
    assert.equal(result.breakdown.pss, resultSemGaacta.breakdown.pss);
    assert.equal(result.breakdown.irrf, resultSemGaacta.breakdown.irrf);

    // O salario liquido aumenta EXATAMENTE no valor da GAACTA
    assert.equal(
        Math.round((result.netSalary - resultSemGaacta.netSalary) * 100) / 100,
        6527.45
    );
});
