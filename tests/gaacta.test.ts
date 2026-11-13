import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateGaacta, resolveGaactaRule } from '../src/services/agency/engine/modules/gaactaCalculations';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { INITIAL_STATE, CourtConfig } from '../src/types';
import { PREDEFINED_OPTIONS, hasPresetValue } from '../src/components/Calculator/dynamicPayrollForm.helpers';

// Config mock para testes da JMU em 2026
const mockJmuConfig: any = {
    orgSlug: 'jmu',
    gaactaRules: {
        enabled: true,
        versions: [{ validFrom: '2026-06', percentage: 0.15, reference: 'Resolução STM nº 397/2026' }]
    },
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
        competencia: '2026-06',
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

test('GAACTA: Servidor sem cargo em comissao (sem CJ) nao e elegivel e recebe valor 0', async () => {
    const params: any = {
        orgSlug: 'jmu',
        agencyConfig: mockJmuConfig,
        competencia: '2026-06',
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
    assert.equal(result.valor, 0);
    assert.equal(result.baseCalculo, 0);
});

test('GAACTA: Caso Real STM - Servidora Ana Cristina Pimentel Carneiro (CJ-03)', async () => {
    const params: any = {
        orgSlug: 'jmu',
        agencyConfig: mockJmuConfig,
        competencia: '2026-06',
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
        competencia: '2026-06',
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        gaactaAtivo: true,
        gaactaIncideVencimento: true,
        gaactaIncideGAJ: true,
        gaactaIncideFuncao: true,
        grossSalary: 0,
        dependents: 0,
        discounts: 0
    };

    const resComTodas = await calculateGaacta(paramsComTodas);

    const paramsSemGAJ = {
        ...paramsComTodas,
        gaactaIncideGAJ: false
    };

    const resSemGAJ = await calculateGaacta(paramsSemGAJ);
    // Vencimento = 10035.51, GAJ (140%) = 14049.71
    assert.equal(Math.round((resComTodas.baseCalculo - resSemGAJ.baseCalculo) * 100) / 100, 14049.71);
    assert.equal(Math.round((resComTodas.valor - resSemGAJ.valor) * 100) / 100, 2107.45); // 15% de 14049.71 = 2107.45
});

test('GAACTA: Abono de Permanencia so incide se o servidor tiver o modulo de abono ativo', async () => {
    const engine = new AgencyCalculationEngine();

    // 1. Servidor SEM modulo de abono ativo
    const stateSemAbonoModulo: any = {
        ...INITIAL_STATE,
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        tabelaPSS: '2026',
        tabelaIR: '2025_maio',
        regimePrev: 'rpc',
        recebeAbono: false, // Modulo inativo ou apagado
        gaactaAtivo: true,
        gaactaIncideAbono: true // Mesmo marcado, nao deve incluir abono
    };

    const paramsSemAbonoModulo = mapStateToAgencyParams(stateSemAbonoModulo, 'jmu', mockJmuConfig);
    const resultSemAbonoModulo = await engine.calculateTotal(paramsSemAbonoModulo);

    const stateComAbonoModulo: any = {
        ...stateSemAbonoModulo,
        recebeAbono: true // Modulo ativo
    };

    const paramsComAbonoModulo = mapStateToAgencyParams(stateComAbonoModulo, 'jmu', mockJmuConfig);
    const resultComAbonoModulo = await engine.calculateTotal(paramsComAbonoModulo);

    // O PSS do servidor sobre o teto RGPS (8475.55) e R$ 988,09
    const expectedPss = resultSemAbonoModulo.breakdown.pss; // 988.09
    assert.ok(expectedPss > 0, 'PSS deve ser maior que zero');

    // Quando recebeAbono e false, o abono NAO e incluido na base da GAACTA
    const diffBase = Math.round((resultComAbonoModulo.breakdown.gaactaBase - resultSemAbonoModulo.breakdown.gaactaBase) * 100) / 100;
    assert.equal(diffBase, expectedPss);

    // E a GAACTA com abono ativo e calculada com 15% sobre a base acrescida
    const expectedGaactaComAbono = Math.round(resultComAbonoModulo.breakdown.gaactaBase * 0.15 * 100) / 100;
    assert.equal(resultComAbonoModulo.breakdown.gaacta, expectedGaactaComAbono);
    assert.ok(resultComAbonoModulo.breakdown.gaacta > resultSemAbonoModulo.breakdown.gaacta);
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

test('GAACTA: Rubricas manuais de crédito (como VPNI e ATS dinâmicos) entram na base e respeitam checkboxes', async () => {
    const paramsBase: any = {
        orgSlug: 'jmu',
        agencyConfig: mockJmuConfig,
        competencia: '2026-06',
        periodo: 1,
        cargo: 'analista',
        padrao: 'C13',
        funcao: 'cj3',
        gaactaAtivo: true,
        grossSalary: 0,
        dependents: 0,
        discounts: 0,
        rubricasExtras: [
            { id: 'rub-vpni', descricao: 'VPNI (Lei 9.527/97)', valor: 2500, tipo: 'C', incideIR: false, incidePSS: false, isEA: false, pssCompetenciaSeparada: false },
            { id: 'rub-ats', descricao: 'ATS (Tempo de Serviço)', valor: 1100, tipo: 'C', incideIR: false, incidePSS: false, isEA: false, pssCompetenciaSeparada: false },
            { id: 'rub-desc', descricao: 'Desconto Avulso', valor: 600, tipo: 'D', incideIR: false, incidePSS: false, isEA: false, pssCompetenciaSeparada: false }
        ]
    };

    // 1. Sem restrição explícita (padrão ativo): os 2 créditos entram na base, o débito é ignorado
    const resPadrao = await calculateGaacta(paramsBase);

    const paramsSemRubricas = { ...paramsBase, rubricasExtras: [] };
    const resSemRubricas = await calculateGaacta(paramsSemRubricas);

    // Diferença na base deve ser exatamente 2500 + 1100 = 3600 (débito de 600 ignorado)
    const diffBase = Math.round((resPadrao.baseCalculo - resSemRubricas.baseCalculo) * 100) / 100;
    assert.equal(diffBase, 3600);
    // 15% de 3600 = 540
    assert.equal(Math.round((resPadrao.valor - resSemRubricas.valor) * 100) / 100, 540);

    // 2. Desmarcando o checkbox da VPNI dinâmica via gaactaRubricasInclusas
    const paramsDesmarcandoVPNI = {
        ...paramsBase,
        gaactaRubricasInclusas: {
            'rub-vpni': false,
            'rub-ats': true
        }
    };
    const resDesmarcandoVPNI = await calculateGaacta(paramsDesmarcandoVPNI);

    // Base deve ter apenas o ATS (+1100) em relação ao sem rubricas
    const diffBaseApenasATS = Math.round((resDesmarcandoVPNI.baseCalculo - resSemRubricas.baseCalculo) * 100) / 100;
    assert.equal(diffBaseApenasATS, 1100);
    // 15% de 1100 = 165
    assert.equal(Math.round((resDesmarcandoVPNI.valor - resSemRubricas.valor) * 100) / 100, 165);
});

test('GAACTA: Rubrica pré-definida está presente nas opções pré-definidas com rótulo canônico e ordem alfabética', () => {
    const gaactaOption = PREDEFINED_OPTIONS.find(opt => opt.id === 'gaacta');
    assert.ok(gaactaOption, 'GAACTA deve constar em PREDEFINED_OPTIONS');
    assert.equal(gaactaOption.label, 'Gratificação por Atividades de Alta Complexidade (GAACTA)');

    // Verificar se PREDEFINED_OPTIONS mantém ordenação alfabética consistente
    const labels = PREDEFINED_OPTIONS.map(opt => opt.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    assert.deepEqual(labels, sorted, 'As rubricas pré-definidas devem estar ordenadas alfabeticamente');
});

test('GAACTA: hasPresetValue detecta corretamente a ativação da gratificação para preservação e restauração', () => {
    assert.equal(hasPresetValue('gaacta', INITIAL_STATE), false);
    assert.equal(hasPresetValue('gaacta', { ...INITIAL_STATE, gaactaAtivo: true }), true);
    assert.equal(hasPresetValue('gaacta', { ...INITIAL_STATE, gaactaAtivo: false }), false);
});

test('GAACTA: resolveGaactaRule resolve regra de 15% para JMU e CJF a partir de 2026-06', () => {
    const mockCjfCourtConfig: CourtConfig = {
        orgSlug: 'cjf',
        gaactaRules: {
            enabled: true,
            versions: [
                {
                    validFrom: '2026-06',
                    validTo: null,
                    percentage: 0.15,
                    reference: 'Resolução STM nº 397/2026 / JF (CJ-1 a CJ-4); efeitos a partir de 01/06/2026'
                }
            ]
        }
    };

    const jmuRule = resolveGaactaRule(mockJmuConfig, '2026-11');
    const cjfRule = resolveGaactaRule(mockCjfCourtConfig, '2026-11');

    assert.ok(jmuRule, 'JMU deve ter regra GAACTA vigente em 2026-11');
    assert.equal(jmuRule.percentage, 0.15);

    assert.ok(cjfRule, 'CJF deve ter regra GAACTA vigente em 2026-11');
    assert.equal(cjfRule.percentage, 0.15);
});
