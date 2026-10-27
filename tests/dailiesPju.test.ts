import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveRateKeyCandidates,
    resolveDailiesDailyRate,
    resolveDailiesEmbarkationAdditional,
    applyLdoCapToDailiesGross,
    resolveDailiesDiscountRules,
    summarizeDailiesPeriodMode,
} from '../src/utils/dailiesRules';
import { calculateDailies } from '../src/services/agency/engine/modules/dailiesCalculations';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import { DailiesConfig, EffectiveConfig } from '../src/types';

test('resolveRateKeyCandidates resolve candidatos adequados para cargos efetivos, funções e magistratura', () => {
    // Analista puro
    const analista = resolveRateKeyCandidates('Analista Judiciário');
    assert.deepEqual(analista, ['analista', 'analista_judiciario']);

    // Técnico puro
    const tecnico = resolveRateKeyCandidates('Técnico Judiciário');
    assert.deepEqual(tecnico, ['tecnico', 'tecnico_judiciario']);

    // Magistrados
    const desembargador = resolveRateKeyCandidates('Desembargador Federal');
    assert.ok(desembargador.includes('desembargador') && desembargador.includes('juiz'));

    const juizTitular = resolveRateKeyCandidates('Juiz Federal');
    assert.ok(juizTitular.includes('juiz_titular') && juizTitular.includes('juiz'));

    const juizSubstituto = resolveRateKeyCandidates('Juiz Federal Substituto');
    assert.ok(juizSubstituto.includes('juiz_substituto') && juizSubstituto.includes('juiz'));

    // Analista com CJ-4
    const analistaCj4 = resolveRateKeyCandidates('Analista Judiciário', 'CJ-4');
    assert.equal(analistaCj4[0], 'cj4');
    assert.ok(analistaCj4.includes('cj'));
    assert.ok(analistaCj4.includes('analista'));

    // Técnico com CJ-1
    const tecnicoCj1 = resolveRateKeyCandidates('Técnico Judiciário', 'CJ-1');
    assert.equal(tecnicoCj1[0], 'cj1');
    assert.ok(tecnicoCj1.includes('cj'));
    assert.ok(tecnicoCj1.includes('tecnico'));
});

test('resolveDailiesDailyRate calcula diárias derivadas do Ministro do STF para CJF e STM', () => {
    const configPju: DailiesConfig = {
        rates: {},
        embarkationAdditional: { completo: 0, metade: 0 },
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: {
                desembargador: 0.95,
                juiz: 0.95,
                juiz_titular: 0.95,
                juiz_substituto: 0.90,
                cj4: 0.80,
                cj3: 0.60,
                cj2: 0.60,
                cj1: 0.60,
                cj: 0.60,
                analista: 0.55,
                tecnico: 0.45,
                auxiliar: 0.35,
            },
            embarkationPercentageFull: 0.40,
            embarkationPercentageHalf: 0.20,
        },
        externalGloss: { hospedagem: 0.50, alimentacao: 0.25, transporte: 0.25 },
    };

    // Magistrados
    const rateJuiz = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Juiz Federal',
    });
    assert.equal(rateJuiz, 1393.60); // 1466.95 * 0.95

    const rateSubstituto = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Juiz Federal Substituto',
    });
    assert.equal(rateSubstituto, 1320.26); // 1466.95 * 0.90

    // CJ-4 (80% no CJF)
    const rateCj4 = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Analista Judiciário',
        funcao: 'CJ-4',
    });
    assert.equal(rateCj4, 1173.56); // 1466.95 * 0.80

    // CJ-1 (60%)
    const rateCj1 = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Técnico Judiciário',
        funcao: 'CJ-1',
    });
    assert.equal(rateCj1, 880.17); // 1466.95 * 0.60

    // Analista efetivo (55%)
    const rateAnalista = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Analista Judiciário',
    });
    assert.equal(rateAnalista, 806.82); // 1466.95 * 0.55

    // Técnico efetivo (45%)
    const rateTecnico = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Técnico Judiciário',
    });
    assert.equal(rateTecnico, 660.13); // 1466.95 * 0.45
});

test('resolveDailiesEmbarkationAdditional calcula adicional de deslocamento / embarque proporcional', () => {
    const config: DailiesConfig = {
        rates: {},
        embarkationAdditional: { completo: 0, metade: 0 },
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: { analista: 0.55 },
            embarkationPercentageFull: 0.40,
            embarkationPercentageHalf: 0.20,
        },
        externalGloss: { hospedagem: 0, alimentacao: 0, transporte: 0 },
    };

    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: config, embarkationType: 'completo' }), 586.78);
    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: config, embarkationType: 'metade' }), 293.39);
    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: config, embarkationType: 'nenhum' }), 0);
});

test('applyLdoCapToDailiesGross aplica teto da LDO sem quebrar valores inferiores', () => {
    // Caso com corte: Diária alta de R$ 1.393,60 com teto LDO de R$ 1.153,37
    const resultCut = applyLdoCapToDailiesGross({
        dailiesQty: 2,
        dailiesRate: 1393.60,
        embarkationAdditional: 0,
        enabled: true,
        perDiemLimit: 1153.37,
    });
    assert.equal(resultCut.gross, 2787.20);
    assert.equal(resultCut.maxAllowed, 2306.74);
    assert.equal(resultCut.cut, 480.46);

    // Caso sem corte: Técnico com diária de R$ 660,13
    const resultNoCut = applyLdoCapToDailiesGross({
        dailiesQty: 1,
        dailiesRate: 660.13,
        embarkationAdditional: 0,
        enabled: true,
        perDiemLimit: 1153.37,
    });
    assert.equal(resultNoCut.gross, 660.13);
    assert.equal(resultNoCut.cut, 0);
});

test('mapEffectiveConfig mapeia corretamente metadados normativos e rótulo dinâmico de deslocamento', () => {
    const mockEffective: Partial<EffectiveConfig> = {
        org_slug: 'cjf',
        org_name: 'Conselho da Justiça Federal',
        power_name: 'PJU',
        dailies_rules: {
            embarkation_label: 'Adicional de deslocamento',
            normative_info: {
                general_rule_label: 'Resolução CNJ Nº 73/2009',
                branch_rule_label: 'Resolução CJF Nº 340/2015',
                notes: ['Nota 1', 'Nota 2'],
            },
            rates: { tecnico: 660.13 },
            embarkation_additional: { completo: 586.78, metade: 293.39 },
            external_gloss: { hospedagem: 0.5, alimentacao: 0.25, transporte: 0.25 },
        },
    };

    const courtConfig = mapEffectiveConfigToCourtConfig(mockEffective as EffectiveConfig);
    assert.ok(courtConfig.dailies);
    assert.equal(courtConfig.dailies.embarkationLabel, 'Adicional de deslocamento');
    assert.equal(courtConfig.dailies.normativeInfo?.generalRuleLabel, 'Resolução CNJ Nº 73/2009');
    assert.equal(courtConfig.dailies.normativeInfo?.branchRuleLabel, 'Resolução CJF Nº 340/2015');
    assert.deepEqual(courtConfig.dailies.normativeInfo?.notes, ['Nota 1', 'Nota 2']);
});

test('summarizeDailiesPeriodMode aplica meia diária e meio desconto de benefício no dia de retorno útil', () => {
    const rules = resolveDailiesDiscountRules({
        rates: {},
        embarkationAdditional: { completo: 0, metade: 0 },
        discountRules: {
            foodDivisor: 22,
            transportDivisor: 22,
            excludeWeekendsAndHolidays: true,
            holidays: ['2026-09-07'],
            halfDailyOnBusinessReturnDay: true,
            halfDiscountOnBusinessReturnDay: true,
        },
        externalGloss: { hospedagem: 0, alimentacao: 0, transporte: 0 },
    }, 22);

    // 08/09/2026 (terça) a 10/09/2026 (quinta) = 3 dias úteis
    const summary = summarizeDailiesPeriodMode('2026-09-08', '2026-09-10', rules);
    assert.ok(summary);
    assert.equal(summary.totalDays, 3);
    assert.equal(summary.returnDateIsBusinessDay, true);
    assert.equal(summary.halfDailyApplied, true);
    assert.equal(summary.payableDays, 2.5);
    assert.equal(summary.discountDays, 2.5);
});

test('calculateDailies calcula com precisão para servidor da Justiça Federal (CJF com CJ-4 e corte de teto LDO)', async () => {
    const dailiesConfig: DailiesConfig = {
        rates: {},
        embarkationAdditional: { completo: 586.78, metade: 293.39 },
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: {
                cj4: 0.80,
                analista: 0.55,
                tecnico: 0.45,
            },
            embarkationPercentageFull: 0.40,
            embarkationPercentageHalf: 0.20,
        },
        externalGloss: { hospedagem: 0.50, alimentacao: 0.25, transporte: 0.25 },
        ldoCap: {
            enabled: true,
            perDiemLimit: 1153.37,
        },
        discountRules: {
            foodDivisor: 22,
            transportDivisor: 22,
            excludeWeekendsAndHolidays: true,
            holidays: [],
        },
    };

    const mockAgencyConfig = {
        dailies: dailiesConfig,
        payrollRules: {
            transportWorkdays: 22,
        },
    } as any;

    const result = await calculateDailies({
        cargo: 'Analista Judiciário',
        funcao: 'CJ-4',
        diariasQtd: 2,
        diariasEmbarque: 'completo',
        diariasModoDesconto: 'manual',
        diariasDiasDescontoAlimentacao: 2,
        diariasDiasDescontoTransporte: 0,
        diariasDescontarAlimentacao: true,
        diariasDescontarTransporte: false,
        auxAlimentacao: 1860.51,
        auxTransporteValor: 0,
        agencyConfig: mockAgencyConfig,
    } as any);

    // Diária unitária do CJ-4 = 1466.95 * 0.8 = 1173.56
    // Bruto com adicional completo (586.78) = 2 * 1173.56 + 586.78 = 2933.90
    // Teto LDO: corte de R$ 40,38 na parcela de diárias (2347.12 -> 2306.74) + adicional de R$ 586,78
    assert.equal(result.bruto, 2933.90);
    assert.equal(result.corteLdo, 40.38);
    // Dedução alimentação: (1860.51 / 22) * 2 = 169.14
    assert.equal(result.descAlim, 169.14);
    // Líquido esperado: 2933.90 - 40.38 - 169.14 = 2724.38
    assert.equal(result.valor, 2724.38);
});
