import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSubstitution } from '../src/services/agency/engine/modules/substitutionCalculations';
import type { CourtConfig, SubstitutionEntry } from '../src/types';
import type { IAgencyCalculationParams } from '../src/services/agency/engine/types';

// Synthetic values exercise calculation behavior; these are not official tables.
const config: CourtConfig = {
    orgSlug: 'jmu',
    bases: {
        salario: { teste: { A1: 6000 } },
        funcoes: { fcMenor: 500, fc1: 1000, fcIgual: 1000, fc2: 2000, cj1: 4000, cj2: 5000, '0': 0 }
    },
    historico_pss: {}, historico_ir: {}, values: {},
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
    payrollRules: {
        gajRate: 0.5, specificGratificationRate: 0.35, vrRateOnCj1: 0.05,
        monthDayDivisor: 30, overtimeMonthHours: 175, transportWorkdays: 22,
        transportDiscountRate: 0.06, irrfTopRate: 0.275
    }
};
const entry = (patch: Partial<SubstitutionEntry> = {}): SubstitutionEntry => ({
    id: 's1', dias: {}, isEA: false, excluirIR: false, pssIsEA: false, ...patch
});
const params = (patch: Partial<IAgencyCalculationParams> = {}): IAgencyCalculationParams => ({
    periodo: 0, cargo: 'teste', padrao: 'A1', funcao: 'fc1', gratEspecificaTipo: 'nenhuma',
    agencyConfig: config, ...patch
} as IAgencyCalculationParams);
const cents = (value: number) => Math.round(value * 100);
const previousFormula = (input: IAgencyCalculationParams, source: SubstitutionEntry) => {
    const cfg = input.agencyConfig!;
    const funcoes = cfg.bases.funcoes;
    const gratification = input.gratEspecificaTipo === 'gae' || input.gratEspecificaTipo === 'gas'
        ? cfg.bases.salario[input.cargo][input.padrao] * cfg.payrollRules!.specificGratificationRate : 0;
    const base = (input.funcao === '0' ? 0 : funcoes[input.funcao] || 0) + gratification;
    let raw = 0;
    for (const [func, days] of Object.entries(source.dias)) {
        const safeDays = Math.max(0, Number(days || 0));
        if (safeDays > 0 && funcoes[func] && funcoes[func] > base) {
            raw += ((funcoes[func] - base) / cfg.payrollRules!.monthDayDivisor) * safeDays;
        }
    }
    return Math.round((source.valorBrutoManual ?? raw) * 100) / 100;
};

test('substituição: detalhes preservam zeros, ausentes e inelegíveis sem alterar fórmula anterior', async () => {
    const source = entry({ dias: { cj1: 10.5, cj2: 3.25, fc2: 0, fc1: 8, fcIgual: 4, fcMenor: 5, ausente: 9, '0': 2 } });
    const input = params({ substitutionEntries: [source] });
    const before = JSON.stringify(input);
    const result = await calculateSubstitution(input);
    const calculated = result.entries[0];
    assert.equal(calculated.total, previousFormula(input, source));
    assert.equal(calculated.totalPorDias, calculated.total);
    assert.equal(calculated.origemValor, 'dias');
    assert.deepEqual(calculated.funcoesSubstituicaoElegiveis, ['fc2', 'cj1', 'cj2']);
    assert.deepEqual(calculated.detalhamentoPorFuncao?.map(detail => detail.funcao), Object.keys(source.dias));
    assert.equal(calculated.detalhamentoPorFuncao?.reduce((sum, detail) => sum + cents(detail.subtotal), 0), cents(calculated.total));
    const cj1 = calculated.detalhamentoPorFuncao!.find(detail => detail.funcao === 'cj1')!;
    assert.deepEqual(cj1, { funcao: 'cj1', elegivel: true, dias: 10.5, valorDestino: 4000, baseAbatimento: 1000,
        diferencaMensal: 3000, divisor: 30, subtotal: 1050 });
    for (const func of ['fc1', 'fcIgual', 'fcMenor', 'ausente', '0']) {
        const detail = calculated.detalhamentoPorFuncao!.find(item => item.funcao === func)!;
        assert.equal(detail.elegivel, false);
        assert.equal(detail.subtotal, 0);
    }
    assert.equal(JSON.stringify(input), before, 'calcular não modifica os lançamentos');
});

test('substituição: GAE/GAS e ausência de função mantêm abatimento e elegibilidade do motor', async () => {
    for (const gratEspecificaTipo of ['gae', 'gas', 'nenhuma']) {
        const source = entry({ dias: { fc2: 30, cj1: 30, cj2: 2.25 } });
        const input = params({ gratEspecificaTipo, substitutionEntries: [source] });
        const calculated = (await calculateSubstitution(input)).entries[0];
        assert.equal(calculated.total, previousFormula(input, source));
        const fc2 = calculated.detalhamentoPorFuncao!.find(detail => detail.funcao === 'fc2')!;
        assert.equal(fc2.baseAbatimento, gratEspecificaTipo === 'nenhuma' ? 1000 : 3100);
        assert.equal(fc2.elegivel, gratEspecificaTipo === 'nenhuma');
    }
    const source = entry({ dias: { fc1: 30 } });
    const withoutFunction = (await calculateSubstitution(params({ funcao: '0', substitutionEntries: [source] }))).entries[0];
    assert.equal(withoutFunction.total, 1000);
    assert.equal(withoutFunction.detalhamentoPorFuncao![0].baseAbatimento, 0);
});

test('substituição: maiores restos conciliam centavos e desempate independe da ordem das funções', async () => {
    const centsConfig: CourtConfig = { ...config,
        bases: { ...config.bases, funcoes: { fcA: 1, fcB: 1, fcC: 1 } },
        payrollRules: { ...config.payrollRules!, monthDayDivisor: 3 } };
    for (const dias of [{ fcC: 1, fcB: 1, fcA: 1 }, { fcA: 1, fcB: 1, fcC: 1 }]) {
        const source = entry({ dias });
        const input = params({ funcao: '0', agencyConfig: centsConfig, substitutionEntries: [source] });
        const calculated = (await calculateSubstitution(input)).entries[0];
        assert.equal(calculated.total, previousFormula(input, source));
        assert.equal(calculated.total, 1);
        assert.equal(calculated.detalhamentoPorFuncao!.find(detail => detail.funcao === 'fcA')!.subtotal, 0.34);
        assert.equal(calculated.detalhamentoPorFuncao!.find(detail => detail.funcao === 'fcB')!.subtotal, 0.33);
        assert.equal(calculated.detalhamentoPorFuncao!.find(detail => detail.funcao === 'fcC')!.subtotal, 0.33);
        assert.equal(calculated.detalhamentoPorFuncao!.reduce((sum, detail) => sum + cents(detail.subtotal), 0), cents(calculated.total));
    }
});

test('substituição: valor manual, inclusive zero, prevalece sem rateio fictício entre funções mensal/EA', async () => {
    for (const isEA of [false, true]) {
        for (const valorBrutoManual of [0, 0.5, 1234.56]) {
            const source = entry({ isEA, pssIsEA: true, excluirIR: false, dias: { cj1: 3, cj2: 2 }, valorBrutoManual });
            const input = params({ substitutionEntries: [source] });
            const calculated = (await calculateSubstitution(input)).entries[0];
            assert.equal(calculated.total, valorBrutoManual);
            assert.equal(calculated.totalPorDias, 566.67);
            assert.equal(calculated.origemValor, 'manual');
            assert.equal(calculated.isEA, isEA);
            assert.equal(calculated.pssIsEA, true);
            assert.equal(calculated.excluirIR, false);
            assert.equal(calculated.detalhamentoPorFuncao!.reduce((sum, detail) => sum + cents(detail.subtotal), 0), 56667);
        }
    }
    for (const valorBrutoManual of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
        await assert.rejects(calculateSubstitution(params({ substitutionEntries: [entry({ valorBrutoManual })] })), /valor bruto manual de substituição inválido/);
    }
});

test('substituição: instâncias mantêm totais, incidências e divisor configurado independentes', async () => {
    const entries = [
        entry({ dias: { cj1: 1.25, cj2: 1.75 } }),
        entry({ id: 's2', dias: { cj2: 2.2 }, isEA: true, pssIsEA: true }),
        entry({ id: 's3', dias: { fc1: 30 }, excluirIR: true, valorBrutoManual: 0 }),
    ];
    const agencyConfig = { ...config, payrollRules: { ...config.payrollRules!, monthDayDivisor: 28 } };
    const input = params({ agencyConfig, substitutionEntries: entries });
    const result = await calculateSubstitution(input);
    assert.deepEqual(result.entries.map(item => item.total), entries.map(item => previousFormula(input, item)));
    assert.equal(cents(result.total), result.entries.reduce((sum, item) => sum + cents(item.total), 0));
    assert.deepEqual(result.entries.map(item => [item.id, item.isEA, item.excluirIR, item.pssIsEA]),
        [['s1', false, false, false], ['s2', true, false, true], ['s3', false, true, false]]);
    assert.equal(result.entries[0].detalhamentoPorFuncao![0].divisor, 28);
});

test('substituição: caminho legado e lançamentos vazios preservam total e metadados', async () => {
    const dias = { cj1: 2.5, cj2: 0, fc1: 30, antiga: 7 };
    const input = params({ substDias: dias, substIsEA: true, substExcluirIR: true, substPssIsEA: true, substitutionEntries: [] });
    const result = await calculateSubstitution(input);
    assert.equal(result.total, previousFormula(input, entry({ dias })));
    assert.equal(result.entries[0].id, 'legacy-subst');
    assert.deepEqual([result.entries[0].isEA, result.entries[0].excluirIR, result.entries[0].pssIsEA], [true, true, true]);
    assert.equal(result.entries[0].origemValor, 'dias');
    assert.equal(result.entries[0].detalhamentoPorFuncao!.length, 4);
    const empty = (await calculateSubstitution(params({ substitutionEntries: [entry()] }))).entries[0];
    assert.equal(empty.total, 0);
    assert.equal(empty.totalPorDias, 0);
    assert.deepEqual(empty.detalhamentoPorFuncao, []);
    assert.deepEqual(empty.funcoesSubstituicaoElegiveis, ['fc2', 'cj1', 'cj2']);
});

test('substituição por datas: período inclusivo por função e card, com o divisor da folha', async () => {
    const entries = [
        entry({ dias: { cj1: 5, fc2: 3 }, periodosPorFuncao: {
            cj1: { modo: 'datas', dataInicio: '2024-02-01', dataFim: '2024-02-29' },
            fc2: { modo: 'dias', dataInicio: '2024-02-20', dataFim: '2024-02-21' },
        } }),
        entry({ id: 's2', dias: { cj1: 10 }, periodosPorFuncao: {
            cj1: { modo: 'datas', dataInicio: '2024-02-24', dataFim: '2024-02-24' },
        } }),
    ];
    const result = await calculateSubstitution(params({ competencia: '2024-02', substitutionEntries: entries }));
    const details = result.entries[0].detalhamentoPorFuncao!;
    assert.deepEqual(details.map(detail => detail.dias), [29, 3]);
    assert.deepEqual(details[0].periodo, { dataInicio: '2024-02-01', dataFim: '2024-02-29' });
    assert.equal(details[1].periodo, undefined);
    assert.equal(result.entries[1].detalhamentoPorFuncao![0].dias, 1);
    assert.deepEqual(result.entries.map(item => item.total), [3000, 100]);
    assert.equal(result.total, 3100);
    assert.equal(entries[0].dias.cj1, 5);

    const fullMonth = entry({ dias: { cj1: 0 }, periodosPorFuncao: {
        cj1: { modo: 'datas', dataInicio: '2026-01-01', dataFim: '2026-01-31' },
    } });
    const input = params({ competencia: '2026-01', substitutionEntries: [fullMonth] });
    assert.equal((await calculateSubstitution(input)).total, 3100);
    await assert.rejects(calculateSubstitution({ ...input, competencia: '2026-02' }), /mês da competência/);
});

test('substituição por datas: período inválido rejeita o cálculo sem recorrer aos dias manuais', async () => {
    for (const [dataInicio, dataFim, message] of [
        ['2026-02-01', '', /início e fim/],
        ['2026-02-03', '2026-02-02', /posterior/],
        ['2026-02-01', '2026-02-29', /datas válidas/],
        ['2026-02-27', '2026-03-01', /competência/],
    ] as const) {
        const source = entry({ dias: { cj1: 15 }, periodosPorFuncao: { cj1: { modo: 'datas', dataInicio, dataFim } } });
        const input = params({ competencia: '2026-02', substitutionEntries: [source] });
        await assert.rejects(calculateSubstitution(input), message);
        const documented = await calculateSubstitution({ ...input, substitutionEntries: [{ ...source, valorBrutoManual: 0 }] });
        assert.equal(documented.entries[0].origemValor, 'manual');
        assert.equal(documented.total, 0);
        assert.deepEqual(documented.entries[0].detalhamentoPorFuncao, []);
    }
});
