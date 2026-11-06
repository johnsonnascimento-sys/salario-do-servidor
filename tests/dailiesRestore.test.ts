import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useCallback, useState } from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, CalculatorState, CourtConfig } from '../src/types';
import { hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { calculateDailies } from '../src/services/agency/engine/modules/dailiesCalculations';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { hasPresetValue } from '../src/components/Calculator/dynamicPayrollForm.helpers';
import { useDynamicPresetInstances } from '../src/components/Calculator/hooks/useDynamicPresetInstances';

// Synthetic values only; no official configuration or live database is used.
const config: CourtConfig = {
    bases: { salario: { teste: { A1: 6000 } }, funcoes: {} },
    historico_pss: {}, historico_ir: {}, historico_ir_brackets: {}, values: {},
    payrollRules: { gajRate: 0.5, specificGratificationRate: 0.1, vrRateOnCj1: 0.1,
        monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22,
        transportDiscountRate: 0.06, irrfTopRate: 0.2 },
    dailies: { rates: { teste: 100 }, embarkationAdditional: { completo: 80, metade: 40 },
        externalGloss: { hospedagem: 0, alimentacao: 0, transporte: 0 } },
};
const initial = (): CalculatorState => ({ ...INITIAL_STATE, cargo: 'teste', padrao: 'A1', funcao: '0',
    diariasQtd: 0, diariasEmbarque: 'nenhum', diariasTrechosTransporte: [],
    diariasModoDesconto: 'periodo', diariasDataInicio: '2026-10-26', diariasDataFim: '2026-10-30',
    diariasFeriados: ['2026-10-28'] });
const roundTrip = (value: CalculatorState) => hydrateCalculatorState(
    JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(value)))
);
const calculate = (value: CalculatorState) => calculateDailies(mapStateToAgencyParams(value, 'cjf', config));

test('rascunho e snapshot reabrem card de viagem por datas com cálculo preservado', async () => {
    const before = initial();
    const restored = roundTrip(before);
    let presets: ReturnType<typeof useDynamicPresetInstances>;
    function Harness() {
        presets = useDynamicPresetInstances({ state: restored, initialState: restored,
            update: () => {}, updateSubstDays: () => {}, functionKeys: [] });
        return null;
    }
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(React.createElement(Harness)); });
    assert.equal(presets!.enabledPresets.filter(p => p.presetId === 'diarias').length, 1);
    assert.equal(restored.diariasDataInicio, before.diariasDataInicio);
    assert.equal(restored.diariasDataFim, before.diariasDataFim);
    assert.deepEqual(restored.diariasFeriados, before.diariasFeriados);
    const calculated = await calculate(before);
    assert.ok(calculated.bruto > 0);
    assert.deepEqual(await calculate(restored), calculated);
    act(() => renderer!.unmount());
});

test('data parcial e trechos de transporte preservados também tornam o card acessível', () => {
    assert.equal(hasPresetValue('diarias', { ...INITIAL_STATE, diariasModoDesconto: 'periodo', diariasDataInicio: '2026-10-26' }), true);
    assert.equal(hasPresetValue('diarias', { ...INITIAL_STATE, diariasTrechosTransporte: ['ida_origem'] }), true);
    assert.equal(hasPresetValue('diarias', INITIAL_STATE), false);
});

test('remover viagem limpa datas, feriados e trechos, zera diárias e não reabre o card', async () => {
    const before = { ...initial(), diariasTrechosTransporte: ['ida_origem', 'volta_destino'] };
    assert.ok((await calculate(before)).bruto > 0);
    let current: CalculatorState;
    let presets: ReturnType<typeof useDynamicPresetInstances>;
    function Harness({ value }: { value: CalculatorState }) {
        const [state, setState] = useState(value);
        current = state;
        const update = useCallback((field: keyof CalculatorState, next: unknown) =>
            setState(prev => ({ ...prev, [field]: next })), []);
        presets = useDynamicPresetInstances({ state, initialState: state, update,
            updateSubstDays: () => {}, functionKeys: [] });
        return null;
    }
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(React.createElement(Harness, { value: roundTrip(before) })); });
    const card = presets!.enabledPresets.find(p => p.presetId === 'diarias');
    assert.ok(card);
    act(() => { presets!.removePreset(card); });
    assert.equal(presets!.enabledPresets.some(p => p.presetId === 'diarias'), false);
    assert.equal(current!.diariasDataInicio, '');
    assert.equal(current!.diariasDataFim, '');
    assert.deepEqual(current!.diariasTrechosTransporte, []);
    assert.deepEqual(current!.diariasFeriados, []);
    assert.equal((await calculate(current!)).bruto, 0);
    const reloaded = roundTrip(current!);
    act(() => renderer!.unmount());
    act(() => { renderer = create(React.createElement(Harness, { value: reloaded })); });
    assert.equal(presets!.enabledPresets.some(p => p.presetId === 'diarias'), false);
    assert.equal((await calculate(current!)).bruto, 0);
    act(() => renderer!.unmount());
});
