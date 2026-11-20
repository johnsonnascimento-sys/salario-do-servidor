import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create, ReactTestInstance } from 'react-test-renderer';
import { DailiesCard } from '../src/components/Calculator/cards/DailiesCard';
import { PresetInstanceCard } from '../src/components/Calculator/PresetInstanceCard';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { getDailiesPresentation } from '../src/components/Calculator/dailiesPresentation';
import { styles } from '../src/components/Calculator/styles';
import { calculateDailies } from '../src/services/agency/engine/modules/dailiesCalculations';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { CalculatorState, CourtConfig, INITIAL_STATE } from '../src/types';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';

// Synthetic configuration; exercises the real module without live data or official amounts.
const config: CourtConfig = { orgSlug: 'jmu', bases: { salario: { analista: { A1: 6000 } }, funcoes: {} },
    values: {}, historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
    historico_ir: { teste: 0 },
    payrollRules: { gajRate: .5, specificGratificationRate: 0, vrRateOnCj1: 0, monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 20, transportDiscountRate: .06, irrfTopRate: .1 },
    dailies: { rates: { analista: 100, tecnico: 80, cj: 120, juiz: 180 }, embarkationAdditional: { completo: 80, metade: 40 },
        embarkationLabel: 'Adicional de teste', externalGloss: { hospedagem: .2, alimentacao: .1, transporte: .1 },
        discountRules: { foodDivisor: 20, transportDivisor: 20, excludeWeekendsAndHolidays: true, holidays: [], halfDailyOnBusinessReturnDay: true, halfDiscountOnBusinessReturnDay: true },
        normativeInfo: { localRuleLabel: 'Norma local de teste', generalRuleLabel: 'Norma geral de teste', notes: ['Observação de teste'] } },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} }
};
const input = (patch: Partial<CalculatorState> = {}): CalculatorState => ({ ...INITIAL_STATE,
    cargo: 'analista', padrao: 'A1', funcao: '0', periodo: 0, tipoCalculo: 'comum', regimePrev: 'antigo', tabelaPSS: 'teste', tabelaIR: 'teste',
    funprespParticipacao: 'nao', diariasModoDesconto: 'manual', diariasQtd: 2, diariasEmbarque: 'completo',
    diariasDescontarAlimentacao: false, diariasDescontarTransporte: false, ...patch });
const textOf = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : textOf(child)).join('');
const button = (tree: ReturnType<typeof create>, name: string) => tree.root.findAllByType('button').find(node => textOf(node) === name)!;
const check = (tree: ReturnType<typeof create>, name: string) => tree.root.findAllByType('label').find(node => textOf(node) === name)!.findByType('input');
const flush = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); };
const linesFor = (state: CalculatorState, court = config) => buildPresetGrossLines({ instance: { presetId: 'diarias', key: 'diarias' }, state, courtConfig: court,
    currentTables: { funcoes: {} }, isNovoAQ: false, noFunctionCode: '0', currentFunctionValue: 0, gratificacaoEspecificaCalculada: 0 });
function setup(raw = input(), court: CourtConfig | null = config) {
    const patches: any[] = [];
    let tree!: ReturnType<typeof create>;
    const props = { state: { ...raw, diariasBruto: 280, diariasValorTotal: 280 }, inputState: raw,
        update: (...patch: any[]) => patches.push(patch), styles, courtConfig: court, calculationReady: true, competenciaReferencia: '11/2026' };
    act(() => { tree = create(<DailiesCard {...props} />); });
    return { tree, patches, raw, props };
}

test('card mantém só campos essenciais; abrir/cancelar preserva snapshot e escolhas', async () => {
    const { tree, patches } = setup(input({ diariasTrechosTransporte: ['residual'] }));
    assert.equal(tree.root.findAllByType('select').length, 0);
    assert.equal(tree.root.findAllByProps({ type: 'checkbox' }).length, 0);
    assert.match(textOf(tree.root), /Total diárias líquidasR\$\s*280,00/);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(tree.root.findAllByProps({ type: 'radio' }).length, 0);
    assert.doesNotMatch(textOf(tree.root), /Quantidade de diárias|Data de início|Data de fim/);
    await flush();
    act(() => check(tree, 'Hospedagem fornecida').props.onChange({ target: { checked: true } }));
    await flush();
    assert.match(textOf(tree.root), /Total diárias líquidasR\$\s*240,00/);
    assert.deepEqual(patches, []);
    act(() => button(tree, 'Cancelar').props.onClick());
    assert.equal(tree.root.findAllByProps({ type: 'radio' }).length, 2);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(check(tree, 'Hospedagem fornecida').props.checked, false);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, []);
    act(() => tree.unmount());
});

test('aplicar grava só entradas alteradas, sem resultados ou campos externos', async () => {
    const { tree, patches } = setup();
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    act(() => check(tree, 'Alimentação fornecida').props.onChange({ target: { checked: true } }));
    await flush();
    assert.match(textOf(tree.root), /Total diárias líquidasR\$\s*260,00/);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(patches, [['diariasExtAlimentacao', true]]);
    act(() => tree.unmount());
});

test('equipe e assessoramento são exclusivos; magistrado não oferece essas condições', () => {
    const { tree, patches } = setup();
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    act(() => check(tree, 'Deslocamento em equipe de trabalho').props.onChange({ target: { checked: true } }));
    assert.equal(check(tree, 'Assessoramento direto / segurança a magistrado').props.checked, false);
    act(() => check(tree, 'Assessoramento direto / segurança a magistrado').props.onChange({ target: { checked: true } }));
    assert.equal(check(tree, 'Deslocamento em equipe de trabalho').props.checked, false);
    assert.doesNotMatch(textOf(tree.root), /Membro de TRF|Membro do CJF/);
    act(() => check(tree, 'Acompanhamento em tempo integral e hospedagem no mesmo local').props.onChange({ target: { checked: true } }));
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.ok(patches.some(([field, value]) => field === 'diariasAcompanhamentoIntegral' && value === true));
    act(() => tree.unmount());
    const magistrate = setup(input({ cargo: 'Juiz Federal' }));
    act(() => button(magistrate.tree, 'Personalizar cálculo').props.onClick());
    assert.doesNotMatch(textOf(magistrate.tree.root), /Condições da viagem/);
    act(() => magistrate.tree.unmount());
});

test('datas, meia diária, feriado e dias manuais preservam cálculo e validações', async () => {
    const raw = input({ diariasModoDesconto: 'periodo', diariasDataInicio: '2026-11-13', diariasDataFim: '2026-11-16', diariasDescontarAlimentacao: true, auxAlimentacao: 200 });
    const { tree, patches } = setup(raw);
    assert.match(textOf(tree.root), /4 dias no calendário · 3,5 diárias pagas · meia diária no retorno/);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(tree.root.findAllByProps({ type: 'date' }).length, 0);
    const holiday = tree.root.findAllByType('button').find(node => textOf(node).includes('16/11/2026'))!;
    act(() => holiday.props.onClick());
    await flush();
    assert.match(textOf(tree.root), /Dias usados no desconto: 1\./);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.equal(tree.root.findAllByProps({ type: 'date' }).length, 2);
    assert.deepEqual(patches, [['diariasFeriados', ['2026-11-16']]]);
    const start = tree.root.findAllByProps({ type: 'date' })[0];
    act(() => start.props.onChange({ target: { value: '2026-11-20' } }));
    assert.ok(patches.some(([field, value]) => field === 'diariasDataFim' && value === '2026-11-20'));
    act(() => tree.unmount());
    const manual = setup(input({ diariasQtd: .5, diariasDescontarAlimentacao: true, diariasDiasDescontoAlimentacao: .5 }));
    act(() => button(manual.tree, 'Personalizar cálculo').props.onClick());
    const numbers = manual.tree.root.findAllByProps({ type: 'number' });
    assert.ok(numbers.every(node => node.props.min === '0' && node.props.step === '0.5'));
    act(() => numbers[0].props.onChange({ target: { value: '-2' } }));
    act(() => button(manual.tree, 'Aplicar ajustes').props.onClick());
    assert.deepEqual(manual.patches, [['diariasDiasDescontoAlimentacao', 0]]);
    act(() => manual.tree.unmount());
});

test('prévia invalida valor anterior ao editar ou perder configuração', async () => {
    const { tree, props } = setup();
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    await flush();
    assert.match(textOf(tree.root), /280,00/);
    act(() => tree.root.findByType('select').props.onChange({ target: { value: 'metade' } }));
    assert.doesNotMatch(textOf(tree.root), /280,00/);
    await flush();
    assert.match(textOf(tree.root), /240,00/);
    act(() => tree.update(<DailiesCard {...props} courtConfig={null} />));
    assert.doesNotMatch(textOf(tree.root), /240,00/);
    assert.match(textOf(tree.root), /Aguarde o carregamento/);
    act(() => tree.unmount());
});

test('wrapper recolhe detalhe, transfere normas ao ?, e oculta resultados durante edição/recálculo', () => {
    const raw = input({ diariasBruto: 280, diariasValorTotal: 280 });
    const props: any = { instance: { key: 'diarias', presetId: 'diarias' }, presetLabel: 'Diárias', reorderMode: false, draggingPreset: null,
        handlePresetDragStart() {}, handlePresetDragOver() {}, handlePresetDrop() {}, handlePresetDragEnd() {}, removePreset() {},
        state: raw, inputState: raw, update() {}, styles, courtConfig: config, lines: linesFor(raw), calculationReady: true, functionKeys: [], updateOvertimeEntry() {}, updateSubstitutionEntry() {} };
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<PresetInstanceCard {...props} />); });
    assert.doesNotMatch(textOf(tree.root), /Resumo calculado|Memória e fundamentos|Norma local de teste/);
    assert.match(textOf(tree.root), /Ver detalhamento do cálculo/);
    assert.equal(tree.root.findByType('details').props.open, false);
    act(() => tree.root.findByProps({ 'aria-label': 'Informações sobre Diárias de Viagem' }).props.onClick());
    assert.match(textOf(tree.root), /Norma local de teste.*Norma geral de teste.*Observação de teste/);
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    assert.equal(tree.root.findAllByType('details').length, 0);
    act(() => button(tree, 'Cancelar').props.onClick());
    act(() => tree.update(<PresetInstanceCard {...props} calculationReady={false} />));
    assert.equal(tree.root.findAllByType('details').length, 0);
    assert.doesNotMatch(textOf(tree.root), /280,00/);
    act(() => tree.unmount());
});

test('JMU ignora trechos vazios/residuais; JF concilia motor, resumo e resultado/exportação em 0..4 trechos', async () => {
    for (const org of ['jmu', 'stm', 'cjf', 'trf1']) {
        const court = { ...config, orgSlug: org };
        for (let count = 0; count <= 4; count++) {
            const raw = input({ diariasTrechosTransporte: ['afastamento_origem', 'afastamento_destino', 'retorno_origem', 'retorno_destino'].slice(0, count),
                diariasEmbarque: count === 4 ? 'completo' : count ? 'metade' : 'completo' });
            const expectedAdditional = ['jmu', 'stm'].includes(org) ? raw.diariasEmbarque === 'completo' ? 80 : 40 : count * 20;
            const result = await calculateDailies(mapStateToAgencyParams(raw, org, court));
            assert.equal(result.bruto, 200 + expectedAdditional);
            const calculated = { ...raw, diariasBruto: result.bruto, diariasValorTotal: result.valor };
            assert.equal(getDailiesPresentation(raw, court).additional, expectedAdditional);
            const lines = linesFor(calculated, court);
            assert.equal(lines.find(line => line.label === 'Adicional de teste')!.value, expectedAdditional);
            assert.equal(lines.find(line => line.label === 'Total diárias líquidas')!.value, result.valor);
            let latest!: ReturnType<typeof useCalculatorResults>;
            const engine = new AgencyCalculationEngine();
            const agency = { slug: org, name: org, type: 'judiciary' };
            function Harness() { latest = useCalculatorResults(raw, engine, court, agency); return null; }
            let tree!: ReturnType<typeof create>;
            await act(async () => { tree = create(<Harness />); });
            assert.equal(latest.calculationStatus, 'ready', latest.calculationError || '');
            const additional = latest.dailiesResultRows.find(row => row.label === 'ADICIONAL DE TESTE (DIÁRIAS)');
            assert.equal(additional?.value || 0, expectedAdditional);
            assert.equal(latest.dailiesResultRows.filter(row => row.type === 'C').reduce((sum, row) => sum + row.value, 0), result.bruto);
            act(() => tree.unmount());
        }
    }
});

test('resumo das diárias e restituição usam o desconto líquido calculado para o retorno', async () => {
    const raw = input({
        auxTransporteGasto: 640, diariasEmbarque: 'nenhum', diariasDescontarTransporte: true,
        diariasModoDesconto: 'periodo', diariasDataInicio: '2026-11-09', diariasDataFim: '2026-11-10'
    });
    for (const org of ['jmu', 'cjf']) {
        const court = { ...config, orgSlug: org };
        const engine = new AgencyCalculationEngine();
        const agency = { slug: org, name: org, type: 'judiciary' };
        let latest!: ReturnType<typeof useCalculatorResults>;
        function Harness() { latest = useCalculatorResults(raw, engine, court, agency); return null; }
        let tree!: ReturnType<typeof create>;
        await act(async () => { tree = create(<Harness />); });
        assert.equal(latest.calculationStatus, 'ready', latest.calculationError || '');
        const lines = linesFor(latest.effectiveState, court);
        assert.equal(lines.find(line => line.label === 'Desconto aux. transporte (diária inteira)')?.value, 20);
        assert.equal(lines.find(line => line.label === 'Desconto aux. transporte (meia diária)')?.value, 10);
        assert.equal(latest.dailiesResultRows.find(row => row.label === 'RESTITUIÇÃO AUX. TRANSP. (DIÁRIAS)')?.value, 30);
        act(() => tree.unmount());
    }
});

test('ausência legada de trechos na JF preserva seletor; [] explícito significa nenhum', async () => {
    const court = { ...config, orgSlug: 'cjf' };
    for (const [selection, expected] of [['completo', 80], ['metade', 40], ['nenhum', 0]] as const) {
        const legacy = JSON.parse(JSON.stringify(input({ diariasEmbarque: selection, diariasTrechosTransporte: undefined })));
        const raw = hydrateCalculatorState(legacy);
        assert.equal((await calculateDailies(mapStateToAgencyParams(raw, 'cjf', court))).bruto, 200 + expected);
        assert.equal(getDailiesPresentation(raw, court).additional, expected);
        const restored = hydrateCalculatorState(JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(raw))));
        assert.equal((await calculateDailies(mapStateToAgencyParams(restored, 'cjf', court))).bruto, 200 + expected);
    }
    assert.equal(getDailiesPresentation(hydrateCalculatorState(input({ diariasTrechosTransporte: [] })), court).additional, 0);
    for (const selection of ['completo', 'metade', 'nenhum'] as const) {
        for (const legs of [[], ['residual']]) {
            const raw = input({ diariasEmbarque: selection, diariasTrechosTransporte: legs });
            assert.equal((await calculateDailies(mapStateToAgencyParams(raw, 'jmu', config))).bruto, 200 + ({ completo: 80, metade: 40, nenhum: 0 }[selection]));
        }
    }
});

test('editor JF mantém trechos independentes e autoridades do ramo', async () => {
    const { tree, patches } = setup(input(), { ...config, orgSlug: 'cjf' });
    act(() => button(tree, 'Personalizar cálculo').props.onClick());
    act(() => check(tree, 'Ida: residência ou trabalho → embarque').props.onChange({ target: { checked: true } }));
    await flush();
    assert.match(textOf(tree.root), /Adicional de teste: R\$\s*20,00/);
    act(() => check(tree, 'Assessoramento direto / segurança a magistrado').props.onChange({ target: { checked: true } }));
    assert.match(textOf(tree.root), /Membro de TRF|Membro do CJF/);
    assert.doesNotMatch(textOf(tree.root), /Ministro do STM/);
    act(() => button(tree, 'Aplicar ajustes').props.onClick());
    assert.ok(patches.some(([field, value]) => field === 'diariasTrechosTransporte' && value.length === 1));
    act(() => tree.unmount());
});
