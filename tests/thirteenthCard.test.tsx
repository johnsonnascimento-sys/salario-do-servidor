import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { ThirteenthCard } from '../src/components/Calculator/cards/ThirteenthCard';
import { PresetInstanceCard } from '../src/components/Calculator/PresetInstanceCard';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { INITIAL_STATE, CalculatorState, CourtConfig } from '../src/types';
import type { PensionCalculationMemory } from '../src/types/pension';
import { styles } from '../src/components/Calculator/styles';

const config = {
    bases: { salario: { analista: { A1: 6000 } }, funcoes: { fc1: 1000 } },
    payrollRules: { vrRateOnCj1: 0 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} }
} as CourtConfig;
const input = { ...INITIAL_STATE, funcao: 'fc1', periodo: 0, vencimento: 6000, gaj: 3000,
    adiant13Venc: 1, adiant13FC: 1, segunda13Venc: 1, segunda13FC: 1 };
const calculated = { ...input, adiant13Venc: 4500, adiant13FC: 500, segunda13Venc: 4500,
    segunda13FC: 500, ir13: 400, pss13: 900 };
const textOf = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
const button = (tree: ReturnType<typeof create>, name: string) => tree.root.findAllByType('button').find(node => textOf(node) === name)!;
const checkbox = (tree: ReturnType<typeof create>, label: string) => tree.root.findAllByType('label').find(node => textOf(node).includes(label))!.findByType('input');

test('personalização cancela o rascunho e aplica somente os campos do 13º alterados', () => {
    const patches: unknown[] = [];
    const manual: CalculatorState = { ...input, manualAdiant13: true, adiant13Venc: 3000, segunda13Venc: 1,
        recebeAbono: true, abonoPermanencia: 900,
        rubricasExtras: [{ id: 'credito', descricao: 'Crédito de teste', tipo: 'C', valor: 123, incideIR: false, incidePSS: false, isEA: false }] };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<ThirteenthCard state={{ ...calculated, ...manual, segunda13Venc: 6000 }} inputState={manual}
        update={(...patch) => patches.push(patch)} styles={styles} courtConfig={config} competenciaReferencia="11/2026" />); });
    assert.equal(tree!.root.findAllByType('section').length, 0);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(checkbox(tree, 'Informar valor da 2ª parcela (cargo efetivo)').props.checked, false);
    act(() => checkbox(tree, 'Crédito de teste').props.onChange({ target: { checked: true } }));
    act(() => checkbox(tree, 'Abono de Permanência').props.onChange({ target: { checked: false } }));
    assert.deepEqual(patches, []);
    act(() => button(tree, 'Cancelar').props.onClick());
    assert.deepEqual(patches, []);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(checkbox(tree, 'Crédito de teste').props.checked, false);
    assert.equal(checkbox(tree, 'Abono de Permanência').props.checked, true);
    act(() => checkbox(tree, 'Crédito de teste').props.onChange({ target: { checked: true } }));
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, [['decimoRubricasInclusas', { credito: true }]]);
    act(() => tree.unmount());
});

test('editar a composição não grava resultados calculados como entradas manuais', () => {
    const patches: unknown[] = [];
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<ThirteenthCard state={calculated} inputState={input} update={(...patch) => patches.push(patch)}
        styles={styles} courtConfig={config} competenciaReferencia="11/2026" />); });
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    act(() => checkbox(tree, 'GAJ').props.onChange({ target: { checked: false } }));
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, [['decimoIncideGAJ', false]]);
    act(() => tree.unmount());
});

test('ativar edição do adiantamento em snapshot automático mantém a segunda parcela automática', () => {
    const patches: unknown[] = [];
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<ThirteenthCard state={calculated} inputState={calculated}
        update={(...patch) => patches.push(patch)} styles={styles} courtConfig={config} competenciaReferencia="11/2026" />); });
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    act(() => checkbox(tree, 'Informar o adiantamento recebido').props.onChange({ target: { checked: true } }));
    assert.equal(checkbox(tree, 'Informar valor da 2ª parcela (cargo efetivo)').props.checked, false);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, [['manualAdiant13', true], ['segunda13Venc', 1], ['segunda13FC', 1]]);
    act(() => tree.unmount());
});

test('seleção da segunda parcela ativa apenas o adiantamento correspondente e esconde FC/CJ ausente', () => {
    const patches: unknown[] = [];
    let tree: ReturnType<typeof create>;
    const props = { state: { ...input, adiant13Venc: 0, segunda13Venc: 0 }, update: (...patch: unknown[]) => patches.push(patch), styles,
        courtConfig: config, competenciaReferencia: '11/2026' };
    act(() => { tree = create(<ThirteenthCard {...props} />); });
    act(() => tree.root.findAllByType('fieldset')[1].findAllByType('input')[0].props.onChange({ target: { checked: true } }));
    assert.deepEqual(patches, [['adiant13Venc', 1], ['segunda13Venc', 1]]);
    act(() => tree.update(<ThirteenthCard {...props} state={{ ...input, funcao: '0' }} />));
    assert.equal(tree.root.findAllByType('input').length, 2);
    act(() => tree.unmount());
});

test('edição manual restaura valores individuais do snapshot e permite retornar ao saldo automático', () => {
    const patches: unknown[] = [];
    const manual = { ...input, manualAdiant13: true, adiant13Venc: 3000, adiant13FC: 400, segunda13Venc: 5500, segunda13FC: 1 };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<ThirteenthCard state={{ ...manual, segunda13FC: 600 }} inputState={manual}
        update={(...patch) => patches.push(patch)} styles={styles} courtConfig={config} competenciaReferencia="11/2026" />); });
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(checkbox(tree, 'Informar valor da 2ª parcela (cargo efetivo)').props.checked, true);
    assert.equal(checkbox(tree, 'Informar valor da 2ª parcela (FC/CJ)').props.checked, false);
    act(() => checkbox(tree, 'Informar valor da 2ª parcela (cargo efetivo)').props.onChange({ target: { checked: false } }));
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, [['segunda13Venc', 1]]);
    act(() => tree.unmount());
});

test('card compartilha totais com detalhamento, oculta resultados durante edição e pendência e mantém memória previdenciária', () => {
    const instance = { key: 'teste', presetId: 'decimo' as const };
    const lines = buildPresetGrossLines({ instance, state: calculated, courtConfig: config, currentTables: { funcoes: { fc1: 1000 } },
        isNovoAQ: true, noFunctionCode: '0', currentFunctionValue: 1000, gratificacaoEspecificaCalculada: 0 });
    const memory: PensionCalculationMemory = {
        competencia: '2026-11', tipo: '13', participacao: 'patrocinado', teto: 5000,
        baseRppsIntegral: 9000, baseRpps: 5000, baseComplementarIntegral: 9000, baseComplementar: 4000,
        aliquotaNormal: 0.085, aliquotaFacultativa: 0, normal: 340, facultativa: 0, facultativaExterna: 0,
        aporteFolha: 0, aporteExterno: 0, patrocinador: 340, descontoFolha: 340, dedutivelIRFolha: 340,
        deducaoSujeitaLimiteAnual: 0, componentes: {}
    };
    const props = { instance, presetLabel: '13º', reorderMode: false, draggingPreset: null,
        handlePresetDragStart() {}, handlePresetDragOver() {}, handlePresetDrop() {}, handlePresetDragEnd() {}, removePreset() {},
        state: { ...calculated, pensionMemory: { mensal: memory, thirteenth: memory, retroativos: [] } }, inputState: input, update() {}, styles, isNovoAQ: true, competenciaReferencia: '11/2026', functionKeys: [],
        updateOvertimeEntry() {}, updateSubstitutionEntry() {}, courtConfig: config, lines, calculationReady: true };
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<PresetInstanceCard {...props} />); });
    const overview = tree.root.findByProps({ 'aria-label': 'Totais do 13º por parcela' });
    assert.deepEqual(overview.findAllByType('dd').map(textOf), ['R$ 5.000,00', 'R$ 5.000,00', 'R$ 5.000,00', 'R$ 3.700,00']);
    assert.equal(tree.root.findByType('details').props.open, false);
    assert.equal(tree.root.findAllByProps({ 'aria-label': 'Resumo compartilhado da Funpresp' }).length, 1);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(tree.root.findAllByType('details').length, 0);
    assert.equal(tree.root.findAllByProps({ 'aria-label': 'Totais do 13º por parcela' }).length, 0);
    act(() => button(tree, 'Cancelar').props.onClick());
    assert.equal(tree.root.findAllByType('details').length, 1);
    act(() => tree.update(<PresetInstanceCard {...props} calculationReady={false} />));
    assert.equal(tree.root.findAllByType('dd').length, 0);
    assert.equal(tree.root.findAllByProps({ 'aria-label': 'Resumo compartilhado da Funpresp' }).length, 0);
    assert.equal(tree.root.findAllByType('details').length, 0);
    assert.match(textOf(tree.root.findByProps({ role: 'status' })), /Aguardando cálculo/);
    act(() => tree.unmount());
});
