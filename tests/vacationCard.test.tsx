import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { VacationOverview } from '../src/components/Calculator/VacationOverview';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { VacationCard } from '../src/components/Calculator/cards/VacationCard';
import { INITIAL_STATE, CalculatorState, CourtConfig } from '../src/types';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { styles } from '../src/components/Calculator/styles';
const config: CourtConfig = {
    bases: { salario: { analista: { A1: 6000 } }, funcoes: { fc1: 1000 } },
    payrollRules: { gajRate: 0.5, specificGratificationRate: 0, vrRateOnCj1: 0, monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: 0.06, irrfTopRate: 0.1 },
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
    historico_ir: { teste: 0 }, values: { deducao_dep: 100 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} }
};

const input: CalculatorState = { ...INITIAL_STATE, cargo: 'analista', padrao: 'A1', funcao: 'fc1', periodo: 0,
    tipoCalculo: 'comum', tabelaIR: 'teste', tabelaPSS: 'teste', regimePrev: 'antigo', funprespParticipacao: 'nao', ferias1_3: 1 };
const textOf = (node: ReactTestInstance): string => node.children.map(c => typeof c === 'string' ? c : textOf(c)).join('');
const button = (tree: ReturnType<typeof create>, name: string) => tree.root.findAllByType('button').find(n => textOf(n) === name)!;
const checkbox = (tree: ReturnType<typeof create>, name: string) => tree.root.findAllByType('label').find(n => textOf(n).includes(name))!.findByType('input');
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); }); };
function setup(overrides: Partial<CalculatorState> = {}) {
    const patches: any[] = [];
    const raw = { ...input, ...overrides };
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<VacationCard state={{ ...raw, ferias1_3: 3333.33 }} inputState={raw}
        update={(...patch) => patches.push(patch)} styles={styles} courtConfig={config} competenciaReferencia="11/2026" calculationReady />); });
    return { tree, patches, raw };
}
test('abrir e cancelar não gravam entradas; composição só aparece no editor', async () => {
    const { tree, patches } = setup();
    assert.equal(tree.root.findAllByType('input').length, 1);
    assert.doesNotMatch(textOf(tree.root), /Composição da remuneração/);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    await flush();
    act(() => checkbox(tree, 'GAJ').props.onChange({ target: { checked: false } }));
    await flush();
    assert.equal(patches.length, 0);
    act(() => button(tree, 'Cancelar').props.onClick());
    assert.equal(patches.length, 0);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(checkbox(tree, 'GAJ').props.checked, true);
    act(() => tree.unmount());
});
test('aplicar grava só os campos alterados e a prévia vem do motor', async () => {
    const { tree, patches } = setup();
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    await flush();
    assert.match(textOf(tree.root), /Adicional:.*3.333,33/);
    act(() => checkbox(tree, 'GAJ').props.onChange({ target: { checked: false } }));
    await flush();
    assert.match(textOf(tree.root), /Adicional:.*2.333,33/);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, [['feriasIncideGAJ', false]]);
    act(() => tree.unmount());
});
test('valor manual usa o resultado calculado, e desconto automático acompanha a prévia', async () => {
    const { tree, patches } = setup();
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    await flush();
    act(() => checkbox(tree, 'Informar valor manual').props.onChange({ target: { checked: true } }));
    await flush();
    const manual = () => tree.root.findByProps({ 'aria-label': 'Valor manual do adicional de férias' });
    assert.equal(manual().props.value, '3.333,33');
    act(() => manual().props.onChange({ target: { value: '150000' } }));
    await flush();
    act(() => checkbox(tree, 'Recebido 1/3').props.onChange({ target: { checked: true } }));
    await flush();
    assert.match(textOf(tree.root), /Desconto por recebimento anterior:.*1.500,00/);
    assert.equal(patches.length, 0);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.ok(patches.some(([key, value]) => key === 'ferias1_3' && value === 1500));
    assert.ok(patches.some(([key, value]) => key === 'manualFerias' && value === true));
    act(() => tree.unmount());
});
test('abrir/aplicar snapshot manual sem editar preserva o valor e as entradas', async () => {
    const { tree, patches } = setup({ manualFerias: true, ferias1_3: 0.5, feriasDescManual: true, feriasDesc: 40, feriasAntecipadas: true });
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    await flush();
    assert.equal(tree.root.findByProps({ 'aria-label': 'Valor manual do adicional de férias' }).props.value, '0,50');
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, []);
    act(() => tree.unmount());
});

test('resposta antiga da prévia não reaparece após nova edição ou falha', async () => {
    const original = AgencyCalculationEngine.prototype.calculateTotal;
    const pending: Array<{ resolve: (value: any) => void; reject: (error: Error) => void }> = [];
    AgencyCalculationEngine.prototype.calculateTotal = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
    const { tree } = setup();
    try {
        act(() => button(tree, 'Personalizar cálculo').props.onClick());
        act(() => checkbox(tree, 'GAJ').props.onChange({ target: { checked: false } }));
        assert.match(textOf(tree.root), /Calculando prévia/);
        await act(async () => { pending[1].reject(new Error('Configuração indisponível')); });
        assert.match(textOf(tree.root), /Configuração indisponível/);
        await act(async () => { pending[0].resolve({ breakdown: { feriasConstitucional: 9999 } }); });
        assert.doesNotMatch(textOf(tree.root), /9.999,00/);
        assert.match(textOf(tree.root), /Configuração indisponível/);
    } finally {
        act(() => tree.unmount());
        AgencyCalculationEngine.prototype.calculateTotal = original;
    }
});

test('resumo de férias concilia bruto, IR e desconto anterior, sem ocultar saldo negativo', () => {
    const params = { instance: { key: 'ferias', presetId: 'ferias' as const }, state: { ...input, ferias1_3: 3000, irFerias: 200, feriasDesc: 3100 }, courtConfig: config, currentTables: { funcoes: {} }, isNovoAQ: false, noFunctionCode: '0', currentFunctionValue: 0, gratificacaoEspecificaCalculada: 0 };
    const lines = buildPresetGrossLines(params);
    assert.equal(lines.find(line => line.label === 'Adicional 1/3 férias Liquido')?.value, -300);
    assert.equal(lines.find(line => line.label === 'Desconto de férias antecipadas')?.value, 3100);
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<VacationOverview lines={lines} calculationReady />); });
    assert.match(textOf(tree.root), /Bruto.*3.000,00.*Líquido.*300,00/);
    act(() => tree.update(<VacationOverview lines={lines} calculationReady={false} />));
    assert.doesNotMatch(textOf(tree.root), /3.000,00/);
    assert.match(textOf(tree.root), /Aguardando cálculo/);
    act(() => tree.unmount());
});
