import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateIrrfProgressive, IrrfBracket } from '../src/core/calculations/taxUtils';
import { calculateOvertime } from '../src/services/agency/engine/modules/overtimeCalculations';
import { calculateSubstitution } from '../src/services/agency/engine/modules/substitutionCalculations';
import { allocateIrEaCents, classifyIrEaSources, calculateIrEa } from '../src/services/agency/engine/modules/irEaCalculations';
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
            fc4: 2313.27, cj1: 10000
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
    historico_ir_metadata: { '2025_jan': { validFrom: '2025-01-01', validTo: '2025-05-01', reference: 'RFB janeiro a abril de 2025', rra: { deductDependents: false, deductComplementaryPension: false, reductionApplicable: false } } },
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
        mesRef: 'FEVEREIRO', anoRef: '2025', irEaContext: { mesPagamento: '2025-02' },
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


const he = (id: string, value: number, competenciasEA = ['2024-12']) => ({ id, qtd50: 0, qtd100: 0,
    valorBrutoManual: value, isEA: true, excluirIR: false, competenciasEA });

test('faixas inclusivas e arredondamento não caem em faixa final', () => {
    for (const [base, expected] of [[2259.20, 0], [2500, 18.06], [2826.65, 42.56], [2826.66, 42.56],
        [3751.05, 181.22], [3751.06, 181.22], [4000, 237.23], [8912.04, 1554.81]]) {
        assert.equal(calculateIrrfProgressive(base, irBrackets2024_2025), expected);
    }
    assert.equal(calculateIrrfProgressive(2826.655, irBrackets2024_2025), 42.56);
    assert.equal(calculateIrrfProgressive(9000, irBrackets2024_2025, 3), 205.68);
    assert.throws(() => calculateIrrfProgressive(1000, []), /IR-EA/);
    assert.throws(() => calculateIrrfProgressive(1000, [{ ...irBrackets2024_2025[0], min: 100 }]), /IR-EA/);
    assert.throws(() => calculateIrrfProgressive(1000, irBrackets2024_2025, 0), /IR-EA/);
});

test('holerite fevereiro2025: ajuste documentado reproduz base, sem dependentes automáticos', async () => {
    const params = createParams({ dependentes: 2, overtimeEntries: [he('real', 9291.22)] });
    assert.equal((await calculateDeductions(0, params)).irEA, 1659.09);
    params.irEaContext = { mesPagamento: '2025-02', ajustesBaseDocumentados: [{ valor: 379.18,
        descricao: 'Ajuste observado na base do holerite fevereiro2025', fundamento: 'Holerite 8249.pdf: base8912,04' }] };
    const result = await calculateDeductions(0, params);
    assert.equal(result.irEA, 1554.81);
    assert.equal(result.overtimeIrEA, 1554.81);
    assert.equal(result.overtimePss, 0);
    assert.equal(result.irEaMemory?.baseCalculo, 8912.04);
});

test('união das competências positivas define NM, override exige referência', async () => {
    const params = createParams({ overtimeEntries: [he('a', 4500, ['2024-10', '2024-11']), he('b', 4500, ['2024-11', '2024-12'])] });
    let result = await calculateDeductions(0, params);
    assert.equal(result.irEaMemory?.meses, 3); assert.equal(result.irEA, 205.68);
    params.irEaContext = { mesPagamento: '2025-02', mesesRraInformados: 1.5, referenciaMeses: 'Memória administrativa' };
    result = await calculateDeductions(0, params);
    assert.equal(result.irEaMemory?.meses, 1.5);
    params.irEaContext.referenciaMeses = '';
    await assert.rejects(() => calculateDeductions(0, params), /IR-EA/);
    assert.throws(() => classifyIrEaSources([{ key: 'c', value: 5000, competencias: ['2024-12'] },
        { key: 'd', value: -100, competencias: ['2024-11'], deductionReference: 'Documento' }], { mesPagamento: '2025-02' }), /sem rendimento/);
});

test('rateio reconciliado com centavos e desconto fora do denominador', async () => {
    const result = await calculateDeductions(0, createParams({ overtimeEntries: [he('a', 2000)], substitutionEntries: [
        { id: 'b', dias: {}, isEA: true, pssIsEA: false, valorBrutoManual: 2000, competenciasEA: ['2024-12'] }] }));
    assert.equal(result.irEA, 237.23);
    assert.equal(Math.round((result.overtimeIrEA + result.substitutionIrEA) * 100), 23723);
    const mixed = await calculateDeductions(0, createParams({ overtimeEntries: [he('a', 6000)], rubricasExtras: [
        { id: 'credit', descricao: 'Crédito', tipo: 'C', valor: 2000, isEA: true, incideIR: false, incidePSS: false, competenciasEA: ['2024-12'] },
        { id: 'debit', descricao: 'Desconto', tipo: 'D', valor: 1000, isEA: true, incideIR: false, incidePSS: false, competenciasEA: ['2024-12'], fundamentoDeducaoEA: 'Dedução documental' }
    ] }));
    assert.equal(mixed.irEA, 1029);
    assert.equal(mixed.overtimeIrEA + mixed.rubricasTax.credit.ir, 1029);
    assert.deepEqual(allocateIrEaCents(.01, [{ key: 'z', value: 1 }, { key: 'a', value: 1 }]), { z: .01, a: 0 });
});

test('próprio ano migra mensal, valor misturado e pagamento divergente bloqueiam', async () => {
    const result = await calculateDeductions(0, createParams({ overtimeEntries: [he('a', 3500, ['2025-01'])] }));
    assert.equal(result.irEA, 0); assert.equal(result.overtimeCalculatedEntries[0].isEA, false);
    assert.deepEqual(result.irEaCurrentYearKeys, ['he:a']);
    const normal = await calculateDeductions(0, createParams({ overtimeEntries: [{ ...he('a', 3500), isEA: false }] }));
    assert.equal(result.irrf, normal.irrf);
    await assert.rejects(() => calculateDeductions(0, createParams({ overtimeEntries: [he('a', 3500, ['2024-12', '2025-01'])] })), /separe/);
    await assert.rejects(() => calculateDeductions(0, createParams({ overtimeEntries: [he('a', 3500)], irEaContext: { mesPagamento: '2025-03' } })), /cabeçalho/);
});

test('EA incompleto bloqueia e semEA não exige contexto ou tabelaRRA', async () => {
    const params = createParams({ overtimeEntries: [he('a', 3500, [])] });
    await assert.rejects(() => calculateDeductions(0, params), /competências/);
    params.overtimeEntries = [he('a', 3500)]; params.irEaContext = {};
    await assert.rejects(() => calculateDeductions(0, params), /pagamento/);
    params.overtimeEntries = []; assert.equal((await calculateDeductions(0, params)).irEA, 0);
    const missing = createParams({ overtimeEntries: [he('a', 1000)] });
    missing.agencyConfig = { ...mockConfig, historico_ir_metadata: {} };
    await assert.rejects(() => calculateDeductions(0, missing), /vigência/);
});

test('2026: vigente + redução verificadaNM1, múltiplos meses permanecem pendentes', () => {
    const brackets2026 = [{ min: 0, max: 2428.8, rate: 0, deduction: 0 },
        { min: 2428.81, max: 2826.65, rate: .075, deduction: 182.16 },
        { min: 2826.66, max: 3751.05, rate: .15, deduction: 394.16 },
        { min: 3751.06, max: 4664.68, rate: .225, deduction: 675.49 },
        { min: 4664.69, max: Infinity, rate: .275, deduction: 908.73 }];
    const config = { ...mockConfig, historico_ir_brackets: { y2026: brackets2026 }, historico_ir_metadata: { y2026: {
        validFrom: '2026-01-01', reference: 'RFB tabela2026', rra: { deductDependents: false, deductComplementaryPension: false,
            reductionApplicable: true, reduction: { status: 'verified', mode: 'total', verifiedMonths: [1], exemptIncome: 5000,
                partialIncome: 7350, maxReduction: 312.89, intercept: 978.62, slope: .133145, reference: 'INRFB1500 art37 / AnexoX' } }
    } } } as CourtConfig;
    const context = { mesPagamento: '2026-01' };
    const classified = classifyIrEaSources([{ key: 'he:a', value: 942.87, competencias: ['2025-11'] }], context);
    const deductions = { rpps: 0, complementary: 0, dependents: 0 };
    assert.equal(calculateIrEa(classified, config, context, deductions).tax, 0);
    classified.prior[0].value = 3500;
    assert.equal(calculateIrEa(classified, config, context, deductions).tax, 0);
    assert.throws(() => calculateIrEa(classified, config, { ...context, mesesRraInformados: 2, referenciaMeses: 'Documento' }, deductions), /não foi verificada/);
    config.historico_ir_metadata!.y2026.rra.reduction!.status = 'pending';
    assert.throws(() => calculateIrEa(classified, config, context, deductions), /pendente/);
});

test('substituição preserva abatimentoGAE, totais derivados não viram entrada', async () => {
    const input = createParams({ gratEspecificaTipo: 'gae', substitutionEntries: [{ id: 's', dias: { cj1: 30 }, isEA: false, pssIsEA: false }] });
    assert.equal((await calculateSubstitution(input)).total, 8075.52);
    const stale = { ...createParams({}), heTotal: 1000, substTotal: 1000 };
    assert.equal((await calculateOvertime(stale)).heTotal, 0);
    assert.equal((await calculateSubstitution(stale)).total, 0);
    await assert.rejects(() => calculateOvertime(createParams({ overtimeEntries: [he('bad', -100)] })), /inválido/);
});

test('duas HE com frações de centavo têm bruto e baseRRA iguais à soma oficial dos cards', async () => {
    const params = createParams({ overtimeEntries: [
        { ...he('a', 0), qtd50: 1, valorBrutoManual: undefined },
        { ...he('b', 0), qtd50: 1, valorBrutoManual: undefined }
    ] });
    params.agencyConfig = { ...mockConfig, bases: { ...mockConfig.bases,
        salario: { tecnico: { C12: 5498.60 } } } } as CourtConfig;
    const overtime = await calculateOvertime(params);
    // Each raw value is 113.114057... . Rounding only after summing would give 226.23.
    assert.deepEqual(overtime.entries.map(entry => entry.heTotal), [113.11, 113.11]);
    assert.equal(overtime.heVal50, 226.22);
    assert.equal(overtime.heVal100, 0);
    assert.equal(overtime.heTotal, 226.22);
    const deductions = await calculateDeductions(0, params);
    assert.equal(deductions.irEaMemory?.baseBruta, overtime.heTotal);
    assert.equal(deductions.overtimeCalculatedEntries.reduce((sum, entry) => sum + entry.heTotal, 0), overtime.heTotal);
    params.overtimeEntries = [he('manual', 104.125)];
    const manual = await calculateOvertime(params);
    assert.equal(manual.heTotal, 104.13);
    assert.equal(manual.heVal50, 0);
    assert.equal(manual.heVal100, 0);
});
