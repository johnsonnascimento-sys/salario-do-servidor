import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useCallback, useState } from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState, type CourtConfig } from '../src/types';
import { GlobalSettings } from '../src/components/Calculator/GlobalSettings';
import { pickPeriodFromScheduleByReference } from '../src/components/Calculator/referenceDateUtils';

const config: CourtConfig = {
    bases: { salario: {}, funcoes: {} }, historico_pss: {}, historico_ir: {}, historico_ir_brackets: {}, values: {},
    adjustment_schedule: [
        { period: 0, date: '2026-01-01', percentage: 0, label: 'Base sintética', status: 'promulgated' },
        { period: 2, date: '2026-07-01', percentage: 0.01, label: 'Tabela oficial de teste', status: 'promulgated', legalReference: 'Norma sintética A', sourceUrl: 'https://example.invalid/a' },
        { period: 3, date: '2027-07-01', percentage: 0.02, label: 'Projeção de teste B', status: 'vetoed', veto_reference: 'Veto sintético B' },
        { period: 4, date: '2028-07-01', percentage: 0.03, label: 'Projeção de teste C', status: 'projected' },
    ], menus: { food_allowance: [{ label: '2026', value: 1100 }], preschool_allowance: [] },
};

test('seletor exclui status de projeção e não infere veto pela data', () => {
    const schedules = [
        { period: 0, date: '2026-01-01', percentage: 0, status: 'promulgated' as const },
        { period: 1, date: '2026-07-01', percentage: 0.01, status: 'projected' as const },
        { period: 2, date: '2027-07-01', percentage: 0.02, status: 'vetoed' as const, vetoed: false },
        { period: 3, date: '2028-07-01', percentage: 0.03, status: 'promulgated' as const },
    ];
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2027, 8), 0);
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2027, 8, true), 2);
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2028, 8), 3);
    assert.equal(pickPeriodFromScheduleByReference(schedules, 2025, 12), null);
    assert.equal(pickPeriodFromScheduleByReference([{ period: 1, date: '2026-06-15', percentage: 0.01 }], 2026, 6), 1);
});

test('UI usa competência única, flag explícita e fundamentos configurados', () => {
    let current: CalculatorState;
    let update!: (field: keyof CalculatorState, value: unknown) => void;
    let batches = 0;
    function Harness() {
        const [state, setState] = useState({ ...INITIAL_STATE, mesRef: 'OUTUBRO', anoRef: 2026, periodo: 4, auxAlimentacao: 1000, simularDerrubadaVeto: false, salaryProjectionLabel: 'Rótulo legado que não autoriza projeção' });
        current = state;
        update = useCallback((field, value) => setState(previous => ({ ...previous, [field]: value })), []);
        const updateMany = useCallback((patch: Partial<CalculatorState>) => { batches++; setState(previous => ({ ...previous, ...patch })); }, []);
        return <GlobalSettings state={state} update={update} updateMany={updateMany} courtConfig={config} styles={{}} preserveRestoredGlobals />;
    }
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<Harness />); });
    assert.equal(current!.periodo, 2);
    assert.equal(current!.simularDerrubadaVeto, false);
    assert.equal(current!.auxAlimentacao, 1000);
    assert.equal(renderer.root.findAllByType('select').length, 2);
    const labels = renderer.root.findAllByType('label');
    assert.ok(labels.some(label => label.findAllByType('span').some(span => span.children.join('') === 'Mês da folha')));
    assert.ok(labels.some(label => label.findAllByType('span').some(span => span.children.join('') === 'Ano da folha')));
    const output = JSON.stringify(renderer.toJSON());
    assert.ok(output.includes('Norma sintética A'));
    assert.ok(output.includes('Veto sintético B'));
    assert.ok(!output.includes('15.293'));
    assert.ok(!output.includes('+8%'));
    act(() => renderer.root.findByType('input').props.onChange({ target: { checked: true } }));
    assert.equal(current!.simularDerrubadaVeto, true);
    assert.equal(current!.periodo, 2);
    assert.ok(JSON.stringify(renderer.toJSON()).includes('Nenhuma parcela projetada aplicável'));
    act(() => update('anoRef', 2027));
    assert.equal(current!.periodo, 3);
    assert.equal(current!.salaryProjectionLabel, 'Projeção de teste B');
    assert.ok(JSON.stringify(renderer.toJSON()).includes('Cenário projetado'));
    assert.equal(renderer.root.findAllByType('select').length, 2);
    act(() => renderer.root.findByType('input').props.onChange({ target: { checked: false } }));
    assert.equal(current!.periodo, 2);
    assert.ok(batches >= 3);
    act(() => renderer.unmount());
});

test('reabertura resolve período pela competência sem aplicar projeção futura do snapshot', () => {
    for (const flag of [undefined, false, true]) {
        let current: CalculatorState;
        function Harness() {
            const [state, setState] = useState({ ...INITIAL_STATE, mesRef: 'NOVEMBRO', anoRef: 2026, auxAlimentacao: 1000, periodo: 4, simularDerrubadaVeto: flag, salaryProjectionLabel: 'Projeção antiga' });
            current = state;
            const update = useCallback((field, value) => setState(previous => ({ ...previous, [field]: value })), []);
            return <GlobalSettings state={state} update={update} courtConfig={config} styles={{}} preserveRestoredGlobals />;
        }
        let renderer: ReturnType<typeof create>;
        act(() => { renderer = create(<Harness />); });
        assert.equal(current!.periodo, 2);
        assert.equal(current!.simularDerrubadaVeto, flag === true);
        assert.equal(current!.auxAlimentacao, 1000);
        assert.equal(current!.mesRef, 'NOVEMBRO');
        act(() => renderer.unmount());
    }
});
