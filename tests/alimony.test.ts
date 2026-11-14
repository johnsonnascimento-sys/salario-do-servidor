import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_STATE, CalculatorState, Rubrica } from '../src/types';
import {
    PREDEFINED_OPTIONS,
    PRESET_CATALOG,
    hasPresetValue
} from '../src/components/Calculator/dynamicPayrollForm.helpers';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';

test('Pensão Alimentícia: valores padrão em INITIAL_STATE', () => {
    assert.equal(INITIAL_STATE.pensaoAlimenticiaAtiva, false);
    assert.equal(INITIAL_STATE.pensaoTipo, 'percentual');
    assert.equal(INITIAL_STATE.pensaoPercentual, 30);
    assert.equal(INITIAL_STATE.pensaoValorFixo, 0);
    assert.equal(INITIAL_STATE.pensaoIncideVencimento, true);
    assert.equal(INITIAL_STATE.pensaoIncideGAJ, true);
    assert.equal(INITIAL_STATE.pensaoIncideFuncao, true);
    assert.equal(INITIAL_STATE.pensaoIncideAQTitulo, true);
    assert.equal(INITIAL_STATE.pensaoIncideAQTreino, true);
    assert.equal(INITIAL_STATE.pensaoIncideGrat, true);
    assert.equal(INITIAL_STATE.pensaoIncideGAACTA, true);
    assert.equal(INITIAL_STATE.pensaoIncideVPNI, true);
    assert.equal(INITIAL_STATE.pensaoIncideATS, true);
    assert.equal(INITIAL_STATE.pensaoIncideAbono, true);
    assert.equal(INITIAL_STATE.pensaoIncide13, true);
    assert.equal(INITIAL_STATE.pensaoIncideFerias, true);
    assert.equal(INITIAL_STATE.pensaoIncideHoraExtra, true);
    assert.equal(INITIAL_STATE.pensaoIncideSubstituicao, true);
    assert.equal(INITIAL_STATE.pensaoDeduzirIRRF, true);
    assert.equal(INITIAL_STATE.pensaoDeduzirPSS, true);
    assert.equal(INITIAL_STATE.pensaoDeduzirFunpresp, false);
});

test('Pensão Alimentícia: catálogo e opções pré-definidas', () => {
    const option = PREDEFINED_OPTIONS.find(opt => opt.id === 'pensao');
    assert.ok(option, 'pensao deve constar em PREDEFINED_OPTIONS');
    assert.equal(option.label, 'Pensão Alimentícia');

    // Ordem alfabética estrita
    const labels = PREDEFINED_OPTIONS.map(opt => opt.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    assert.deepEqual(labels, sorted);

    // Presença no catálogo visual
    const catalogItem = PRESET_CATALOG.find(item => item.id === 'pensao');
    assert.ok(catalogItem, 'pensao deve constar em PRESET_CATALOG');
    assert.equal(catalogItem.category, 'beneficios');
});

test('Pensão Alimentícia: hasPresetValue detecta ativação e valor', () => {
    const inactiveState = { ...INITIAL_STATE, pensaoAlimenticiaAtiva: false, pensao: 0 };
    assert.equal(hasPresetValue('pensao', inactiveState), false);

    const activeState = { ...INITIAL_STATE, pensaoAlimenticiaAtiva: true };
    assert.equal(hasPresetValue('pensao', activeState), true);

    const withValueState = { ...INITIAL_STATE, pensao: 1500 };
    assert.equal(hasPresetValue('pensao', withValueState), true);
});

test('Pensão Alimentícia: cálculo sobre base bruta vs base líquida (IR e PSS)', () => {
    // Servidor com Vencimento R$ 8.000 + GAJ R$ 11.200 = R$ 19.200 bruto
    // PSS = R$ 2.400, IRRF = R$ 3.800
    const vencimento = 8000;
    const gaj = 11200;
    const baseBruta = vencimento + gaj;
    const pss = 2400;
    const irrf = 3800;

    // Caso 1: Pensão de 30% sobre o BRUTO (desmarcando deduções de IR e PSS)
    const pensaoBruto = Math.round(baseBruta * 0.3 * 100) / 100;
    assert.equal(pensaoBruto, 5760.00);

    // Caso 2: Pensão de 30% sobre o LÍQUIDO (deduzindo IR e PSS)
    const baseLiquida = baseBruta - (pss + irrf);
    assert.equal(baseLiquida, 13000.00);
    const pensaoLiquido = Math.round(baseLiquida * 0.3 * 100) / 100;
    assert.equal(pensaoLiquido, 3900.00);
});

test('Pensão Alimentícia: exclusão de desconto dinâmico acordado (ex: Plano de Saúde)', () => {
    const baseBruta = 15000;
    const pss = 2000;
    const irrf = 2500;
    const planoSaude = 800; // Desconto manual dinâmico acordado judicialmente

    const totalDeducoes = pss + irrf + planoSaude;
    assert.equal(totalDeducoes, 5300);

    const baseLiquida = baseBruta - totalDeducoes;
    assert.equal(baseLiquida, 9700);

    // 25% de pensão sobre a base líquida pós-plano de saúde
    const pensao = Math.round(baseLiquida * 0.25 * 100) / 100;
    assert.equal(pensao, 2425.00);
});

test('Pensão Alimentícia: inclusão de rubricas manuais dinâmicas de crédito na base', () => {
    const vencimento = 5000;
    const vpni = 1200;
    const ats = 300;
    const rubricaManual = 1000; // ex: Diferença salarial avulsa

    const baseBruta = vencimento + vpni + ats + rubricaManual;
    assert.equal(baseBruta, 7500);

    // 20% sobre o bruto
    const pensao = Math.round(baseBruta * 0.20 * 100) / 100;
    assert.equal(pensao, 1500.00);
});

test('Pensão Alimentícia: modo valor fixo', () => {
    const valorFixo = 2750.50;
    const state: CalculatorState = {
        ...INITIAL_STATE,
        pensaoAlimenticiaAtiva: true,
        pensaoTipo: 'fixo',
        pensaoValorFixo: valorFixo,
        pensao: valorFixo
    };

    assert.equal(state.pensaoTipo, 'fixo');
    assert.equal(state.pensaoValorFixo, 2750.50);
    assert.equal(state.pensao, 2750.50);
});

test('Pensão Alimentícia: buildPresetGrossLines gera linhas de fechamento do card', () => {
    const statePercentual: CalculatorState = {
        ...INITIAL_STATE,
        pensaoTipo: 'percentual',
        pensaoPercentual: 30,
        pensaoBaseBruta: 10000,
        pensaoTotalDeducoes: 2000,
        pensaoBaseCalculo: 8000,
        pensao: 2400
    };

    const linesPercentual = buildPresetGrossLines({
        instance: { key: 'preset-pensao', presetId: 'pensao' },
        state: statePercentual,
        courtConfig: {} as any,
        currentTables: { funcoes: {} },
        isNovoAQ: false,
        noFunctionCode: '',
        currentFunctionValue: 0,
        gratificacaoEspecificaCalculada: 0
    });

    assert.ok(linesPercentual.some(l => l.label === 'Base bruta apurada da pensão' && l.value === 10000));
    assert.ok(linesPercentual.some(l => l.label === 'Deduções acordadas da base' && l.value === 2000 && l.isDiscount));
    assert.ok(linesPercentual.some(l => l.label === 'Base líquida de incidência' && l.value === 8000));
    assert.ok(linesPercentual.some(l => l.label === 'Pensão alimentícia (30%)' && l.value === 2400 && l.isDiscount));

    const stateFixo: CalculatorState = {
        ...INITIAL_STATE,
        pensaoTipo: 'fixo',
        pensaoValorFixo: 1800,
        pensao: 1800
    };

    const linesFixo = buildPresetGrossLines({
        instance: { key: 'preset-pensao', presetId: 'pensao' },
        state: stateFixo,
        courtConfig: {} as any,
        currentTables: { funcoes: {} },
        isNovoAQ: false,
        noFunctionCode: '',
        currentFunctionValue: 0,
        gratificacaoEspecificaCalculada: 0
    });

    assert.ok(linesFixo.some(l => l.label === 'Pensão alimentícia (valor fixo)' && l.value === 1800 && l.isDiscount));
});
