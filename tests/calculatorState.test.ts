import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useCallback, useState } from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
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
import { readFileSync } from 'node:fs';
import type { ConstitutionalCeilingReference } from '../src/types/constitutionalCeiling';
import { pickPeriodFromScheduleByReference } from '../src/components/Calculator/referenceDateUtils';

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
    assert.deepEqual(presets!.enabledPresets.map((preset) => preset.presetId), ['decimo', 'ferias']);
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

test('pickPeriodFromScheduleByReference respeita o Veto n� 45/2025 para compet�ncias a partir de 2027', () => {
    const schedules = [
        { period: 0, date: '2025-02-01', percentage: 0, label: 'Fev/2025' },
        { period: 1, date: '2026-01-01', percentage: 0, label: 'Jan/2026' },
        { period: 2, date: '2026-07-01', percentage: 0.08, label: 'Jul/2026' },
        { period: 3, date: '2027-07-01', percentage: 0.08, label: 'Jul/2027 (Vetado)', vetoed: true },
        { period: 4, date: '2028-07-01', percentage: 0.08, label: 'Jul/2028 (Vetado)', vetoed: true },
    ];

    // Compet�ncia 2026-08 oficial: per�odo 2
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2026, 8, false), 2);

    // Compet�ncia 2027-08 oficial (com veto mantido): per�odo 2 (mant�m parcela promulgada)
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2027, 8, false), 2);

    // Compet�ncia 2027-08 em modo de proje��o (veto derrubado): per�odo 3
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2027, 8, true), 3);

    // Compet�ncia 2028-08 oficial: per�odo 2
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2028, 8, false), 2);

    // Compet�ncia 2028-08 em modo de proje��o: per�odo 4
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2028, 8, true), 4);
});

test('GlobalSettings aplica parcela sancionada em 2027 e alterna com simularDerrubadaVeto', () => {
    let current: CalculatorState;
    let updateFn: (field: any, val: any) => void;
    const scheduleWithVeto = [
        { period: 1, date: '2026-01-01', percentage: 0 },
        { period: 2, date: '2026-07-01', percentage: 0.08 },
        { period: 3, date: '2027-07-01', percentage: 0.08, vetoed: true },
    ];
    const testConfig: CourtConfig = {
        ...config,
        powerName: 'PJU',
        adjustment_schedule: scheduleWithVeto,
        menus: { food_allowance: [{ label: '2026', value: 1100 }], preschool_allowance: [] },
        historico_pss: { '2026': config.historico_pss.teste, '2027': config.historico_pss.teste },
        historico_ir: { '2026': 100, '2027': 100 },
    };

    function Harness() {
        const [state, setState] = useState({
            ...baseState(),
            anoRef: 2026,
            mesRef: 'JUNHO',
            periodo: 0,
            simularDerrubadaVeto: false,
        });
        current = state;
        const update = useCallback((field: any, value: any) => {
            setState((prev) => ({ ...prev, [field]: value }));
        }, []);
        updateFn = update;
        return React.createElement(GlobalSettings, {
            state,
            update,
            courtConfig: testConfig,
            styles: {},
            preserveRestoredGlobals: false,
        });
    }

    let renderer: any;
    act(() => { renderer = create(React.createElement(Harness)); });

    const help = renderer.root.findByProps({ 'aria-label': 'Enquadramento normativo da competência' });
    act(() => help.props.onClick());
    const textContent = (node: ReactTestInstance | string): string =>
        typeof node === 'string' ? node : node.children.map(textContent).join('');
    const visibleText = () => textContent(renderer.root);
    assert.equal(current!.periodo, 1);
    assert.match(visibleText(), /Enquadramento normativo de 06\/2026/);
    assert.doesNotMatch(visibleText(), /com efeitos remuneratórios a partir/);

    act(() => updateFn('mesRef', 'JULHO'));
    assert.equal(current!.periodo, 2);
    assert.match(visibleText(), /Enquadramento normativo de 07\/2026/);
    assert.match(visibleText(), /com efeitos remuneratórios a partir de 01\/07\/2026/);

    act(() => {
        updateFn('anoRef', 2027);
        updateFn('mesRef', 'JUNHO');
        updateFn('simularDerrubadaVeto', true);
    });
    assert.equal(current!.periodo, 2);
    assert.doesNotMatch(visibleText(), /Projeção ativa nesta competência/);
    act(() => {
        updateFn('mesRef', 'JULHO');
        updateFn('simularDerrubadaVeto', false);
    });

    // Oficialmente em 2027, deve aplicar o per�odo 2 (�ltimo sancionado), N�O o per�odo 3 vetado
    assert.equal(current!.periodo, 2);

    // Ativando simula��o de derrubada do veto
    act(() => {
        updateFn('simularDerrubadaVeto', true);
    });
    assert.equal(current!.periodo, 3);
    assert.match(visibleText(), /Enquadramento normativo de 07\/2027/);
    assert.match(visibleText(), /com efeitos simulados a partir de 01\/07\/2027/);
    assert.match(visibleText(), /Projeção ativa nesta competência/);

    // Desativando simula��o volta para per�odo 2
    act(() => {
        updateFn('simularDerrubadaVeto', false);
    });
    assert.equal(current!.periodo, 2);

    act(() => renderer.unmount());
});


test('reordering and removing repeated entries preserves identities and independent values', () => {
    const initial = baseState();
    initial.overtimeEntries = [
        { id: 'he-first', qtd50: 3, qtd100: 0, divisor: 150, isEA: false, excluirIR: true },
        { id: 'he-second', qtd50: 0, qtd100: 7, divisor: 200, isEA: true, excluirIR: false, composicaoBase: { vencimento: false } },
    ];
    initial.substitutionEntries = [
        { id: 'subst-first', dias: { fc1: 2 }, isEA: false, excluirIR: false, pssIsEA: false },
        { id: 'subst-second', dias: { cj1: 5 }, isEA: true, excluirIR: true, pssIsEA: true },
    ];
    let current: CalculatorState;
    let presets: ReturnType<typeof useDynamicPresetInstances>;
    function Harness() {
        const [state, setState] = useState(initial);
        current = state;
        const update = useCallback((field: keyof CalculatorState, value: unknown) => setState(previous => ({ ...previous, [field]: value })), []);
        presets = useDynamicPresetInstances({ state, update, updateSubstDays: () => {}, functionKeys: ['fc1', 'cj1'], transportIndemnityEnabled: true });
        return null;
    }
    let renderer;
    act(() => { renderer = create(React.createElement(Harness)); });
    const originalInstances = [...presets!.enabledPresets];
    const secondOvertime = originalInstances.find(instance => instance.overtimeEntryId === 'he-second')!;
    const secondSubstitution = originalInstances.find(instance => instance.substitutionEntryId === 'subst-second')!;
    act(() => presets!.movePreset(secondOvertime.key, -1));
    act(() => presets!.movePreset(secondSubstitution.key, -1));
    assert.deepEqual(current!.overtimeEntries.find(entry => entry.id === 'he-first'), initial.overtimeEntries[0]);
    assert.deepEqual(current!.overtimeEntries.find(entry => entry.id === 'he-second'), initial.overtimeEntries[1]);
    assert.deepEqual(current!.substitutionEntries.find(entry => entry.id === 'subst-first'), initial.substitutionEntries[0]);
    assert.deepEqual(current!.substitutionEntries.find(entry => entry.id === 'subst-second'), initial.substitutionEntries[1]);
    assert.deepEqual(new Set(presets!.enabledPresets.map(instance => instance.key)), new Set(originalInstances.map(instance => instance.key)));
    act(() => presets!.includePreset('hora_extra'));
    assert.equal(current!.overtimeEntries.length, 3);
    const newOvertime = presets!.enabledPresets.find(instance => !originalInstances.some(original => original.key === instance.key))!;
    assert.notEqual(newOvertime.overtimeEntryId, 'he-first');
    act(() => presets!.removePreset(secondOvertime));
    assert.equal(current!.overtimeEntries.length, 2);
    assert.equal(current!.overtimeEntries.some(entry => entry.id === 'he-second'), false);
    assert.deepEqual(current!.overtimeEntries.find(entry => entry.id === 'he-first'), initial.overtimeEntries[0]);
    assert.deepEqual(current!.substitutionEntries.find(entry => entry.id === 'subst-second'), initial.substitutionEntries[1]);
    act(() => renderer.unmount());
});


test('explicit modes and manual zero survive a snapshot round trip', async () => {
    const state: CalculatorState = { ...baseState(), tipoCalculo: 'comum', manualAdiant13: true,
        adiant13Venc: 3000, adiant13FC: 400, segunda13Venc: 0, segunda13FC: 1,
        segunda13ModoVenc: 'manual', segunda13ModoFC: 'automatico' };
    const serialized = stripCalculatedFieldsFromCalculatorState(state);
    assert.equal(serialized.segunda13ModoVenc, 'manual');
    const restored = hydrateCalculatorState(JSON.parse(JSON.stringify(serialized)));
    assert.equal(restored.segunda13Venc, 0);
    assert.equal(restored.segunda13ModoFC, 'automatico');
    const params = mapStateToAgencyParams(restored, 'jmu', config);
    assert.equal(params.segunda13ModoVenc, 'manual');
    assert.equal(params.segunda13ModoFC, 'automatico');
    assert.deepEqual(await calculate(restored), await calculate(state));
    assert.equal(hasPresetValue('decimo', { ...INITIAL_STATE, segunda13ModoVenc: 'manual' }), true);
    const legacy = hydrateCalculatorState({ ...INITIAL_STATE, manualAdiant13: true, segunda13Venc: 1000 });
    assert.equal(legacy.segunda13ModoVenc, undefined);
});


test('unified thirteenth lists and memory round trip without changing the legacy path', async () => {
    const state: CalculatorState = { ...baseState(), tipoCalculo: 'comum',
        thirteenthPayroll: { version: 1, firstSelected: true, secondSelected: true,
            firstMode: 'informado', secondMode: 'automatico',
            advances: [{ id: 'advance-cargo', target: 'grupo:cargo', description: 'Advance salary', amount: 3000 },
                { id: 'advance-fc', target: 'grupo:funcao', description: 'Advance function', amount: 400 }], secondEntries: [] } };
    const before = await calculate(state);
    const snapshot = stripCalculatedFieldsFromCalculatorState({ ...state, thirteenthMemory: before.breakdown.thirteenthMemory });
    assert.equal(snapshot.thirteenthMemory, undefined);
    assert.deepEqual(snapshot.thirteenthPayroll, state.thirteenthPayroll);
    const restored = hydrateCalculatorState(JSON.parse(JSON.stringify(snapshot)));
    assert.deepEqual(await calculate(restored), before);
    assert.equal(restored.thirteenthPayroll!.advances[0].amount, 3000);
    restored.thirteenthPayroll!.advances[0].amount = 99;
    assert.equal(state.thirteenthPayroll!.advances[0].amount, 3000);
    assert.equal(hasPresetValue('decimo', { ...state, thirteenthPayroll: { ...state.thirteenthPayroll!, firstSelected: false, secondSelected: false } }), false);
    assert.equal(mapStateToAgencyParams(state, 'jmu', config).thirteenthPayroll, state.thirteenthPayroll);
});

const ceilingMigration = readFileSync(new URL(
    '../supabase/migrations/20261125000000_constitutional_ceiling_reference.sql', import.meta.url,
), 'utf8');
const constitutionalCeilingReference: ConstitutionalCeilingReference = JSON.parse(ceilingMigration.split('$ceiling$')[1]);
const ceilingLine = (root: ReactTestInstance) => root.findAllByType('p').find(
    node => node.props['aria-live'] === 'polite',
)!;

for (const slug of ['jmu', 'cjf']) {
    test('Competência (' + slug + ') atualiza o teto federal e preserva o cálculo da folha', async () => {
        const courtConfig: CourtConfig = { ...config, orgSlug: slug, constitutionalCeilingReference };
        const january: CalculatorState = { ...baseState(), mesRef: 'JANEIRO', anoRef: 2025 };

        function Harness() {
            const [state, setState] = useState(january);
            const update = useCallback((field, value) => setState(previous => ({ ...previous, [field]: value })), []);
            return React.createElement(GlobalSettings, { state, update, courtConfig, styles: {} });
        }

        let renderer!: ReturnType<typeof create>;
        act(() => { renderer = create(React.createElement(Harness)); });
        try {
            const assertCeiling = (amount: RegExp) => {
                const line = ceilingLine(renderer.root);
                assert.match(line.findByType('strong').props.children, amount);
                assert.equal(line.findByType('a').props.href, constitutionalCeilingReference.versions[0].source);
            };
            assertCeiling(/44\.008,52/);
            act(() => renderer.root.findByProps({ id: 'payroll-month' }).props.onChange({ target: { value: 'FEVEREIRO' } }));
            assertCeiling(/46\.366,19/);
            act(() => renderer.root.findByProps({ id: 'payroll-year' }).props.onChange({ target: { value: '2026' } }));
            assertCeiling(/46\.366,19/);
        } finally {
            act(() => renderer.unmount());
        }

        const state = baseState();
        const before = await engine.calculateTotal(mapStateToAgencyParams(state, slug, { ...config, orgSlug: slug }));
        const after = await engine.calculateTotal(mapStateToAgencyParams(state, slug, courtConfig));
        assert.deepEqual(after, before);
    });
}

test('Competência informa indisponibilidade do teto para série ausente, inválida ou sem cobertura', () => {
    const invalidSource = { versions: [{ ...constitutionalCeilingReference.versions[0], source: 'javascript:bad' }] };
    for (const [reference, year, month] of [
        [undefined, 2025, 'JANEIRO'],
        [invalidSource, 2023, 'ABRIL'],
        [constitutionalCeilingReference, 2023, 'MARÇO'],
    ] as const) {
        let renderer!: ReturnType<typeof create>;
        act(() => {
            renderer = create(React.createElement(GlobalSettings, {
                state: { ...baseState(), anoRef: year, mesRef: month }, update: () => {},
                courtConfig: { ...config, constitutionalCeilingReference: reference }, styles: {},
            }));
        });
        try {
            assert.equal(ceilingLine(renderer.root).props.children, 'Referência indisponível para esta competência');
            assert.equal(ceilingLine(renderer.root).findAllByType('a').length, 0);
        } finally {
            act(() => renderer.unmount());
        }
    }
});
