import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateIrrfProgressive, IrrfBracket } from '../src/core/calculations/taxUtils';
import { calculateDeductions } from '../src/services/agency/engine/modules/deductionsCalculations';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { INITIAL_STATE, CourtConfig, CalculatorState } from '../src/types';

// Brackets oficiais da tabela do IR (vigência 2024 / 2025)
const irBrackets2024_2025: IrrfBracket[] = [
    { min: 0, max: 2259.20, rate: 0, deduction: 0 },
    { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
    { min: 2826.66, max: 3751.05, rate: 0.150, deduction: 381.44 },
    { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
    { min: 4664.69, max: Infinity, rate: 0.275, deduction: 896.00 }
];

const mockConfig: CourtConfig = {
    orgSlug: 'jmu',
    powerName: 'PJU',
    careerCatalog: {
        noFunctionCode: '0',
        cargoLabels: { tecnico: 'Técnico Judiciário' }
    },
    payrollRules: {
        gajRate: 1.4,
        specificGratificationRate: 0.35,
        overtimeMonthHours: 175,
        irrfTopRate: 0.275,
        monthDayDivisor: 30,
        vrRateOnCj1: 0.05,
        transportWorkdays: 22,
        transportDiscountRate: 0.06
    },
    values: {
        deducao_dep: 189.59
    },
    bases: {
        salario: {
            tecnico: { C12: 5498.51, C13: 5663.47 }
        },
        funcoes: {
            fc4: 2313.27
        }
    },
    historico_ir: {
        '2024_fev': 896.00,
        '2025_jan': 896.00
    },
    historico_ir_brackets: {
        '2024_fev': irBrackets2024_2025,
        '2025_jan': irBrackets2024_2025
    },
    historico_pss: {
        '2025': {
            teto_rgps: 8157.41,
            faixas: [
                { min: 0, max: 1518.00, rate: 0.075 },
                { min: 1518.01, max: 2793.88, rate: 0.090 },
                { min: 2793.89, max: 4190.83, rate: 0.120 },
                { min: 4190.84, max: 8157.41, rate: 0.140 }
            ]
        }
    }
} as any;

const createParams = (patch: Partial<CalculatorState>) => {
    const state: CalculatorState = {
        ...INITIAL_STATE,
        cargo: 'tecnico',
        padrao: 'C12',
        funcao: '0',
        regimePrev: 'antigo',
        funprespParticipacao: 'nao',
        funprespAliq: 0,
        funprespFacul: 0,
        tabelaPSS: '2025',
        tabelaIR: '2025_jan',
        ...patch
    };
    return mapStateToAgencyParams(state, 'jmu', mockConfig);
};

test('taxUtils: calculateIrrfProgressive aplica faixas progressivas unitárias (NM = 1)', () => {
    // Faixa 1 (Isenção): até 2.259,20
    assert.equal(calculateIrrfProgressive(2000, irBrackets2024_2025, 1), 0);
    assert.equal(calculateIrrfProgressive(2259.20, irBrackets2024_2025, 1), 0);

    // Faixa 2 (7,5%): 2.500,00 -> (2500 * 0.075) - 169.44 = 187.50 - 169.44 = 18.06
    assert.equal(calculateIrrfProgressive(2500, irBrackets2024_2025, 1), 18.06);

    // Faixa 3 (15%): 3.500,00 -> (3500 * 0.15) - 381.44 = 525 - 381.44 = 143.56
    assert.equal(calculateIrrfProgressive(3500, irBrackets2024_2025, 1), 143.56);

    // Faixa 4 (22,5%): 4.000,00 -> (4000 * 0.225) - 662.77 = 900 - 662.77 = 237.23
    assert.equal(calculateIrrfProgressive(4000, irBrackets2024_2025, 1), 237.23);

    // Faixa 5 (27,5%): 8.912,04 (Holerite 1 líquido de dependentes) -> (8912.04 * 0.275) - 896.00 = 1554.81
    assert.equal(calculateIrrfProgressive(8912.04, irBrackets2024_2025, 1), 1554.81);
});

test('taxUtils: calculateIrrfProgressive suporta RRA com múltiplos meses (NM > 1)', () => {
    // Se NM = 3 meses, o limite da faixa de isenção passa para 3 * 2.259,20 = 6.777,60
    assert.equal(calculateIrrfProgressive(6000, irBrackets2024_2025, 3), 0);

    // Base de 9.000 em 3 meses: média de 3.000/mês (3ª faixa: 15% dedução 3 * 381,44 = 1.144,32)
    // Imposto: 9000 * 0.15 - 1144.32 = 1350 - 1144.32 = 205.68
    assert.equal(calculateIrrfProgressive(9000, irBrackets2024_2025, 3), 205.68);
});

test('Holerite Real 1 (Fev/2025): HE-EA R$ 9.291,22 com 2 dependentes gera IR-EA de R$ 1.554,81 exato', async () => {
    const params = createParams({
        padrao: 'C12',
        funcao: 'fc4',
        dependentes: 2,
        overtimeEntries: [
            {
                id: 'he-ea-1',
                qtd50: 0,
                qtd100: 0,
                heTotal: 9291.22,
                isEA: true,
                excluirIR: false
            }
        ]
    });

    const res = await calculateDeductions(0, params);

    // Verificações estritas
    assert.equal(res.irEA, 1554.81, 'IR-EA total da folha deve ser 1554.81');
    assert.equal(res.overtimeIrEA, 1554.81, 'IR-EA alocado ao card de HE deve ser 1554.81');
    assert.equal(res.overtimePss, 0, 'Horas extras não têm PSS');
});

test('Holerite Real 2 (Jan/2026): HE-EA R$ 942,87 com 2 dependentes gera IR-EA R$ 0,00 (isenção)', async () => {
    const params = createParams({
        padrao: 'C13',
        funcao: 'fc4',
        dependentes: 2,
        overtimeEntries: [
            {
                id: 'he-ea-2',
                qtd50: 0,
                qtd100: 0,
                heTotal: 942.87,
                isEA: true,
                excluirIR: false
            }
        ]
    });

    const res = await calculateDeductions(0, params);

    assert.equal(res.irEA, 0, 'IR-EA total da folha deve ser 0.00');
    assert.equal(res.overtimeIrEA, 0, 'IR-EA alocado ao card de HE deve ser 0.00');
    assert.equal(res.overtimePss, 0, 'Horas extras não têm PSS');
});

test('Faixa Intermediária 3 (15%): HE-EA de R$ 3.500,00 sem dependentes apura R$ 143,56', async () => {
    const params = createParams({
        padrao: 'C12',
        funcao: '0',
        dependentes: 0,
        overtimeEntries: [
            {
                id: 'he-ea-intermed',
                qtd50: 0,
                qtd100: 0,
                heTotal: 3500.00,
                isEA: true,
                excluirIR: false
            }
        ]
    });

    const res = await calculateDeductions(0, params);

    assert.equal(res.irEA, 143.56, 'IR-EA deve aplicar 15% - 381.44 = 143.56');
    assert.equal(res.overtimeIrEA, 143.56, 'Card de HE deve receber 143.56');
});

test('Múltiplos Cards EA: Horas Extras e Substituição com rateio proporcional reconciliado', async () => {
    const params = createParams({
        padrao: 'C12',
        funcao: '0',
        dependentes: 0,
        overtimeEntries: [
            {
                id: 'he-1',
                heTotal: 6000.00,
                isEA: true,
                excluirIR: false
            }
        ],
        substitutionEntries: [
            {
                id: 'subst-1',
                total: 4000.00,
                isEA: true,
                excluirIR: false
            }
        ]
    });

    const res = await calculateDeductions(0, params);

    // Base total = 10.000. Faixa 5: 10000 * 0.275 - 896.00 = 1854.00
    assert.equal(res.irEA, 1854.00, 'IR-EA consolidado deve ser 1854.00');
    // HE = 60%: 1854.00 * 0.6 = 1112.40
    assert.equal(res.overtimeIrEA, 1112.40, 'HE deve receber 1112.40');
    // Substituição = 40%: 1854.00 * 0.4 = 741.60
    assert.equal(res.substitutionIrEA, 741.60, 'Substituição deve receber 741.60');
    // A soma dos dois cards deve bater rigorosamente com o irEA total da folha
    assert.equal(Math.round((res.overtimeIrEA + res.substitutionIrEA) * 100) / 100, res.irEA);
});
