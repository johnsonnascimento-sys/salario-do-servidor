import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateThirteenth } from '../src/services/agency/engine/modules/thirteenthCalculations';
import type { IAgencyCalculationParams } from '../src/services/agency/types';
import type { CourtConfig } from '../src/types';

const mockConfig: CourtConfig = {
    bases: {
        salario: {
            analista: { A1: 6000 }
        },
        funcoes: {
            fc1: 1000
        }
    },
    historico_pss: {
        teste: {
            teto_rgps: 5000,
            faixas: [{ min: 0, max: 100000, rate: 0.1 }]
        }
    },
    historico_ir: {
        teste: 0
    },
    payrollRules: {
        gajRate: 0.5, // 6000 + 3000 = 9000 total vencimento
        specificGratificationRate: 0,
        vrRateOnCj1: 0,
        monthDayDivisor: 30,
        overtimeMonthHours: 200,
        transportWorkdays: 22,
        transportDiscountRate: 0.06,
        irrfTopRate: 0.1
    },
    careerCatalog: {
        noFunctionCode: '0',
        noFunctionLabel: 'Sem função',
        cargoLabels: {}
    }
};

const createBaseParams = (overrides: Partial<IAgencyCalculationParams> = {}): IAgencyCalculationParams => ({
    periodo: 0,
    cargo: 'analista',
    padrao: 'A1',
    funcao: 'fc1',
    tabelaPSS: 'teste',
    tabelaIR: 'teste',
    regimePrev: 'antigo',
    funprespParticipacao: 'nao',
    funprespAliq: 0,
    funprespFacul: 0,
    aqTituloPerc: 0,
    aqTreinoPerc: 0,
    aqTituloVR: 0,
    aqTreinoVR: 0,
    dependents: 0,
    agencyConfig: mockConfig,
    ...overrides
});

test('Achado 1: Somente 1ª e 2ª parcelas do vencimento selecionadas', async () => {
    // Vencimento = 6000 + GAJ (3000) = 9000. Metade = 4500.
    // FC = 1000. Metade = 500.
    // Seleciona APENAS primeira e segunda parcelas do vencimento (FC desmarcada).
    const params = createBaseParams({
        adiant13Venc: 1,
        segunda13Venc: 1,
        adiant13FC: 0,
        segunda13FC: 0,
        manualAdiant13: false
    });

    const result = await calculateThirteenth(params);

    // Abatimento da 1ª parcela deve ser exatamente 4500 (metade vencimento), e NUNCA 5000 (que incluiria FC)
    assert.equal(result.primeiraParcelaDesconto, 4500, 'Abatimento da 1ª parcela não deve conter FC');
    // Adiantamento do vencimento recomposto para 4500, FC deve ser 0
    assert.equal(result.adiant13Venc, 4500);
    assert.equal(result.segunda13Venc, 4500);
    assert.equal(result.adiant13FC, 0);
    assert.equal(result.segunda13FC, 0);
    // Gratificação natalina total de crédito = 4500 + 4500 = 9000
    assert.equal(result.gratNatalinaTotal, 9000);
    // PSS incide sobre vencimento integral (9000 * 10% = 900)
    assert.equal(result.pss13, 900);
});

test('Achado 1: Somente 1ª e 2ª parcelas da FC/CJ selecionadas', async () => {
    // Vencimento = 9000. FC = 1000.
    // Seleciona APENAS primeira e segunda parcelas da FC (Vencimento desmarcado).
    const params = createBaseParams({
        adiant13Venc: 0,
        segunda13Venc: 0,
        adiant13FC: 1,
        segunda13FC: 1,
        manualAdiant13: false
    });

    const result = await calculateThirteenth(params);

    // Abatimento da 1ª parcela deve ser exatamente 500 (metade FC), e NUNCA 5000 (que incluiria vencimento)
    assert.equal(result.primeiraParcelaDesconto, 500, 'Abatimento da 1ª parcela não deve conter vencimento');
    // FC recomposta para 500 + 500 = 1000, vencimento deve ser 0
    assert.equal(result.adiant13Venc, 0);
    assert.equal(result.segunda13Venc, 0);
    assert.equal(result.adiant13FC, 500);
    assert.equal(result.segunda13FC, 500);
    // Gratificação natalina total de crédito = 500 + 500 = 1000
    assert.equal(result.gratNatalinaTotal, 1000);
    // Regra 4.3.1: NÃO cobrar PSS sobre FC/CJ no 13º. Como vencimento não foi selecionado, PSS deve ser 0
    assert.equal(result.pss13, 0, 'PSS deve ser zero quando apenas FC for selecionada');
});

test('Ambos componentes selecionados (Vencimento + FC)', async () => {
    const params = createBaseParams({
        adiant13Venc: 1,
        segunda13Venc: 1,
        adiant13FC: 1,
        segunda13FC: 1,
        manualAdiant13: false
    });

    const result = await calculateThirteenth(params);

    // Abatimento = 4500 + 500 = 5000
    assert.equal(result.primeiraParcelaDesconto, 5000);
    assert.equal(result.gratNatalinaTotal, 10000);
    // PSS incide sobre 9000 (exclui FC de 1000) -> 900
    assert.equal(result.pss13, 900);
});

test('Modo manual: isolamento estrito sem recomposição indevida', async () => {
    const params = createBaseParams({
        adiant13Venc: 4000,
        segunda13Venc: 4000,
        adiant13FC: 0,
        segunda13FC: 0,
        manualAdiant13: true
    });

    const result = await calculateThirteenth(params);

    assert.equal(result.primeiraParcelaDesconto, 4000);
    assert.equal(result.gratNatalinaTotal, 8000);
    assert.equal(result.adiant13FC, 0);
    assert.equal(result.segunda13FC, 0);
});

test('Modo manual com adiantamento customizado: apura saldo automático da 2ª parcela em novembro', async () => {
    // Vencimento = 9000 (base integral). FC = 1000 (base integral).
    // Servidor informa adiantamento recebido anteriormente: 3500 para vencimento e 400 para FC.
    // Em novembro, segunda13Venc e segunda13FC não recebem valor explícito (> 1).
    const params = createBaseParams({
        tipoCalculo: 'nov',
        adiant13Venc: 3500,
        adiant13FC: 400,
        segunda13Venc: 0,
        segunda13FC: 0,
        manualAdiant13: true
    });

    const result = await calculateThirteenth(params);

    // 2ª parcela deve ser exatamente o saldo complementar para fechar 100% da base:
    // Saldo vencimento: 9000 - 3500 = 5500
    // Saldo FC: 1000 - 400 = 600
    assert.equal(result.adiant13Venc, 3500);
    assert.equal(result.segunda13Venc, 5500);
    assert.equal(result.adiant13FC, 400);
    assert.equal(result.segunda13FC, 600);

    // Abatimento da 1ª parcela deve ser exatamente o valor do adiantamento informado
    assert.equal(result.primeiraParcelaDesconto, 3900); // 3500 + 400
    // Gratificação natalina total de proventos = 3500 + 5500 + 400 + 600 = 10000
    assert.equal(result.gratNatalinaTotal, 10000);
    // PSS incide sobre 9000 integral (3500 + 5500) -> 900
    assert.equal(result.pss13, 900);
});

test('Composição dinâmica da base do 13º (estilo GAACTA): inclusão de rubrica manual e exclusão de função', async () => {
    // Vencimento = 9000. FC = 1000.
    // Rubrica manual de crédito de 500 incluída na base do 13º.
    // FC/CJ desmarcada da composição do 13º.
    const params = createBaseParams({
        tipoCalculo: 'nov',
        decimoIncideFuncao: false, // FC não integra o 13º
        decimoRubricasInclusas: { 'rub-1': true },
        rubricasExtras: [{ id: 'rub-1', tipo: 'C', descricao: 'Vantagem Extra', valor: 500 } as any],
        manualAdiant13: false
    });

    const result = await calculateThirteenth(params);

    // Base do cargo: 9000 (venc + gaj) + 500 (rubrica manual) = 9500
    // Metade da 1ª parcela = 4750. Metade da 2ª parcela = 4750.
    // FC deve ser 0 pois foi desmarcada da composição
    assert.equal(result.adiant13FC, 0);
    assert.equal(result.segunda13FC, 0);
    assert.equal(result.adiant13Venc, 4750);
    assert.equal(result.segunda13Venc, 4750);
    assert.equal(result.gratNatalinaTotal, 9500);
    assert.equal(result.primeiraParcelaDesconto, 4750);
});
