import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateBase, calculateBaseComponents } from '../src/services/agency/engine/modules/baseCalculations';
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
        specificGratificationRate: 0.35, // Lei 11.416/06: 35%
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
    recebeAbono: false,
    gratEspecificaTipo: 'gae',
    gratEspecificaValor: 0,
    vpni_lei: 0,
    vpni_decisao: 0,
    ats: 0,
    agencyConfig: mockConfig,
    ...overrides
});

test('Gratificação Específica (GAE / GAS): valores padrão em INITIAL_STATE', () => {
    // Vencimento básico selecionado por padrão (Lei 11.416/06, arts. 16 e 17)
    assert.equal(INITIAL_STATE.gratIncideVencimento, true);

    // Demais créditos desmarcados por padrão
    assert.equal(INITIAL_STATE.gratIncideGAJ, false);
    assert.equal(INITIAL_STATE.gratIncideFuncao, false);
    assert.equal(INITIAL_STATE.gratIncideAQTitulo, false);
    assert.equal(INITIAL_STATE.gratIncideAQTreino, false);
    assert.equal(INITIAL_STATE.gratIncideATS, false);
    assert.equal(INITIAL_STATE.gratIncideVPNI, false);
    assert.equal(INITIAL_STATE.gratIncideAbono, false);
    assert.equal(INITIAL_STATE.gratOutrasParcelas, 0);
    assert.deepEqual(INITIAL_STATE.gratRubricasInclusas, {});
});

test('GAE (Lei 11.416/06, art. 16): cálculo padrão sobre vencimento básico (35%)', async () => {
    // Vencimento básico = 6000. 35% de 6000 = 2100.
    const params = createBaseParams({
        gratEspecificaTipo: 'gae'
    });

    const components = await calculateBaseComponents(params);
    assert.equal(components.gratEspecifica, 2100);
});

test('GAS (Lei 11.416/06, art. 17): cálculo padrão sobre vencimento básico (35%)', async () => {
    // Vencimento básico = 6000. 35% de 6000 = 2100.
    const params = createBaseParams({
        gratEspecificaTipo: 'gas'
    });

    const components = await calculateBaseComponents(params);
    assert.equal(components.gratEspecifica, 2100);
});

test('GAE/GAS: desmarcar vencimento básico resulta em base zerada', async () => {
    const params = createBaseParams({
        gratEspecificaTipo: 'gae',
        gratIncideVencimento: false
    });

    const components = await calculateBaseComponents(params);
    assert.equal(components.gratEspecifica, 0);
});

test('GAE/GAS: inclusão de GAJ e FC por determinação do usuário', async () => {
    // Vencimento (6000) + GAJ (3000) = 9000. 35% de 9000 = 3150.
    const paramsComGaj = createBaseParams({
        gratEspecificaTipo: 'gae',
        gratIncideGAJ: true
    });
    const compGaj = await calculateBaseComponents(paramsComGaj);
    assert.equal(compGaj.gratEspecifica, 3150);

    // Vencimento (6000) + FC1 (1000) = 7000. 35% de 7000 = 2450.
    const paramsComFC = createBaseParams({
        gratEspecificaTipo: 'gae',
        gratIncideFuncao: true
    });
    const compFC = await calculateBaseComponents(paramsComFC);
    assert.equal(compFC.gratEspecifica, 2450);
});

test('GAE/GAS: inclusão de VPNI, Rubricas Manuais e Outras Parcelas', async () => {
    const params = createBaseParams({
        gratEspecificaTipo: 'gae',
        vpni_lei: 400,
        gratIncideVPNI: true,
        rubricasExtras: [
            { id: 'rub-extra-1', descricao: 'Decisão Judicial GAE', valor: 600, tipo: 'C' }
        ],
        gratRubricasInclusas: {
            'rub-extra-1': true
        },
        gratOutrasParcelas: 200
    });

    // Base = 6000 (venc) + 400 (vpni) + 600 (rubrica manual) + 200 (outras) = 7200.
    // 35% de 7200 = 2520.
    const components = await calculateBaseComponents(params);
    assert.equal(components.gratEspecifica, 2520);
});

test('GAE/GAS: Abono de Permanência não incide por padrão, mas pode ser selecionado', async () => {
    // Abono ativo mas gratIncideAbono omitido (false por padrão)
    const paramsPadrao = createBaseParams({
        gratEspecificaTipo: 'gae',
        recebeAbono: true,
        abonoPermanencia: 800
    });
    const compPadrao = await calculateBaseComponents(paramsPadrao);
    // Deve incidir apenas sobre o vencimento (2100)
    assert.equal(compPadrao.gratEspecifica, 2100);

    // Agora ativando explicitamente a incidência do abono
    const paramsComAbono = createBaseParams({
        ...paramsPadrao,
        gratIncideAbono: true
    });
    const compComAbono = await calculateBaseComponents(paramsComAbono);
    // Base = 6000 + 800 = 6800. 35% de 6800 = 2380.
    assert.equal(compComAbono.gratEspecifica, 2380);
});

test('GAE/GAS: quando tipo for "0" (nenhuma), gratificação é zerada', async () => {
    const params = createBaseParams({
        gratEspecificaTipo: '0',
        gratIncideVencimento: true,
        gratIncideGAJ: true
    });
    const components = await calculateBaseComponents(params);
    assert.equal(components.gratEspecifica, 0);
});
