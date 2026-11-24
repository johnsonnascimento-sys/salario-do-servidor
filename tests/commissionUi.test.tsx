import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { INITIAL_STATE, type CalculatorState } from '../src/types';
import { DynamicPayrollBaseSection } from '../src/components/Calculator/DynamicPayrollBaseSection';
import { CommissionProfileFields } from '../src/components/Calculator/CommissionProfileFields';

test('seleção de perfil restringe funções e preserva dados da carreira', () => {
    let current: CalculatorState = INITIAL_STATE;
    const Harness = () => {
        const [state, setState] = useState<CalculatorState>({ ...INITIAL_STATE, cargo: 'analista', padrao: 'C13', funcao: 'fc1' });
        current = state;
        return <DynamicPayrollBaseSection styles={{}} state={state} resultRows={[]} cargoOptions={['analista']} padroes={['C13']}
            salaryByCargo={{ C13: 100 }} functionKeys={['fc1', 'cj1']} functionValues={{ fc1: 10, cj1: 20 }}
            noFunctionCode="0" noFunctionLabel="Sem função" baseVencimento={100} gaj={0} calculationReady={false}
            commissionProfilesEnabled handleCargoChange={() => {}} update={(key, value) => setState(old => ({ ...old, [key]: value }))}
            updateMany={patch => setState(old => ({ ...old, ...patch }))} />;
    };
    const tree = create(<Harness />);
    const profile = tree.root.findAllByType('select')[0];
    act(() => profile.props.onChange({ target: { value: 'exclusive_cj' } }));
    assert.equal(current.cargo, 'analista');
    assert.equal(current.padrao, 'C13');
    assert.equal(current.funcao, '0');
    const functionSelect = tree.root.findAllByType('select')[1];
    assert.deepEqual(functionSelect.findAllByType('option').map(option => option.props.value), ['0', 'cj1']);
    act(() => profile.props.onChange({ target: { value: 'career' } }));
    assert.equal(current.commissionProfile, undefined);
    assert.equal(current.cargo, 'analista');
    assert.equal(current.funcao, 'fc1');
    tree.unmount();
});

test('campos externos preservam zero informado e distinguem origem de folha pagadora', () => {
    let current: CalculatorState = INITIAL_STATE;
    const Harness = () => {
        const [state, setState] = useState<CalculatorState>({ ...INITIAL_STATE, funcao: 'fc1', commissionProfile: { kind: 'external', payment: 'judiciary' } });
        current = state;
        return <><CommissionProfileFields section="basic" state={state} styles={{}} update={(key, value) => setState(old => ({ ...old, [key]: value }))} />
            <CommissionProfileFields section="pension" state={state} styles={{}} update={(key, value) => setState(old => ({ ...old, [key]: value }))} /></>;
    };
    const tree = create(<Harness />);
    const numeric = tree.root.findAllByType('input');
    act(() => numeric[0].props.onChange({ target: { value: '0' } }));
    assert.equal(current.commissionProfile?.kind === 'external' && current.commissionProfile.originRemuneration, 0);
    const monthly = tree.root.findAllByType('input').find(item => String(item.props.id).endsWith('-desconto-mensal'));
    act(() => monthly!.props.onChange({ target: { value: '0' } }));
    assert.equal(current.commissionProfile?.kind === 'external' && current.commissionProfile.withholdingMonthly, 0);
    tree.unmount();
});
