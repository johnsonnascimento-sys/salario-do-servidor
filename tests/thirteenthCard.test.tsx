import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { ThirteenthCard } from '../src/components/Calculator/cards/ThirteenthCard';
import { PresetInstanceCard } from '../src/components/Calculator/PresetInstanceCard';
import { RubricCardHeading } from '../src/components/Calculator/RubricCardHeading';
import { ThirteenthPaymentsEditor } from '../src/components/Calculator/cards/ThirteenthPaymentsEditor';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { INITIAL_STATE, CalculatorState, CourtConfig } from '../src/types';
import type { ThirteenthPayrollInput } from '../src/types/thirteenth';
import { styles } from '../src/components/Calculator/styles';
import { createThirteenthPayroll, thirteenthSelection } from '../src/utils/thirteenthPayroll';
import { thirteenthPaymentRows, unifiedThirteenthLines } from '../src/utils/thirteenthPresentation';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';

const config: CourtConfig = {
    bases: { salario: { analista: { A1: 6000 } }, funcoes: { fc1: 1000 } },
    payrollRules: { gajRate: 0.5, specificGratificationRate: 0, vrRateOnCj1: 0, monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: 0.06, irrfTopRate: 0.1 },
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
    historico_ir: { teste: 0 }, values: { deducao_dep: 100 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} }
};
const input: CalculatorState = { ...INITIAL_STATE, cargo: 'analista', padrao: 'A1', funcao: 'fc1', periodo: 0,
    tipoCalculo: 'comum', tabelaIR: 'teste', tabelaPSS: 'teste', regimePrev: 'antigo', funprespParticipacao: 'nao',
    vencimento: 6000, gaj: 3000, adiant13Venc: 1, adiant13FC: 1, segunda13Venc: 1, segunda13FC: 1 };
const calculated = { ...input, adiant13Venc: 4500, adiant13FC: 500, segunda13Venc: 4500, segunda13FC: 500, ir13: 400, pss13: 900 };
const textOf = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
const button = (tree: ReturnType<typeof create>, name: string) => tree.root.findAllByType('button').find(node => textOf(node) === name)!;
const checkbox = (tree: ReturnType<typeof create>, label: string) => tree.root.findAllByType('label').find(node => textOf(node).includes(label))!.findByType('input');
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); };
const renderCard = (raw: CalculatorState, saved: CalculatorState = raw, update = (_field: keyof CalculatorState, _value: any) => {}) => {
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<ThirteenthCard state={saved} inputState={raw} update={update} styles={styles} courtConfig={config} competenciaReferencia="11/2026" />); });
    return tree!;
};

test('visão principal tem somente dois controles e selecionar segunda inclui primeira', () => {
    const patches: Array<[keyof CalculatorState, any]> = [];
    const raw = { ...input, adiant13Venc: 0, adiant13FC: 0, segunda13Venc: 0, segunda13FC: 0 };
    const tree = renderCard(raw, raw, (...patch) => patches.push(patch));
    assert.equal(tree.root.findAllByType('input').length, 2);
    assert.match(textOf(tree.root), /Receber 1ª parcelaReceber 2ª parcela/);
    act(() => checkbox(tree, 'Receber 2ª parcela').props.onChange({ target: { checked: true } }));
    assert.equal(patches.length, 1);
    assert.equal(patches[0][0], 'thirteenthPayroll');
    assert.equal(patches[0][1].firstSelected, true);
    assert.equal(patches[0][1].secondSelected, true);
    assert.equal(raw.thirteenthPayroll, undefined);
    act(() => tree.unmount());
});

test('snapshot parcial permanece misto e inalterado até conversão explícita', async () => {
    const patches: any[] = [];
    const raw = { ...input, adiant13FC: 0, segunda13FC: 0 };
    const original = JSON.stringify(raw);
    const tree = renderCard(raw, raw, (...patch) => patches.push(patch));
    assert.equal(checkbox(tree, 'Receber 1ª parcela').props['aria-checked'], 'mixed');
    assert.equal(checkbox(tree, 'Receber 2ª parcela').props['aria-checked'], 'mixed');
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    await flush();
    assert.match(textOf(tree.root), /Aplicar ajustes confirma o recebimento unificado/);
    assert.deepEqual(patches, []);
    act(() => button(tree, 'Cancelar').props.onClick());
    assert.equal(JSON.stringify(raw), original);
    assert.deepEqual(patches, []);
    act(() => tree.unmount());
});

test('edição mantém rascunho isolado e aplica composição/listas sem regravar campos antigos', async () => {
    const patches: any[] = [];
    const raw = { ...input, manualAdiant13: true, adiant13Venc: 3000, adiant13FC: 400 };
    const tree = renderCard(raw, { ...calculated, ...raw, segunda13Venc: 6000, segunda13FC: 600 }, (...patch) => patches.push(patch));
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    await flush();
    assert.match(textOf(tree.root), /Total dos adiantamentos informadosR\$ 3.400,00/);
    assert.match(textOf(tree.root), /Saldo bruto calculado da 2ª parcelaR\$ 6.600,00/);
    act(() => checkbox(tree, 'GAJ').props.onChange({ target: { checked: false } }));
    await flush();
    assert.deepEqual(patches, []);
    assert.match(textOf(tree.root), /Saldo bruto calculado da 2ª parcelaR\$ 3.600,00/);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches.map(patch => patch[0]), ['decimoIncideGAJ', 'thirteenthPayroll']);
    assert.equal(patches[1][1].advances[0].amount, 3000);
    assert.equal(patches[1][1].advances[0].origin, 'legacy');
    act(() => tree.unmount());
});

test('lista vincula verbas sem criar rubricas mensais e preserva valor manual ao trocar modo', () => {
    const value: ThirteenthPayrollInput = { version: 1, firstSelected: true, secondSelected: true, firstMode: 'informado', secondMode: 'manual', advances: [], secondEntries: [] };
    let current = value;
    function Harness() {
        const [state, setState] = useState(value); current = state;
        return <ThirteenthPaymentsEditor value={state} onChange={setState} styles={styles} loading={false}
            reference={{ components: [{ id: 'vencimento', label: 'Vencimento básico', amount: 6000 }], groups: [], referenceTotal: 6000, cargoTotal: 6000, functionTotal: 0 }} />;
    }
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<Harness />); });
    act(() => button(tree, 'Adicionar adiantamento').props.onClick());
    act(() => tree.root.findByType('select').props.onChange({ target: { value: 'vencimento' } }));
    const amount = () => tree.root.findAllByType('input').find(node => node.props['data-calculator'])!;
    act(() => amount().props.onChange({ target: { value: '1.250,00' } }));
    assert.equal(current.advances[0].amount, 1250);
    assert.equal(current.advances[0].description, 'Vencimento básico');
    assert.equal(current.advances[0].target, 'vencimento');
    const secondModes = tree.root.findAllByType('fieldset')[1].findAllByType('input');
    act(() => secondModes[0].props.onChange());
    assert.equal(current.secondMode, 'automatico');
    assert.equal(current.advances[0].amount, 1250);
    assert.equal(input.rubricasExtras.length, 0);
    act(() => tree.unmount());
});

test('Novembro preserva inclusão imposta e desligar primeira no modo comum desliga segunda', () => {
    const configInput = createThirteenthPayroll(input, calculated, true);
    const raw = { ...input, tipoCalculo: 'nov' as const, thirteenthPayroll: { ...configInput, firstSelected: false, secondSelected: false } };
    let tree = renderCard(raw);
    assert.equal(checkbox(tree, 'Receber 1ª parcela').props.disabled, true);
    assert.equal(checkbox(tree, 'Receber 2ª parcela').props.disabled, true);
    assert.equal(checkbox(tree, 'Receber 2ª parcela').props.checked, true);
    act(() => tree.unmount());
    const patches: any[] = [];
    tree = renderCard({ ...input, thirteenthPayroll: configInput }, calculated, (...patch) => patches.push(patch));
    act(() => checkbox(tree, 'Receber 1ª parcela').props.onChange({ target: { checked: false } }));
    assert.equal(patches[0][1].firstSelected, false);
    assert.equal(patches[0][1].secondSelected, false);
    assert.equal(thirteenthSelection({ ...raw, funcao: '0' }, false).second, true);
    act(() => tree.unmount());
});

test('pendência na lista não exibe prévia anterior como definitiva e cancelar conserva entradas', async () => {
    const patches: any[] = [];
    const value = createThirteenthPayroll({ ...input, manualAdiant13: true, adiant13Venc: 3000, adiant13FC: 400 }, calculated, true);
    const raw = { ...input, thirteenthPayroll: value };
    const tree = renderCard(raw, calculated, (...patch) => patches.push(patch));
    act(() => button(tree, 'Personalizar cálculo').props.onClick()); await flush();
    assert.match(textOf(tree.root), /Saldo bruto calculado da 2ª parcelaR\$ 6.600,00/);
    act(() => button(tree, 'Adicionar adiantamento').props.onClick()); await flush();
    assert.match(textOf(tree.root.findByProps({ role: 'alert' })), /identifique a verba/);
    assert.match(textOf(tree.root), /Saldo bruto calculado da 2ª parcela—/);
    act(() => button(tree, 'Cancelar').props.onClick());
    assert.deepEqual(patches, []);
    assert.equal(raw.thirteenthPayroll.advances.length, 2);
    act(() => tree.unmount());
});

test('totais do card e lançamentos do holerite conciliam sem duplicar adiantamentos e abono13', async () => {
    const value = createThirteenthPayroll(input, calculated, true);
    const raw = { ...input, recebeAbono: true, thirteenthPayroll: value };
    const result = await new AgencyCalculationEngine().calculateTotal(mapStateToAgencyParams(raw, 'jmu', config));
    const bd = result.breakdown;
    const state = { ...raw, thirteenthMemory: bd.thirteenthMemory, abonoPerm13: bd.abono13, pss13: bd.pss13, ir13: bd.imposto13, valFunpresp13: bd.funpresp13 };
    const rows = thirteenthPaymentRows(state);
    const credits = rows.filter(row => row.type === 'C').reduce((sum, row) => sum + row.value, 0);
    const debits = rows.filter(row => row.type === 'D').reduce((sum, row) => sum + row.value, 0);
    assert.equal(debits, bd.debitoPrimeiraParcela13);
    assert.equal(Math.round((credits + bd.abono13) * 100), Math.round(bd.gratificacaoNatalina * 100));
    const lines = unifiedThirteenthLines(state);
    const total = (label: string) => lines.find(line => line.label === label)!.value!;
    assert.equal(total('Total 13º salário Bruto 1ª Parcela') + total('Total 13º salário Bruto 2ª Parcela'), total('Total 13º salário Bruto'));
    assert.equal(Math.round((credits + bd.abono13 - debits - bd.pss13 - bd.imposto13 - bd.funpresp13) * 100), Math.round(total('Total 13º salário Líquido 2ª Parcela') * 100));
    assert.equal(lines.filter(line => line.label === 'Abono próprio do 13º (crédito separado)').length, 1);
});

const presetProps = (state: CalculatorState) => {
    const instance = { key: 'teste', presetId: 'decimo' as const };
    const lines = buildPresetGrossLines({ instance, state, courtConfig: config, currentTables: { funcoes: { fc1: 1000 } }, isNovoAQ: false, noFunctionCode: '0', currentFunctionValue: 1000, gratificacaoEspecificaCalculada: 0 });
    return { instance, presetLabel: '13º', reorderMode: false, draggingPreset: null,
        handlePresetDragStart() {}, handlePresetDragOver() {}, handlePresetDrop() {}, handlePresetDragEnd() {}, removePreset() {},
        state, inputState: input, update() {}, styles, isNovoAQ: false, competenciaReferencia: '11/2026', functionKeys: [],
        updateOvertimeEntry() {}, updateSubstitutionEntry() {}, courtConfig: config, lines, calculationReady: true };
};

test('detalhamento e resultados ficam ocultos durante edição e quando cálculo fica indisponível', async () => {
    const props = presetProps(calculated);
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<PresetInstanceCard {...props} />); });
    assert.equal(tree.root.findByType('details').props.open, false);
    act(() => button(tree, 'Personalizar cálculo').props.onClick()); await flush();
    assert.equal(tree.root.findAllByType('details').length, 0);
    assert.equal(tree.root.findAllByProps({ 'aria-label': 'Totais do 13º por parcela' }).length, 0);
    act(() => button(tree, 'Cancelar').props.onClick());
    act(() => tree.update(<PresetInstanceCard {...props} calculationReady={false} />));
    assert.equal(tree.root.findAllByType('dd').length, 0);
    assert.equal(tree.root.findAllByType('details').length, 0);
    const editor = { open: false, onOpen() {}, onClose() {} };
    const labels = () => tree.root.findByType(RubricCardHeading).findAllByType('dt').map(node => node.children.join(''));
    act(() => tree.update(<PresetInstanceCard {...props} editor={editor} />));
    assert.deepEqual(labels(), ['Bruto', 'Líquido']);
    act(() => tree.update(<PresetInstanceCard {...props} editor={{ ...editor, open: true }} />));
    assert.deepEqual(labels(), ['Bruto', 'Líquido']);
    act(() => tree.update(<PresetInstanceCard {...props} editor={editor} calculationReady={false} />));
    assert.deepEqual(labels(), []);
    act(() => tree.unmount());
});

test('card recolhido mostra o saldo do 13º nesta folha após o abatimento do adiantamento', () => {
    const november = { ...calculated, tipoCalculo: 'nov', adiant13Venc: 3000.27, adiant13FC: 0,
        segunda13Venc: 5000.30, segunda13FC: 0, abonoPerm13: 0, ir13: 1200, pss13: 767.43,
        valFunpresp13: 0, debitoPrimeiraParcela13: 3000.27 } satisfies CalculatorState;
    const editor = { open: false, onOpen() {}, onClose() {} };
    const tree = create(<PresetInstanceCard {...presetProps(november)} editor={editor} />);
    const amounts = () => tree.root.findByType(RubricCardHeading).findAllByType('dd')
        .map(node => textOf(node).replace(/\s/g, ' '));

    assert.deepEqual(amounts(), ['R$ 5.000,30', 'R$ 3.032,87']);

    const unified: CalculatorState = { ...november, thirteenthMemory: {
        version: 1, firstSelected: true, secondSelected: true, firstMode: 'informado', secondMode: 'manual',
        firstTotal: november.adiant13Venc, secondTotal: november.segunda13Venc,
        referenceTotal: 8000.57, cargoTotal: 8000.57, functionTotal: 0,
        components: [], groups: [], advances: [], secondEntries: []
    } };
    act(() => tree.update(<PresetInstanceCard {...presetProps(unified)} editor={editor} />));
    assert.deepEqual(amounts(), ['R$ 5.000,30', 'R$ 3.032,87']);

    const advanceOnly = { ...november, tipoCalculo: 'jun', segunda13Venc: 0, ir13: 0, pss13: 0,
        debitoPrimeiraParcela13: 0 } satisfies CalculatorState;
    act(() => tree.update(<PresetInstanceCard {...presetProps(advanceOnly)} editor={editor} />));
    assert.deepEqual(amounts(), ['R$ 3.000,27', 'R$ 3.000,27']);
    act(() => tree.unmount());
});
