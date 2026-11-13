import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateVacation } from '../src/services/agency/engine/modules/vacationCalculations';
import type { IAgencyCalculationParams } from '../src/services/agency/types';
import type { CourtConfig } from '../src/types';
import { INITIAL_STATE } from '../src/types';

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

test('Férias (1/3 Constitucional): valores padrão em INITIAL_STATE', () => {
    assert.equal(INITIAL_STATE.feriasIncideVencimento, true);
    assert.equal(INITIAL_STATE.feriasIncideGAJ, true);
    assert.equal(INITIAL_STATE.feriasIncideFuncao, true);
    assert.equal(INITIAL_STATE.feriasIncideAQTitulo, true);
    assert.equal(INITIAL_STATE.feriasIncideAQTreino, true);
    assert.equal(INITIAL_STATE.feriasIncideATS, true);
    assert.equal(INITIAL_STATE.feriasIncideVPNI, true);
    assert.equal(INITIAL_STATE.feriasIncideAbono, true);
    assert.equal(INITIAL_STATE.feriasIncideGrat, true);
    assert.equal(INITIAL_STATE.feriasOutrasParcelas, 0);
    assert.deepEqual(INITIAL_STATE.feriasRubricasInclusas, {});
});

test('Férias: cálculo padrão com todas as parcelas ativas (Vencimento + GAJ + FC)', async () => {
    // Vencimento = 6000 + GAJ (3000) = 9000. FC = 1000.
    // Total base = 10000. 1/3 = 10000 / 3 = 3333.33
    const params = createBaseParams({
        ferias1_3: 1,
        manualFerias: false
    });

    const result = await calculateVacation(params);
    assert.equal(result.value, 3333.33);
    assert.equal(result.descontoAntecipacao, 0);
});

test('Férias: composição flexível por checkboxes permite desmarcar FC/CJ', async () => {
    // Desmarcando FC da composição das férias
    const params = createBaseParams({
        ferias1_3: 1,
        manualFerias: false,
        feriasIncideFuncao: false
    });

    const result = await calculateVacation(params);
    // Base sem FC = 6000 (venc) + 3000 (gaj) = 9000.
    // 1/3 = 9000 / 3 = 3000.
    assert.equal(result.value, 3000);
});

test('Férias: composição flexível por checkboxes permite desmarcar GAJ', async () => {
    // Desmarcando GAJ da composição
    const params = createBaseParams({
        ferias1_3: 1,
        manualFerias: false,
        feriasIncideGAJ: false
    });

    const result = await calculateVacation(params);
    // Base = 6000 (venc) + 1000 (fc) = 7000.
    // 1/3 = 7000 / 3 = 2333.33.
    assert.equal(result.value, 2333.33);
});

test('Férias: inclusão de rubricas manuais de crédito na base de cálculo', async () => {
    const params = createBaseParams({
        ferias1_3: 1,
        manualFerias: false,
        rubricasExtras: [
            { id: 'rub-extra-1', descricao: 'Gratificação Especial', valor: 600, tipo: 'C' },
            { id: 'rub-extra-2', descricao: 'Auxílio Desconsiderado', valor: 300, tipo: 'C' }
        ],
        feriasRubricasInclusas: {
            'rub-extra-1': true,
            'rub-extra-2': false
        }
    });

    const result = await calculateVacation(params);
    // Base = 9000 (venc + gaj) + 1000 (fc) + 600 (rub-extra-1) = 10600.
    // 1/3 = 10600 / 3 = 3533.33.
    assert.equal(result.value, 3533.33);
});

test('Férias: outras parcelas / ajustes na base de cálculo', async () => {
    const params = createBaseParams({
        ferias1_3: 1,
        manualFerias: false,
        feriasOutrasParcelas: 200
    });

    const result = await calculateVacation(params);
    // Base = 9000 + 1000 + 200 = 10200.
    // 1/3 = 10200 / 3 = 3400.
    assert.equal(result.value, 3400);
});

test('Férias: Abono de Permanência fica selecionado por padrão e incide quando o abono é ativado', async () => {
    // Servidor recebendo abono de permanência
    const paramsComAbono = createBaseParams({
        ferias1_3: 1,
        manualFerias: false,
        recebeAbono: true,
        abonoPermanencia: 800
        // feriasIncideAbono omitido para testar valor padrão (true)
    });

    const resComAbono = await calculateVacation(paramsComAbono);
    // Base = 9000 (cargo) + 1000 (fc) + 800 (abono) = 10800.
    // 1/3 = 10800 / 3 = 3600.
    assert.equal(resComAbono.value, 3600);

    // Agora desmarcando explicitamente o abono na composição de férias
    const paramsSemAbono = createBaseParams({
        ...paramsComAbono,
        feriasIncideAbono: false
    });

    const resSemAbono = await calculateVacation(paramsSemAbono);
    // Base = 9000 + 1000 = 10000.
    // 1/3 = 10000 / 3 = 3333.33.
    assert.equal(resSemAbono.value, 3333.33);
});

test('Férias: férias antecipadas aplicam desconto correto', async () => {
    const params = createBaseParams({
        ferias1_3: 1,
        manualFerias: false,
        feriasAntecipadas: true
    });

    const result = await calculateVacation(params);
    // Adicional apurado = 3333.33, desconto antecipado deve espelhar o valor
    assert.equal(result.value, 3333.33);
    assert.equal(result.descontoAntecipacao, 3333.33);
    // IR de férias não incide se foi antecipado
    assert.equal(result.irFerias, 0);
});
