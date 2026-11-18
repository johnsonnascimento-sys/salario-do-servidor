import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useState } from 'react';
import { act, create } from 'react-test-renderer';
import { AtsValueFields } from '../src/components/Calculator/AtsValueFields';
import { styles } from '../src/components/Calculator/styles';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { calculateAtsPercentage, resolveAtsRubrics } from '../src/services/agency/engine/modules/atsCalculations';
import { INITIAL_STATE, type CourtConfig, type Rubrica } from '../src/types';
import { hydrateCalculatorState } from '../src/utils/calculatorState';

const config: CourtConfig = {
    bases: { salario: { analista: { A1: 9292.14 } }, funcoes: { cj3: 10029.94 } },
    payrollRules: { atsPercentageLimit: 35, gajRate: 1.4, specificGratificationRate: 0,
        vrRateOnCj1: 0, monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22,
        transportDiscountRate: 0.06, irrfTopRate: 0.1 },
    historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: 0.1 }] } },
    historico_ir: { teste: 0 },
    values: { deducao_dep: 100 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} }
};
Object.assign(config, { adjustment_schedule: [{ period: 1, percentage: 10 }] });
const rubric: Rubrica = { id: 'ats-test', tipo: 'C', vantagemPessoal: 'ATS', descricao: 'ATS',
    valor: 123, atsPercentual: 16, incideIR: true, incidePSS: true };
const input = { ...INITIAL_STATE, cargo: 'analista', padrao: 'A1', funcao: 'cj3', periodo: 0,
    tabelaPSS: 'teste', tabelaIR: 'teste', regimePrev: 'antigo' as const, funprespParticipacao: 'nao' as const,
    rubricasExtras: [rubric] };
const engine = new AgencyCalculationEngine();

test('ATS reproduz o holerite e acompanha o reajuste sem incorporar FC/CJ', async () => {
    const params = mapStateToAgencyParams(input, 'jmu', config);
    assert.equal(params.rubricasExtras?.[0].valor, 1486.74);
    assert.equal(mapStateToAgencyParams({ ...input, periodo: 1 }, 'jmu', config).rubricasExtras?.[0].valor, 1635.42);
    assert.equal(mapStateToAgencyParams({ ...input, funcao: '0' }, 'jmu', config).rubricasExtras?.[0].valor, 1486.74);
    assert.equal(input.rubricasExtras[0].valor, 123);
    const result = await engine.calculateTotal({ ...params, rubricasExtras: [rubric] });
    const fixed = await engine.calculateTotal({ ...params, rubricasExtras: [{ ...rubric, atsPercentual: undefined, valor: 1486.74 }] });
    assert.equal(result.breakdown.rubricasDinamicasCredito, 1486.74);
    assert.equal(result.breakdown.ats, 0);
    assert.equal(result.netSalary, fixed.netSalary);
    assert.deepEqual(result.breakdown.rubricasTax, fixed.breakdown.rubricasTax);
});

test('ATS valida limites e vencimento, preserva snapshots e revalida confirmação pelo valor', async () => {
    const params = mapStateToAgencyParams(input, 'jmu', config);
    assert.equal(calculateAtsPercentage(9.2, { limit: 35, basicSalary: 1501.25 }).amount, 138.12);
    assert.equal(calculateAtsPercentage(35, { limit: 35, basicSalary: 100 }).amount, 35);
    for (const atsPercentual of [-1, 35.01, Number.NaN]) {
        await assert.rejects(engine.calculateTotal({ ...params, rubricasExtras: [{ ...rubric, atsPercentual }] }), /entre 0% e 35%/);
    }
    await assert.rejects(engine.calculateTotal({ ...params, padrao: 'inexistente' }), /vencimento básico/);
    const unconfigured = { ...config, payrollRules: { ...config.payrollRules!, atsPercentageLimit: undefined } };
    assert.match(mapStateToAgencyParams(input, 'jmu', unconfigured).atsCalculationError ?? '', /não está configurado/);
    const restored = hydrateCalculatorState(JSON.parse(JSON.stringify(input)));
    assert.equal(restored.rubricasExtras[0].atsPercentual, 16);
    const legacy = hydrateCalculatorState({ ...input, rubricasExtras: [{ ...rubric, atsPercentual: undefined }] });
    assert.equal(mapStateToAgencyParams(legacy, 'jmu', unconfigured).rubricasExtras?.[0].valor, 123);
    const confirmed = { ...rubric, pensionOptionAmountConfirmed: true, pensionOptionConfirmedValue: 1486.74 };
    assert.equal(resolveAtsRubrics([confirmed], params).rubricas[0].pensionOptionAmountConfirmed, true);
    assert.equal(resolveAtsRubrics([confirmed], { ...params, periodo: 1 }).rubricas[0].pensionOptionAmountConfirmed, false);
});

test('card alterna modos e aceita botões e vírgula sem descartar o campo manual', () => {
    function Card() {
        const [percentual, setPercentual] = useState<number>();
        return <AtsValueFields id="ats" percentual={percentual} context={{ limit: 35, basicSalary: 9292.14 }}
            onChange={setPercentual} fixedValueField={<span>R$ 123,00</span>} styles={styles} />;
    }
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(<Card />); });
    const select = () => tree.root.findByType('select');
    act(() => select().props.onChange({ target: { value: 'percentual' } }));
    const inputField = () => tree.root.findByType('input');
    assert.equal(tree.root.findAllByType('button')[0].props.disabled, true);
    act(() => inputField().props.onChange({ target: { value: '16,25' } }));
    assert.equal(inputField().props.value, '16,25');
    act(() => tree.root.findAllByType('button')[1].props.onClick());
    assert.equal(inputField().props.value, '17,25');
    act(() => tree.root.findAllByType('button')[0].props.onClick());
    assert.equal(inputField().props.value, '16,25');
    act(() => inputField().props.onChange({ target: { value: '35' } }));
    assert.equal(tree.root.findAllByType('button')[1].props.disabled, true);
    act(() => select().props.onChange({ target: { value: 'fixo' } }));
    assert.equal(tree.root.findByType('span').children.join(''), 'R$ 123,00');
    act(() => tree.unmount());
});

test('resultado expõe uma única linha de ATS com o mesmo valor efetivo das exportações', async () => {
    let result: ReturnType<typeof useCalculatorResults>;
    const agency = { name: 'JMU', slug: 'jmu', type: 'judiciario' };
    function Results() {
        result = useCalculatorResults(input, engine, config, agency);
        return null;
    }
    let tree: ReturnType<typeof create>;
    await act(async () => { tree = create(<Results />); });
    assert.equal(result!.calculationStatus, 'ready', result!.calculationError ?? undefined);
    assert.equal(result!.effectiveState.rubricasExtras[0].valor, 1486.74);
    const rows = result!.resultRows.filter(row => row.label.startsWith('ATS'));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].value, 1486.74);
    act(() => tree.unmount());
});
