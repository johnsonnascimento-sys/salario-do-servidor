import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useCallback, useState } from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, CalculatorState, CourtConfig } from '../src/types';
import type { PayslipResultRow } from '../src/types/user';
import {
    CALCULATED_STATE_KEYS,
    PERSISTED_CALCULATED_INPUT_KEYS,
    hydrateCalculatorState,
    stripCalculatedFieldsFromCalculatorState,
} from '../src/utils/calculatorState';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { hasPresetValue } from '../src/components/Calculator/dynamicPayrollForm.helpers';
import { useDynamicPresetInstances } from '../src/components/Calculator/hooks/useDynamicPresetInstances';
import { usePayrollFormNormalization } from '../src/components/Calculator/hooks/usePayrollFormNormalization';
import { GlobalSettings } from '../src/components/Calculator/GlobalSettings';

// Synthetic configuration: these numbers are test data, not official rates.
const config: CourtConfig = {
    bases: { salario: { teste: { A1: 6000 } }, funcoes: { fc1: 1000, cj1: 2000 } },
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
    historico_ir: { teste: 100 },
    historico_ir_brackets: {},
    values: { deducao_dep: 100 },
    payrollRules: {
        gajRate: 0.5, specificGratificationRate: 0.1, vrRateOnCj1: 0.1,
        monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22,
        transportDiscountRate: 0.06, irrfTopRate: 0.2,
    },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
};
const engine = new AgencyCalculationEngine();
const baseState = (): CalculatorState => hydrateCalculatorState({
    ...INITIAL_STATE, cargo: 'teste', padrao: 'A1', funcao: 'fc1',
    mesRef: 'NOVEMBRO', anoRef: 2026, tabelaPSS: 'teste', tabelaIR: 'teste',
    auxAlimentacao: 1000,
});
const calculate = (state: CalculatorState) => engine.calculateTotal(mapStateToAgencyParams(state, 'jmu', config));
const roundTrip = (state: CalculatorState) => hydrateCalculatorState(
    JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(state)))
);
const legacySnapshot = (state: CalculatorState) => {
    const snapshot = stripCalculatedFieldsFromCalculatorState(state);
    PERSISTED_CALCULATED_INPUT_KEYS.forEach((key) => delete snapshot[key]);
    return snapshot;
};
const resultRows = (breakdown: Record<string, number>): PayslipResultRow[] => [
    { label: 'ADICIONAL 1/3 FÉRIAS', value: breakdown.feriasConstitucional, type: 'C' },
    { label: 'ADICIONAL 1/3 DE FÉRIAS (ANTECIPADO)', value: breakdown.feriasDesconto, type: 'D' },
    { label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA ATIVO EC', value: breakdown.adiant13Venc, type: 'C' },
    { label: 'GRATIFICACAO NATALINA-ADIANT. 1a PARCELA FC/CJ ATIVO EC', value: breakdown.adiant13FC, type: 'C' },
    { label: 'GRATIFICACAO NATALINA-2a PARCELA ATIVO EC', value: breakdown.segunda13Venc, type: 'C' },
    { label: 'GRATIFICACAO NATALINA-2a PARCELA FC/CJ ATIVO EC', value: breakdown.segunda13FC, type: 'C' },
].filter((row) => row.value > 0) as PayslipResultRow[];

const scenarios: Array<[string, Partial<CalculatorState>]> = [
    ['13º automático selecionado em novembro (tipo comum)', { adiant13Venc: 1, adiant13FC: 1, segunda13Venc: 1, segunda13FC: 1 }],
    ['13º manual de novembro', { manualAdiant13: true, adiant13Venc: 4500, adiant13FC: 500, segunda13Venc: 4100, segunda13FC: 450 }],
    ['tipo novembro automático', { tipoCalculo: 'nov' }],
    ['férias automáticas', { ferias1_3: 1 }],
    ['férias manuais', { manualFerias: true, ferias1_3: 3773.86 }],
    ['desconto manual de férias antecipadas', { ferias1_3: 1, feriasAntecipadas: true, feriasDescManual: true, feriasDesc: 1200 }],
];
for (const [name, patch] of scenarios) {
    test(`salvar/reabrir mantém cálculo: ${name}`, async () => {
        const state = { ...baseState(), ...patch };
        assert.deepEqual(await calculate(roundTrip(state)), await calculate(state));
    });
    test(`snapshot antigo recupera cálculo: ${name}`, async () => {
        const state = { ...baseState(), ...patch };
        const original = await calculate(state);
        const restored = hydrateCalculatorState(legacySnapshot(state), resultRows(original.breakdown));
        assert.deepEqual(await calculate(restored), original);
        assert.equal(restored.manualAdiant13, state.manualAdiant13);
        assert.equal(restored.manualFerias, state.manualFerias);
        assert.equal(restored.feriasDescManual, state.feriasDescManual);
    });
}

test('serializer mantém entradas, remove apenas resultados e não altera o original', () => {
    const state = { ...baseState(), ferias1_3: 1, segunda13Venc: 1, gratEspecificaValor: 123, liquido: 999 };
    const snapshot = stripCalculatedFieldsFromCalculatorState(state);
    for (const key of CALCULATED_STATE_KEYS) {
        assert.equal(Object.hasOwn(snapshot, key), PERSISTED_CALCULATED_INPUT_KEYS.some((input) => input === key));
    }
    assert.equal(snapshot.ferias1_3, 1);
    assert.equal(snapshot.gratEspecificaValor, 123);
    assert.equal(state.liquido, 999);
});

test('recuperação respeita zero explícito, tipo da rubrica e não modifica o snapshot', () => {
    const snapshot = { manualAdiant13: true, segunda13Venc: 0 };
    const rows: PayslipResultRow[] = [
        { label: 'GRATIFICACAO NATALINA-2a PARCELA ATIVO EC', value: 4500, type: 'C' },
        { label: 'GRATIFICACAO NATALINA-2a PARCELA FC/CJ ATIVO EC', value: 500, type: 'D' },
        { label: 'ADICIONAL 1/3 FÉRIAS', value: NaN, type: 'C' },
    ];
    const restored = hydrateCalculatorState(snapshot, rows);
    assert.equal(restored.segunda13Venc, 0);
    assert.equal(restored.segunda13FC, 0);
    assert.equal(restored.ferias1_3, 0);
    assert.deepEqual(snapshot, { manualAdiant13: true, segunda13Venc: 0 });
});

test('hidratação mantém instâncias, incidências, valores manuais e independência do snapshot', () => {
    const state = baseState();
    state.overtimeEntries = [
        { id: 'he1', qtd50: 3, qtd100: 2, isEA: true, excluirIR: false, usarSubstituicaoFuncao: true, horasPorFuncao: { fc1: { qtd50: 3, qtd100: 2 } } },
        { id: 'he2', qtd50: 0, qtd100: 0, isEA: false, excluirIR: false },
    ];
    state.substitutionEntries = [{ id: 's1', dias: { fc1: 8 }, isEA: false, excluirIR: true, pssIsEA: true }];
    state.rubricasExtras = [{ id: 'r1', descricao: 'Manual', valor: 200, tipo: 'C', incideIR: true, incidePSS: true, isEA: false, pssCompetenciaSeparada: false }];
    const restored = roundTrip(state);
    assert.deepEqual(restored.overtimeEntries, state.overtimeEntries);
    assert.deepEqual(restored.substitutionEntries, state.substitutionEntries);
    assert.deepEqual(restored.rubricasExtras, state.rubricasExtras);
    restored.substitutionEntries[0].dias.fc1 = 1;
    assert.equal(state.substitutionEntries[0].dias.fc1, 8);
});

test('cards são identificados pelas entradas antes do resultado assíncrono', () => {
    const state = baseState();
    state.segunda13Venc = 1;
    assert.equal(hasPresetValue('decimo', state), true);
    assert.equal(hasPresetValue('decimo', { ...baseState(), tipoCalculo: 'nov' }), true);
    assert.equal(hasPresetValue('ferias', { ...baseState(), tipoCalculo: 'jan' }), true);
    state.overtimeEntries = [{ id: 'he0', qtd50: 0, qtd100: 0, isEA: false, excluirIR: false }];
    state.substitutionEntries = [{ id: 's0', dias: {}, isEA: false, excluirIR: false, pssIsEA: false }];
    assert.equal(hasPresetValue('hora_extra', state), true);
    assert.equal(hasPresetValue('substituicao', state), true);
});

test('montagem de presets mantém 13º e férias enquanto os resultados ainda estão zerados', () => {
    const input = { ...baseState(), ferias1_3: 1, segunda13Venc: 1, adiant13Venc: 1 };
    let presets: ReturnType<typeof useDynamicPresetInstances>;
    function Harness() {
        presets = useDynamicPresetInstances({
            state: { ...input, ferias1_3: 0, segunda13Venc: 0, adiant13Venc: 0 },
            initialState: input, update: () => {}, updateSubstDays: () => {}, functionKeys: ['fc1'],
        });
        return null;
    }
    let renderer;
    act(() => { renderer = create(React.createElement(Harness)); });
    assert.deepEqual(presets!.enabledPresets.map((preset) => preset.presetId), ['ferias', 'decimo']);
    act(() => renderer.unmount());
});

test('normalização mantém tabelas salvas e atualiza tabelas quando competência é alterada', () => {
    let current: CalculatorState;
    let updateState: (field: keyof CalculatorState, value: unknown) => void;
    const tables = ['2025', '2026'];
    function Harness() {
        const [state, setState] = useState({ ...baseState(), tabelaPSS: '2025', tabelaIR: '2025' });
        current = state;
        updateState = useCallback((field, value) => setState((prev) => ({ ...prev, [field]: value })), []);
        usePayrollFormNormalization({
            state, update: updateState, cargoOptions: ['teste'], padroes: ['A1'],
            functionKeys: ['fc1'], noFunctionCode: '0', pssOptions: tables, irOptions: tables,
            salaryTable: config.bases.salario, preserveRestoredGlobals: true,
        });
        return null;
    }
    let renderer;
    act(() => { renderer = create(React.createElement(Harness)); });
    assert.equal(current!.tabelaPSS, '2025');
    assert.equal(current!.tabelaIR, '2025');
    act(() => updateState!('mesRef', 'DEZEMBRO'));
    assert.equal(current!.tabelaPSS, '2026');
    assert.equal(current!.tabelaIR, '2026');
    act(() => renderer.unmount());
});

test('configurações globais mantêm competência antiga e auxílios salvos na montagem', () => {
    let current: CalculatorState;
    const boundedConfig: CourtConfig = {
        ...config,
        adjustment_schedule: [{ period: 1, percentage: 0, date: '2026-01-01' }],
        menus: { food_allowance: [{ label: '2026', value: 1100 }], preschool_allowance: [] },
        historico_pss: { '2026': config.historico_pss.teste },
        historico_ir: { '2026': 100 },
    };
    function Harness() {
        const [state, setState] = useState({ ...baseState(), anoRef: 2025, auxAlimentacao: 800 });
        current = state;
        const update = useCallback((field, value) => setState((prev) => ({ ...prev, [field]: value })), []);
        return React.createElement(GlobalSettings, { state, update, courtConfig: boundedConfig, styles: {}, preserveRestoredGlobals: true });
    }
    let renderer;
    act(() => { renderer = create(React.createElement(Harness)); });
    assert.equal(current!.anoRef, 2025);
    assert.equal(current!.mesRef, 'NOVEMBRO');
    assert.equal(current!.periodo, 0);
    assert.equal(current!.auxAlimentacao, 800);
    act(() => renderer.unmount());
});
