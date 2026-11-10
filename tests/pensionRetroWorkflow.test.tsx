import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig, type Rubrica } from '../src/types';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { PensionRetroForm } from '../src/components/Calculator/PensionRetroForm';

const historicalConfig = { enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps', includeThirteenth: true,
    sponsoredRate: { min: .065, max: .085, step: .005, defaultRpc: .085 },
    linkedRate: { min: .065, max: .22, step: .005 }, facultativeRate: { minIfPositive: .025, default: 0 } };
const config = { historico_pss: { anterior: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } },
    previdenciaComplementar: { ...historicalConfig, historicalRules: [{ id: 'regra-documentada', validFrom: '2025-01', validTo: '2027-01',
        source: 'Fonte histórica sintética', tabelaPSS: 'anterior', configuration: historicalConfig }] } } as CourtConfig;
const firstRubric: Rubrica = { id: 'r1', descricao: 'Parcela histórica', tipo: 'C', valor: 1000, incideIR: true, isEA: true,
    incidePSS: false, pssCompetenciaSeparada: true, incideFunpresp: true, funprespCompetenciaSeparada: true };
const secondRubric: Rubrica = { id: 'r2', descricao: 'Outra parcela', tipo: 'C', valor: 400, incideIR: false, isEA: false,
    incidePSS: false, pssCompetenciaSeparada: true, incideFunpresp: false, funprespCompetenciaSeparada: false };
const original = (): CalculatorState => ({ ...INITIAL_STATE, anoRef: 2026, mesRef: 'SETEMBRO', tabelaPSS: 'anterior',
    regimePrev: 'rpc', funprespParticipacao: 'nao', rubricasExtras: [firstRubric, secondRubric], pensionRetroEntries: [] });
const labelControl = (root: ReactTestInstance, text: string, type: 'input' | 'select' = 'input', index = 0) =>
    root.findAllByType('label').filter(label => label.children.some(child => typeof child === 'string' && child.trim() === text))[index].findByType(type);
const click = (root: ReactTestInstance, text: string, index = 0) => act(() => {
    const button = root.findAllByType('button').filter(item => item.children.join('') === text)[index];
    assert.ok(button, `botão ausente: ${text}`); button.props.onClick();
});
const set = (control: ReactTestInstance, value: string) => act(() => control.props.onChange({ target: { value } }));

const setup = (starting: CalculatorState = original(), useConfig = config) => {
    let current!: CalculatorState;
    let changeState!: React.Dispatch<React.SetStateAction<CalculatorState>>;
    let tree!: ReturnType<typeof create>;
    const Harness = () => {
        const [state, setState] = useState(starting);
        current = state; changeState = setState;
        const update = (key: keyof CalculatorState, value: any) => setState(previous => ({ ...previous, [key]: value }));
        const pensionParams = { ...mapStateToAgencyParams(state, 'jmu', useConfig), competencia: '2026-09' };
        return <PensionRetroForm state={state} update={update} styles={{}} pssTableOptions={['anterior']} pensionParams={pensionParams} pensionContexts={null} />;
    };
    act(() => { tree = create(<Harness />); });
    return { get tree() { return tree; }, get state() { return current; }, changeState };
};

test('cadastro e distribuição compartilham os valores sem herdar o regime atual', () => {
    const probe = setup(); const root = probe.tree.root;
    const details = root.findByType('details');
    assert.equal(details.props.id, 'pension-retro-form'); assert.equal(details.props.open, true);
    click(root, 'Adicionar competência');
    const initial = probe.state.pensionRetroEntries![0];
    assert.deepEqual({ competencia: initial.competencia, tipo: initial.tipo, modo: initial.modo, vinculos: initial.vinculos },
        { competencia: '', tipo: 'mensal', modo: 'completo', vinculos: [] });
    assert.equal(initial.regimePrev, undefined); assert.equal(initial.participacao, undefined); assert.equal(initial.destinoIR, undefined);
    set(root.findByProps({ 'aria-label': 'Regime na competência' }), 'antigo');
    set(root.findByProps({ 'aria-label': 'Participação na competência' }), 'vinculado');
    assert.equal(probe.state.pensionRetroEntries![0].regimePrev, 'antigo');
    assert.equal(probe.state.pensionRetroEntries![0].participacao, 'vinculado');
    set(labelControl(root, 'Competência original'), '2025-06');
    set(root.findByProps({ 'aria-label': 'Regra histórica da Funpresp' }), 'regra-documentada');
    assert.equal(probe.state.pensionRetroEntries![0].tabelaPSS, 'anterior');
    set(labelControl(root, 'Base RPPS já paga'), '3000');
    set(labelControl(root, 'Remuneração integral elegível Funpresp já paga'), '4000');
    click(root, 'Vincular rubrica');
    set(root.findByProps({ 'aria-label': 'Rubrica 1 da competência 1' }), 'r1');
    set(root.findByProps({ 'aria-label': 'Valor do vínculo 1 da competência 1' }), '600');
    click(root, 'Vincular rubrica');
    set(root.findByProps({ 'aria-label': 'Rubrica 2 da competência 1' }), 'r2');
    set(root.findByProps({ 'aria-label': 'Valor do vínculo 2 da competência 1' }), '400');
    assert.match(root.findByProps({ 'aria-label': 'Base RPPS corrigida total' }).props.value, /4\.000,00/);
    assert.match(root.findByProps({ 'aria-label': 'Remuneração integral elegível Funpresp corrigida total' }).props.value, /4\.600,00/);
    assert.equal(probe.state.pensionRetroEntries![0].baseRppsDevida, undefined);
    assert.equal(probe.state.pensionRetroEntries![0].baseComplementarDevida, undefined);
    click(root, 'Adicionar competência');
    assert.equal(probe.state.pensionRetroEntries!.length, 2);
    click(root, 'Vincular rubrica', 1);
    set(root.findByProps({ 'aria-label': 'Rubrica 1 da competência 2' }), 'r1');
    set(root.findByProps({ 'aria-label': 'Valor do vínculo 1 da competência 2' }), '400');
    assert.match(JSON.stringify(probe.tree.toJSON()), /1\.000,00.*1\.000,00/);
    assert.equal(probe.state.pensionRetroEntries![0].vinculos![0].valor, 600);
    click(root, 'Remover vínculo 1', 1);
    assert.deepEqual(probe.state.pensionRetroEntries![1].vinculos, []);
    assert.equal(probe.state.pensionRetroEntries![0].vinculos!.length, 2);
    assert.equal(probe.state.pensionRetroEntries![0].participacao, 'vinculado');
    act(() => probe.tree.unmount());
});

test('regra ausente mantém escolhas preenchíveis e não copia parâmetros atuais', () => {
    const noHistory = { ...config, previdenciaComplementar: { ...historicalConfig } } as CourtConfig;
    const probe = setup(original(), noHistory); const root = probe.tree.root;
    click(root, 'Adicionar competência');
    set(labelControl(root, 'Competência original'), '2025-06');
    assert.match(JSON.stringify(probe.tree.toJSON()), /Não há regra histórica cadastrada/);
    set(root.findByProps({ 'aria-label': 'Regime na competência' }), 'rpc');
    set(root.findByProps({ 'aria-label': 'Participação na competência' }), 'patrocinado');
    assert.equal(probe.state.pensionRetroEntries![0].regraHistoricaId, undefined);
    assert.equal(probe.state.pensionRetroEntries![0].tabelaPSS, undefined);
    assert.equal(probe.state.pensionRetroEntries![0].aliquotaNormal, undefined);
    assert.equal(probe.state.pensionRetroEntries![0].participacao, 'patrocinado');
    act(() => probe.tree.unmount());
});

test('vínculo órfão continua editável, e seleção histórica incompatível nunca é apagada', () => {
    const state = { ...original(), pensionRetroEntries: [{ id: 'r', competencia: '2025-06', modo: 'completo' as const,
        tipo: 'mensal' as const, regimePrev: 'antigo' as const, participacao: 'patrocinado' as const,
        vinculos: [{ rubricaId: 'removida', valor: 100 }] }] };
    const probe = setup(state);
    assert.equal(probe.state.pensionRetroEntries![0].participacao, 'patrocinado');
    assert.match(JSON.stringify(probe.tree.toJSON()), /Rubrica indisponível/);
    assert.deepEqual(probe.state.pensionRetroEntries![0].vinculos, [{ rubricaId: 'removida', valor: 100 }]);
    click(probe.tree.root, 'Remover vínculo 1');
    assert.deepEqual(probe.state.pensionRetroEntries![0].vinculos, []);
    assert.equal(probe.state.pensionRetroEntries![0].participacao, 'patrocinado');
    act(() => probe.tree.unmount());
});
