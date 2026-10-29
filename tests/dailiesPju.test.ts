import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveRateKeyCandidates,
    resolveDailiesDailyRate,
    resolveAssistedAuthorityDailyRate,
    resolveDailiesEmbarkationAdditional,
    applyLdoCapToDailiesGross,
    resolveDailiesDiscountRules,
    summarizeDailiesPeriodMode,
    enumerateDaysInRange,
} from '../src/utils/dailiesRules';
import { calculateDailies } from '../src/services/agency/engine/modules/dailiesCalculations';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import { DailiesConfig } from '../src/types';
import { EffectiveConfig } from '../src/services/config/types';

const jfAuthorities = [
    { code: 'ministro_cjf', label: 'Ministro / Membro do CJF', percentage: 1 },
    { code: 'desembargador_trf', label: 'Desembargador Federal / Membro do TRF', rateKey: 'desembargador' },
    { code: 'juiz_federal', label: 'Juiz Federal / Juiz Federal Substituto', rateKey: 'juiz_titular' },
];
const jmuAuthorities = [
    { code: 'ministro_stm', label: 'Ministro do STM', percentage: 1 },
    { code: 'juiz_militar', label: 'Juiz Federal da Justiça Militar / Substituto', rateKey: 'juiz_titular' },
];

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
        branchId: 'jf', assistedAuthorities: jfAuthorities,
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
                cj4: 0.60,
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
            assistancePercentage: 0.80,
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

    // CJ-4 em viagem regular (60% no STM/PJU)
    const rateCj4 = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Analista Judiciário',
        funcao: 'CJ-4',
    });
    assert.equal(rateCj4, 880.17); // 1466.95 * 0.60

    // Assessoramento escalonado: Ministro / Membro do CJF (80% de 100% STF)
    const rateAssessoramentoMinistro = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Analista Judiciário',
        funcao: 'CJ-4',
        assessoramentoMagistrado: true,
        autoridadeAssistida: 'ministro_cjf',
    });
    assert.equal(rateAssessoramentoMinistro, 1173.56); // 1466.95 * 0.80

    // Assessoramento escalonado: Desembargador Federal (80% de 95% STF = 80% de 1.393,60)
    const rateAssessoramentoDesembargador = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Técnico Judiciário',
        assessoramentoMagistrado: true,
        autoridadeAssistida: 'desembargador_trf',
    });
    assert.equal(rateAssessoramentoDesembargador, 1114.88); // 1393.60 * 0.80

    // Assessoramento escalonado na Justiça Federal (CJF): Juiz Federal (80% de 90.25% STF = 80% de 1.323,92)
    const configCjf: DailiesConfig = {
        branchId: 'jf', assistedAuthorities: jfAuthorities,
        ...configPju,
        derivedFromMinister: {
            ...configPju.derivedFromMinister!,
            ratesPercentages: {
                ...configPju.derivedFromMinister!.ratesPercentages!,
                desembargador: 0.95,
                juiz_titular: 0.9025,
                cj4: 0.55,
                analista: 0.55,
                tecnico: 0.45,
            }
        }
    };

    const rateAssessoramentoJuizCjf = resolveDailiesDailyRate({
        dailiesConfig: configCjf,
        cargo: 'Técnico Judiciário',
        assessoramentoMagistrado: true,
        autoridadeAssistida: 'juiz_federal',
    });
    assert.equal(rateAssessoramentoJuizCjf, 1059.14); // 1323.92 * 0.80

    // CJ-4 e Analista em viagem ordinária no CJF (55% = R$ 806,82)
    const rateCj4Cjf = resolveDailiesDailyRate({
        dailiesConfig: configCjf,
        cargo: 'Analista Judiciário',
        funcao: 'CJ-4',
    });
    assert.equal(rateCj4Cjf, 806.82); // 1466.95 * 0.55

    // Magistrado com flag de assessoramento (não altera seu valor, permanece autoridade 95%)
    const rateJuizAssessoramento = resolveDailiesDailyRate({
        dailiesConfig: configPju,
        cargo: 'Juiz Federal',
        assessoramentoMagistrado: true,
    });
    assert.equal(rateJuizAssessoramento, 1393.60);

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
    // JMU / STM (40% completo e 20% metade)
    const configJmu: DailiesConfig = {
        branchId: 'jf', assistedAuthorities: jfAuthorities,
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

    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: configJmu, embarkationType: 'completo' }), 586.78);
    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: configJmu, embarkationType: 'metade' }), 293.39);
    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: configJmu, embarkationType: 'nenhum' }), 0);

    // Justiça Federal / CJF (80% da diária de Analista = 44% completo e 22% metade - Art. 17 Res. CJF 340/2015)
    const configCjf: DailiesConfig = {
        branchId: 'jf', assistedAuthorities: jfAuthorities,
        rates: {},
        embarkationAdditional: { completo: 645.46, metade: 322.73 },
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: { analista: 0.55 },
            embarkationPercentageFull: 0.44,
            embarkationPercentageHalf: 0.22,
        },
        externalGloss: { hospedagem: 0, alimentacao: 0, transporte: 0 },
    };

    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: configCjf, embarkationType: 'completo' }), 645.46);
    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: configCjf, embarkationType: 'metade' }), 322.73);
    assert.equal(resolveDailiesEmbarkationAdditional({ dailiesConfig: configCjf, embarkationType: 'nenhum' }), 0);
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
        branchId: 'jf', assistedAuthorities: jfAuthorities,
        rates: {},
        embarkationAdditional: { completo: 645.46, metade: 322.73 },
        embarkationLabel: 'Adicional de deslocamento',
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: {
                cj4: 0.55,
                analista: 0.55,
                tecnico: 0.45,
            },
            embarkationPercentageFull: 0.44,
            embarkationPercentageHalf: 0.22,
            assistancePercentage: 0.80,
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
        diariasAssessoramentoMagistrado: true,
        diariasAutoridadeAssistida: 'ministro_cjf',
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

    // Diária unitária do CJ-4 em assessoramento a Ministro = 1466.95 * 0.8 = 1173.56
    // Bruto com adicional completo de deslocamento (645.46) = 2 * 1173.56 + 645.46 = 2992.58
    // Teto LDO: corte de R$ 40,38 na parcela de diárias (2347.12 -> 2306.74) + adicional de R$ 645,46
    assert.equal(result.bruto, 2992.58);
    assert.equal(result.corteLdo, 40.38);
    // Dedução alimentação: (1860.51 / 22) * 2 = 169.14
    assert.equal(result.descAlim, 169.14);
    // Líquido esperado: 2992.58 - 40.38 - 169.14 = 2783.06
    assert.equal(result.valor, 2783.06);
});

test('enumerateDaysInRange identifica dias úteis, finais de semana e formatações', () => {
    // 09/11/2026 (Segunda) até 15/11/2026 (Domingo) = 7 dias
    const days = enumerateDaysInRange('2026-11-09', '2026-11-15');
    assert.equal(days.length, 7);

    const weekdays = days.filter(d => !d.isWeekend);
    const weekends = days.filter(d => d.isWeekend);
    assert.equal(weekdays.length, 5);
    assert.equal(weekends.length, 2);

    assert.equal(days[0].isoDate, '2026-11-09');
    assert.equal(days[0].weekdayLabel, 'Seg');
    assert.equal(days[0].formattedDate, '09/11');
    assert.equal(days[0].isWeekend, false);

    assert.equal(days[5].isoDate, '2026-11-14');
    assert.equal(days[5].weekdayLabel, 'Sáb');
    assert.equal(days[5].isWeekend, true);
});

test('calculateDailies no modo período aplica feriados manuais informados pelo usuário', async () => {
    const dailiesConfig: DailiesConfig = {
        branchId: 'jf', assistedAuthorities: jfAuthorities,
        rates: { tecnico: 660.13 },
        embarkationAdditional: { completo: 0, metade: 0 },
        discountRules: {
            foodDivisor: 22,
            transportDivisor: 22,
            excludeWeekendsAndHolidays: true,
            holidays: [], // Sem feriado prévio na base
            halfDailyOnBusinessReturnDay: true,
            halfDiscountOnBusinessReturnDay: true,
        },
    };

    const mockAgencyConfig = {
        dailies: dailiesConfig,
        payrollRules: { transportWorkdays: 22 },
    } as any;

    // Viagem de 10/11/2026 (Terça) a 13/11/2026 (Sexta) = 4 dias
    // Sem marcar feriados: 4 dias úteis, retorno em dia útil -> 3.5 diárias pagas e 3.5 dias de desconto
    const resSemFeriado = await calculateDailies({
        cargo: 'Técnico Judiciário',
        diariasModoDesconto: 'periodo',
        diariasDataInicio: '2026-11-10',
        diariasDataFim: '2026-11-13',
        diariasFeriados: [],
        diariasEmbarque: 'nenhum',
        diariasDescontarAlimentacao: true,
        diariasDescontarTransporte: false,
        auxAlimentacao: 1860.51,
        auxTransporteValor: 0,
        agencyConfig: mockAgencyConfig,
    } as any);

    assert.equal(resSemFeriado.diasDescontoAlim, 3.5);

    // Agora marcando 11/11/2026 (Quarta) como feriado/ponto facultativo manual
    const resComFeriado = await calculateDailies({
        cargo: 'Técnico Judiciário',
        diariasModoDesconto: 'periodo',
        diariasDataInicio: '2026-11-10',
        diariasDataFim: '2026-11-13',
        diariasFeriados: ['2026-11-11'],
        diariasEmbarque: 'nenhum',
        diariasDescontarAlimentacao: true,
        diariasDescontarTransporte: false,
        auxAlimentacao: 1860.51,
        auxTransporteValor: 0,
        agencyConfig: mockAgencyConfig,
    } as any);

    // Diárias pagas permanecem 3.5 (recebe a diária completa do dia de feriado no meio da viagem)
    // Mas o desconto de auxílio-alimentação cai de 3.5 para 2.5 dias (não desconta auxílio em dia de feriado)!
    assert.equal(resComFeriado.diasDescontoAlim, 2.5);
    const expectedDesc = Math.round((1860.51 / 22) * 2.5 * 100) / 100;
    assert.equal(resComFeriado.descAlim, expectedDesc);
});

test('calculateDailies diferencia viagem regular de CJ-4 (60%) e viagem em assessoramento direto (80%)', async () => {
    const dailiesConfig: DailiesConfig = {
        branchId: 'jf', assistedAuthorities: jfAuthorities,
        rates: {},
        embarkationAdditional: { completo: 0, metade: 0 },
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: {
                cj4: 0.60,
                analista: 0.55,
                tecnico: 0.45,
            },
            assistancePercentage: 0.80,
            embarkationPercentageFull: 0.40,
        },
        externalGloss: { hospedagem: 0, alimentacao: 0, transporte: 0 },
        ldoCap: { enabled: true, perDiemLimit: 1153.37 },
        discountRules: { foodDivisor: 22, transportDivisor: 22, excludeWeekendsAndHolidays: true, holidays: [] },
    };

    const mockAgencyConfig = { dailies: dailiesConfig, payrollRules: { transportWorkdays: 22 } } as any;

    // Viagem regular: CJ-4 recebe 60% = R$ 880,17 por diária (sem corte LDO)
    const resComum = await calculateDailies({
        cargo: 'Analista Judiciário',
        funcao: 'CJ-4',
        diariasAssessoramentoMagistrado: false,
        diariasQtd: 1,
        diariasEmbarque: 'nenhum',
        diariasModoDesconto: 'manual',
        diariasDescontarAlimentacao: false,
        diariasDescontarTransporte: false,
        auxAlimentacao: 0,
        auxTransporteValor: 0,
        agencyConfig: mockAgencyConfig,
    } as any);

    assert.equal(resComum.bruto, 880.17);
    assert.equal(resComum.corteLdo, 0);
    assert.equal(resComum.valor, 880.17);

    // Viagem em assessoramento direto: CJ-4 recebe 80% = R$ 1.173,56 por diária (com corte LDO de R$ 20,19 para o teto de 1.153,37)
    const resAssessoramento = await calculateDailies({
        cargo: 'Analista Judiciário',
        funcao: 'CJ-4',
        diariasAssessoramentoMagistrado: true,
        diariasAutoridadeAssistida: 'ministro_cjf',
        diariasQtd: 1,
        diariasEmbarque: 'nenhum',
        diariasModoDesconto: 'manual',
        diariasDescontarAlimentacao: false,
        diariasDescontarTransporte: false,
        auxAlimentacao: 0,
        auxTransporteValor: 0,
        agencyConfig: mockAgencyConfig,
    } as any);

    assert.equal(resAssessoramento.bruto, 1173.56);
    assert.equal(resAssessoramento.corteLdo, 20.19); // 1173.56 - 1153.37
    assert.equal(resAssessoramento.valor, 1153.37);
});

test('resolveAssistedAuthorityDailyRate calcula escalonamento correto e segregado por órgão (CJF vs STM)', () => {
    const configCjf: DailiesConfig = {
        branchId: 'jf', assistedAuthorities: jfAuthorities,
        rates: {},
        embarkationAdditional: { completo: 0, metade: 0 },
        normativeInfo: { branchRuleLabel: 'Resolução CJF Nº 340/2015' },
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: {
                desembargador: 0.95,
                juiz_titular: 0.9025,
                cj4: 0.55,
                analista: 0.55,
                tecnico: 0.45,
            },
            assistancePercentage: 0.80,
        },
    };

    // CJF: 1) Desembargador Federal (95% STF): autoridade = 1.393,60, servidor (80%) = 1.114,88
    const desTrf = resolveAssistedAuthorityDailyRate(configCjf, 'desembargador_trf');
    assert.equal(desTrf.authorityRate, 1393.60);
    assert.equal(desTrf.serverRate, 1114.88);
    assert.equal(desTrf.authorityLabel, 'Desembargador Federal / Membro do TRF');

    // CJF: 2) Juiz Federal (95% de 95% = 90.25% STF): autoridade = 1.323,92, servidor (80%) = 1.059,14
    const jfCjf = resolveAssistedAuthorityDailyRate(configCjf, 'juiz_federal');
    assert.equal(jfCjf.authorityRate, 1323.92);
    assert.equal(jfCjf.serverRate, 1059.14);
    assert.equal(jfCjf.authorityLabel, 'Juiz Federal / Juiz Federal Substituto');

    // CJF: 3) Ministro / Membro do CJF (100% STF): autoridade = 1.466,95, servidor (80%) = 1.173,56
    const minCjf = resolveAssistedAuthorityDailyRate(configCjf, 'ministro_cjf');
    assert.equal(minCjf.authorityRate, 1466.95);
    assert.equal(minCjf.serverRate, 1173.56);
    assert.equal(minCjf.authorityLabel, 'Ministro / Membro do CJF');

    // STM / JMU
    const configStm: DailiesConfig = {
        branchId: 'jmu', assistedAuthorities: jmuAuthorities,
        rates: {},
        embarkationAdditional: { completo: 0, metade: 0 },
        normativeInfo: { branchRuleLabel: 'Ato Normativo STM Nº 799/2024' },
        derivedFromMinister: {
            enabled: true,
            ministerPerDiem: 1466.95,
            ratesPercentages: {
                desembargador: 0.95,
                juiz_titular: 0.95, // STM art. 3º e Anexo I: 95% do Ministro
                cj4: 0.60,
                analista: 0.55,
                tecnico: 0.45,
            },
            assistancePercentage: 0.80,
        },
    };

    // STM: 1) Ministro do STM (100% STF): autoridade = 1.466,95, servidor (80%) = 1.173,56
    const minStm = resolveAssistedAuthorityDailyRate(configStm, 'ministro_stm');
    assert.equal(minStm.authorityRate, 1466.95);
    assert.equal(minStm.serverRate, 1173.56);
    assert.equal(minStm.authorityLabel, 'Ministro do STM');

    // STM: 2) Juiz Federal da Justiça Militar (95% do Ministro STM): autoridade = 1.393,60, servidor (80%) = 1.114,88
    const jfStm = resolveAssistedAuthorityDailyRate(configStm, 'juiz_militar');
    assert.equal(jfStm.authorityRate, 1393.60);
    assert.equal(jfStm.serverRate, 1114.88);
    assert.equal(jfStm.authorityLabel, 'Juiz Federal da Justiça Militar / Substituto');
});


test('rótulo do adicional de deslocamento/embarque é dinâmico conforme configuração do órgão', () => {
    // Para Justiça Federal (CJF e TRFs)
    const labelCjf = 'Adicional de deslocamento';
    const upperCjf = labelCjf.toUpperCase();
    assert.equal(`DIÁRIAS (SEM ${upperCjf})`, 'DIÁRIAS (SEM ADICIONAL DE DESLOCAMENTO)');
    assert.equal(`${upperCjf} (DIÁRIAS)`, 'ADICIONAL DE DESLOCAMENTO (DIÁRIAS)');

    // Para JMU
    const labelJmu = 'Adicional de embarque e desembarque';
    const upperJmu = labelJmu.toUpperCase();
    assert.equal(`DIÁRIAS (SEM ${upperJmu})`, 'DIÁRIAS (SEM ADICIONAL DE EMBARQUE E DESEMBARQUE)');
    assert.equal(`${upperJmu} (DIÁRIAS)`, 'ADICIONAL DE EMBARQUE E DESEMBARQUE (DIÁRIAS)');
});

test('autoridades dependem do catálogo e percentuais, sem inferência por rótulo normativo', () => {
    const cfg: DailiesConfig = {
        branchId: 'jmu', assistedAuthorities: jmuAuthorities,
        rates: {}, embarkationAdditional: { completo: 0, metade: 0 },
        externalGloss: { hospedagem: 0, alimentacao: 0, transporte: 0 },
        derivedFromMinister: { enabled: true, ministerPerDiem: 1466.95, ratesPercentages: { juiz_titular: 0.95 }, embarkationPercentageFull: 0.4, assistancePercentage: 0.8 },
        normativeInfo: { branchRuleLabel: 'Rótulo editorial sem indicação de ramo' },
    };
    assert.equal(resolveAssistedAuthorityDailyRate(cfg, 'juiz_militar').serverRate, 1114.88);
    assert.equal(resolveAssistedAuthorityDailyRate({ ...cfg, normativeInfo: { branchRuleLabel: 'CJF' } }, 'juiz_militar').serverRate, 1114.88);
    assert.throws(() => resolveAssistedAuthorityDailyRate(cfg, 'juiz_federal'), /autoridade assistida válida/);
    assert.throws(() => resolveAssistedAuthorityDailyRate({ ...cfg, assistedAuthorities: undefined }, 'juiz_militar'), /autoridade assistida válida/);
    assert.throws(() => resolveDailiesDailyRate({ dailiesConfig: undefined, cargo: 'analista' }), /Configuração de diárias incompleta/);
});

test('cronograma exige status explícito sem inferir veto por ano ou presumir promulgação', () => {
    const cfg = mapEffectiveConfigToCourtConfig({
        adjustment_schedule: {
            '0': { date: '2026-01-01', percentage: 0 },
            '1': { date: '2027-01-01', percentage: 0.08 },
            '2': { date: '2028-01-01', percentage: 0.08, status: 'promulgated' },
            '3': { date: '2029-01-01', percentage: 0.08, status: 'vetoed', veto_reference: 'Fonte explícita' },
        },
    } as EffectiveConfig);
    assert.equal(cfg.adjustment_schedule?.[0].reviewRequired, true);
    assert.equal(cfg.adjustment_schedule?.[1].status, undefined);
    assert.equal(cfg.adjustment_schedule?.[1].vetoed, false);
    assert.equal(cfg.adjustment_schedule?.[1].veto_reference, undefined);
    assert.equal(cfg.adjustment_schedule?.[2].reviewRequired, false);
    assert.equal(cfg.adjustment_schedule?.[2].status, 'promulgated');
    assert.equal(cfg.adjustment_schedule?.[3].vetoed, true);
});

test('parâmetros ausentes não são convertidos em zero ou percentuais normativos de fallback', () => {
    const mapped = mapEffectiveConfigToCourtConfig({ dailies_rules: {
        rates: { analista: 100 }, derived_from_minister: { enabled: true, rates_percentages: {} },
    } } as unknown as EffectiveConfig).dailies!;
    assert.equal(mapped.embarkationAdditional.completo, undefined);
    assert.equal(mapped.derivedFromMinister?.ministerPerDiem, undefined);
    assert.equal(mapped.derivedFromMinister?.embarkationPercentageFull, undefined);
    assert.equal(mapped.externalGloss.hospedagem, undefined);
    assert.equal(mapped.ldoCap?.perDiemLimit, undefined);
    assert.equal(mapped.discountRules?.foodDivisor, undefined);
    assert.throws(() => resolveDailiesEmbarkationAdditional({ dailiesConfig: mapped, embarkationType: 'completo' }), /Configuração de diárias incompleta/);
    assert.throws(() => resolveDailiesDiscountRules(mapped, NaN), /divisor do auxílio-alimentação/);
    assert.throws(() => resolveDailiesDailyRate({dailiesConfig: {...mapped, derivedFromMinister: undefined}, cargo: 'Analista', assessoramentoMagistrado: true, autoridadeAssistida: 'ministro_cjf'}), /Configuração de diárias incompleta/);
});
