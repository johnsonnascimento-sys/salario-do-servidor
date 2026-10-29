import assert from 'node:assert/strict';
import test from 'node:test';
import { groupPayslipRowsForDisplay } from '../src/utils/payslipRows';
import { calculateCompensatoryLeave } from '../src/services/agency/engine/modules/leaveCalculations';
import { validateConfigVersionDate, configurationToday } from '../src/services/admin/configVersionValidation';
import { resolveDailiesDiscountRules, summarizeDailiesPeriodMode } from '../src/utils/dailiesRules';
import type { CourtConfig, RowLike } from '../src/types';

// =========================================================================
// Achado 4: Detalhamento de PSS do 13º salário
// =========================================================================
test('Achado 4: Detalhamento de PSS do 13º concentra na 2ª parcela de vencimento sem rateio para FC ou 1ª parcela', () => {
    const rows: RowLike[] = [
        { label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA ATIVO EC', value: 5000, type: 'C' },
        { label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA FC/CJ ATIVO EC', value: 1000, type: 'C' },
        { label: 'GRATIFICACAO NATALINA-2a PARCELA ATIVO EC', value: 5000, type: 'C' },
        { label: 'GRATIFICACAO NATALINA-2a PARCELA FC/CJ ATIVO EC', value: 1000, type: 'C' },
        { label: 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC', value: 1000, type: 'D' },
    ];

    const state = {
        pss13: 1000,
        adiant13Venc: 5000,
        adiant13FC: 1000,
        segunda13Venc: 5000,
        segunda13FC: 1000,
    } as any;

    const displayRows = groupPayslipRowsForDisplay(rows, state);
    const pss13Row = displayRows.find((r) => r.label === 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC');

    assert.ok(pss13Row, 'Linha consolidada de PSS do 13º deve existir');
    assert.equal(pss13Row.value, 1000);
    assert.ok(pss13Row.details, 'Deve possuir detalhamento');
    assert.equal(pss13Row.details.length, 1, 'Deve conter apenas 1 linha de detalhamento (sem rateio indevido)');

    const detail = pss13Row.details[0];
    assert.equal(detail.label, 'PSS DA GRATIFICAÇÃO NATALINA - 2ª PARCELA - VENCIMENTO/ATIVO EC');
    assert.equal(detail.value, 1000);
    assert.equal(detail.type, 'D');

    // Nenhuma menção a FC/CJ ou 1ª parcela no detalhamento de PSS
    assert.ok(!pss13Row.details.some((d) => d.label.includes('FC/CJ')), 'Não pode haver PSS atribuído a FC/CJ no 13º');
    assert.ok(!pss13Row.details.some((d) => d.label.includes('1ª PARCELA')), 'Não pode haver PSS atribuído à 1ª parcela no 13º');
});

// =========================================================================
// Achado 5: Substituições com incidências distintas calculadas individualmente
// =========================================================================
test('Achado 5: Substituições com incidências distintas (FC-1 mensal e CJ-4 EA) não são calculadas por média', async () => {
    const { calculateSubstitution } = await import('../src/services/agency/engine/modules/substitutionCalculations');

    const mockCourtConfig: CourtConfig = {
        bases: {
            salario: { analista: { A1: 6000 } },
            funcoes: {
                fc1: 3000,
                cj4: 15000,
            }
        },
        payrollRules: {
            gajRate: 0.5,
            monthDayDivisor: 30,
            specificGratificationRate: 0,
            vrRateOnCj1: 0,
            overtimeMonthHours: 200,
            transportWorkdays: 22,
            transportDiscountRate: 0.06,
            irrfTopRate: 0.1
        },
        historico_pss: {},
        historico_ir: {},
        careerCatalog: {
            noFunctionCode: '0',
            noFunctionLabel: 'Sem função',
            cargoLabels: {}
        }
    } as any;

    const params = {
        agencyConfig: mockCourtConfig,
        cargo: 'analista',
        padrao: 'A1',
        funcao: '0',
        periodo: 0,
        substitutionEntries: [
            { id: 'subst-fc1', dias: { fc1: 1 }, isEA: false, excluirIR: false, pssIsEA: false },
            { id: 'subst-cj4', dias: { cj4: 1 }, isEA: true, excluirIR: false, pssIsEA: false }
        ]
    } as any;

    const result = await calculateSubstitution(params);
    assert.equal(result.total, 600, 'Total deve ser 100 + 500 = 600');
    assert.equal(result.entries.length, 2);

    const fc1Entry = result.entries.find(e => e.id === 'subst-fc1')!;
    const cj4Entry = result.entries.find(e => e.id === 'subst-cj4')!;

    // FC-1: 3000 / 30 * 1 = 100
    assert.equal(fc1Entry.total, 100, 'FC-1 deve ser R$ 100 (e não R$ 300 pela média)');
    assert.equal(fc1Entry.isEA, false);

    // CJ-4: 15000 / 30 * 1 = 500
    assert.equal(cj4Entry.total, 500, 'CJ-4 deve ser R$ 500 (e não R$ 300 pela média)');
    assert.equal(cj4Entry.isEA, true);
});

// =========================================================================
// Achado 6: Feriados manuais respeitados no resumo de diárias
// =========================================================================
test('Achado 6: Feriado manual indicado pelo usuário desativa meio desconto de auxílio-alimentação de retorno', () => {
    const dailiesConfig = {
        rates: {},
        discountRules: {
            foodDivisor: 22,
            transportDivisor: 22,
            excludeWeekendsAndHolidays: true,
            holidays: ['2026-01-01'], // feriado institucional fixo (não inclui 13/11/2026)
            halfDailyOnBusinessReturnDay: true,
            halfDiscountOnBusinessReturnDay: true,
        }
    };

    const discountRules = resolveDailiesDiscountRules(dailiesConfig as any, 22);

    // Sexta-feira 13/11/2026
    const dataInicio = '2026-11-10';
    const dataFim = '2026-11-13';

    // 1) Sem marcar feriado manual: sexta-feira útil aplica meio desconto de alimentação
    const periodWithoutManualHoliday = summarizeDailiesPeriodMode(dataInicio, dataFim, {
        ...discountRules,
        excludeWeekendsAndHolidays: true,
        holidays: discountRules.holidays || [],
    });
    assert.equal(periodWithoutManualHoliday.returnDateIsHoliday, false);
    assert.equal(periodWithoutManualHoliday.returnDateIsBusinessDay, true);
    assert.equal(periodWithoutManualHoliday.halfDiscountApplied, true, 'Sexta-feira útil normal deve aplicar meio desconto de auxílio');

    // 2) Marcando 13/11/2026 como feriado manual pelo usuário:
    const manualHolidays = ['2026-11-13'];
    const periodWithManualHoliday = summarizeDailiesPeriodMode(dataInicio, dataFim, {
        ...discountRules,
        excludeWeekendsAndHolidays: true,
        holidays: manualHolidays,
    });
    assert.equal(periodWithManualHoliday.returnDateIsHoliday, true, '13/11/2026 deve ser reconhecido como feriado');
    assert.equal(periodWithManualHoliday.returnDateIsBusinessDay, false);
    assert.equal(periodWithManualHoliday.halfDiscountApplied, false, 'Dia de retorno em feriado marcado pelo usuário não pode aplicar desconto de alimentação');
});

// =========================================================================
// Achado 7: Validação de datas para versionamento administrativo
// =========================================================================
test('Achado 7: Validação de versionamento administrativo preserva histórico e valida datas', () => {
    const today = configurationToday();
    const activeConfig = { valid_from: '2025-01-01', valid_to: null };
    const historicalConfig = { valid_from: '2024-01-01', valid_to: '2024-12-31' };

    // 1. Tentar versionar registro que não é ativo
    assert.equal(
        validateConfigVersionDate(historicalConfig, today, today),
        'Somente a versão ativa pode originar uma nova versão.'
    );

    // 2. Data no futuro
    assert.equal(
        validateConfigVersionDate(activeConfig, '2099-01-01', today),
        'O agendamento de versões futuras não está disponível.'
    );

    // 3. Data igual ou anterior à vigência da versão atual
    assert.equal(
        validateConfigVersionDate(activeConfig, '2025-01-01', today),
        'A nova versão deve iniciar após a data da versão atual; não são permitidas duas versões no mesmo dia.'
    );
    assert.equal(
        validateConfigVersionDate(activeConfig, '2024-12-01', today),
        'A nova versão deve iniciar após a data da versão atual; não são permitidas duas versões no mesmo dia.'
    );

    // 4. Data válida
    assert.equal(
        validateConfigVersionDate(activeConfig, today, today),
        null,
        'Data de hoje deve ser aceita para início da nova versão'
    );
});

// =========================================================================
// Achado 8: Proteção contra dias negativos de licença compensatória
// =========================================================================
test('Achado 8: Licença compensatória com dias negativos retorna 0 e não valor negativo', async () => {
    const mockCourtConfig: CourtConfig = {
        bases: {
            salario: {
                analista: { A1: 6000 }
            },
            funcoes: {}
        },
        payrollRules: {
            gajRate: 0.5,
            monthDayDivisor: 30,
            specificGratificationRate: 0,
            vrRateOnCj1: 0,
            overtimeMonthHours: 200,
            transportWorkdays: 22,
            transportDiscountRate: 0.06,
            irrfTopRate: 0.1
        },
        historico_pss: {},
        historico_ir: {},
        careerCatalog: {
            noFunctionCode: '0',
            noFunctionLabel: 'Sem função',
            cargoLabels: {}
        }
    } as any;

    const paramsNegativo = {
        agencyConfig: mockCourtConfig,
        cargo: 'analista',
        padrao: 'A1',
        periodo: 0,
        licencaDias: -3,
        incluirAbonoLicenca: false,
    } as any;

    const result = await calculateCompensatoryLeave(paramsNegativo);
    assert.equal(result, 0, 'Dias negativos de licença devem retornar 0 e nunca valor negativo como -R$ 900');

    // Dias positivos continuam calculando normalmente: (6000 + 3000)/30 * 2 = 600
    const paramsPositivo = {
        ...paramsNegativo,
        licencaDias: 2,
    };
    const resultPositivo = await calculateCompensatoryLeave(paramsPositivo);
    assert.equal(resultPositivo, 600, '2 dias devem calcular R$ 600');
});
