import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { INITIAL_STATE, type CourtConfig } from '../src/types';
import { DailiesCard } from '../src/components/Calculator/cards/DailiesCard';
import { LicenseCard } from '../src/components/Calculator/cards/LicenseCard';
import { ThirteenthCard } from '../src/components/Calculator/cards/ThirteenthCard';
import { buildPresetGrossLines } from '../src/components/Calculator/presetGrossLines';
import { groupPayslipRowsForDisplay } from '../src/utils/payslipRows';

const styles = { card: '', sectionTitle: '', innerBox: '', label: '', input: '', checkboxLabel: '', checkbox: '' };

test('licença antiga negativa fica visível e campo recusa novos negativos', () => {
    const updates: unknown[] = [];
    const tree = create(React.createElement(LicenseCard, { state: { ...INITIAL_STATE, licencaDias: -2 }, update: (...args) => updates.push(args), styles, competenciaReferencia: '' }));
    const input = tree.root.findByProps({ type: 'number' });
    assert.equal(input.props.value, -2);
    assert.equal(input.props.min, '0');
    assert.equal(tree.root.findAllByProps({ role: 'alert' }).length, 1);
    act(() => input.props.onChange({ target: { value: '-4' } }));
    assert.equal(updates.length, 0);
    act(() => input.props.onChange({ target: { value: '4' } }));
    assert.equal(updates.length, 1);
});

test('13º manual mostra pendência no componente correspondente', () => {
    const tree = create(React.createElement(ThirteenthCard, { state: { ...INITIAL_STATE, manualAdiant13: true, segunda13FC: 100 }, update: () => {}, styles, competenciaReferencia: '' }));
    const alerts = tree.root.findAllByProps({ role: 'alert' });
    assert.equal(alerts.length, 1);
    assert.match(String(alerts[0].children[0]), /FC\/CJ/);
});

test('resumo de diárias apresenta descontos retornados pelo motor', () => {
    const state = { ...INITIAL_STATE, calculationMemory: { dailies: { gross: 1000, embarkationAdditional: 100, ldoCut: 0, externalGloss: 0, foodDiscount: 0, transportDiscount: 0, foodDiscountFull: 0, foodDiscountHalf: 0, transportDiscountFull: 0, transportDiscountHalf: 0, net: 1000 } } } as any;
    const lines = buildPresetGrossLines({ instance: { presetId: 'diarias' } as any, state, courtConfig: { dailies: {} } as CourtConfig, currentTables: { funcoes: {} }, isNovoAQ: false, noFunctionCode: '0', currentFunctionValue: 0, gratificacaoEspecificaCalculada: 0 });
    assert.equal(lines.find(line => line.label === 'Desconto aux. alimentação (meia diária)')?.value, 0);
    assert.equal(lines.find(line => line.label === 'Total diárias líquidas')?.value, 1000);
});

test('PSS do 13º é atribuído apenas ao vencimento na segunda parcela', () => {
    const grouped = groupPayslipRowsForDisplay([{ label: 'CONTRIBUIÇÃO RPPS-GN(13º) ATIVO EC', type: 'D' as const, value: 150 }], { ...INITIAL_STATE, pss13: 150, adiant13Venc: 1000, adiant13FC: 500, segunda13Venc: 1000, segunda13FC: 500 });
    const group = grouped.find(row => 'details' in row) as any;
    assert.equal(group.details.length, 1);
    assert.match(group.details[0].label, /2ª PARCELA - VENCIMENTO/);
    assert.equal(group.details[0].value, 150);
});


test('13º manual rejeita entrada negativa em vez de converter sinal', () => {
    const updates: unknown[] = [];
    const tree = create(React.createElement(ThirteenthCard, { state: { ...INITIAL_STATE, manualAdiant13: true }, update: (...args) => updates.push(args), styles, competenciaReferencia: '' }));
    const input = tree.root.findAllByProps({ type: 'text' })[0];
    act(() => input.props.onChange({ target: { value: '-3' } }));
    assert.equal(updates.length, 0);
});

test('card de diárias permanece editável quando faltam divisores configurados', () => {
    const tree = create(React.createElement(DailiesCard, { state: INITIAL_STATE, update: () => {}, styles, courtConfig: { dailies: {} } as CourtConfig, competenciaReferencia: '' }));
    assert.ok(tree.root.findAllByProps({ role: 'alert' }).some(node => String(node.children[0]).includes('Configuração de diárias incompleta')));
    assert.ok(tree.root.findAllByType('input').length > 0);
});


import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';

const integrationConfig: CourtConfig = {
    bases: { salario: { teste: { A1: 6000 } }, funcoes: { fc1: 3000, cj4: 15000 } },
    values: {}, historico_pss: { teste: { teto_rgps: 5000, faixas: [{ min: 0, max: 100000, rate: .1 }] } },
    historico_ir: { teste: 100 },
    payrollRules: { gajRate: .5, specificGratificationRate: .1, vrRateOnCj1: .1, monthDayDivisor: 30, overtimeMonthHours: 200, transportWorkdays: 22, transportDiscountRate: .06, irrfTopRate: .2 },
    careerCatalog: { noFunctionCode: '0', noFunctionLabel: 'Sem função', cargoLabels: {} },
};
const integrationState = () => ({ ...INITIAL_STATE, cargo: 'teste', padrao: 'A1', funcao: '0', tabelaPSS: 'teste', tabelaIR: 'teste', regimePrev: 'antigo' as const });
test('hook e detalhamento preservam R$100 mensal e R$500 EA, conciliando o líquido oficial', async () => {
    let state = { ...integrationState(), substitutionEntries: [
        { id: 'mensal', dias: { fc1: 1 }, isEA: false, excluirIR: false, pssIsEA: false },
        { id: 'ea', dias: { cj4: 1 }, isEA: true, excluirIR: false, pssIsEA: true },
    ] };
    let latest!: ReturnType<typeof useCalculatorResults>;
    const engine = new AgencyCalculationEngine();
    const agency = { slug:'jmu', name:'JMU', type:'judiciary' };
    function Probe(){ latest = useCalculatorResults(state, engine, integrationConfig, agency); return null; }
    let tree:any;
    try {
        await act(async()=>{ tree=create(React.createElement(Probe)); });
        assert.equal(latest.calculationStatus,'ready', latest.calculationError ?? '');
        const substitutions=latest.resultRows.filter(row=>row.label.startsWith('SUBSTITUIÇÃO DE FUNÇÃO'));
        assert.deepEqual(substitutions.map(row=>row.value),[100,500]);
        assert.match(substitutions[0].label,/IR MENSAL/);
        assert.match(substitutions[1].label,/IR EA/);
        const net=latest.resultRows.reduce((sum,row)=>sum+(row.type==='C'?row.value:-row.value),0);
        assert.ok(Math.abs(net-latest.calculatedState.liquido)<.01);
        state={...state,manualAdiant13:true,segunda13Venc:100} as typeof state;
        await act(async()=>{tree.update(React.createElement(Probe));});
        assert.equal(latest.calculationStatus,'error');
        assert.match(latest.calculationError ?? '',/primeira parcela/i);
        assert.deepEqual(latest.resultRows,[]);
    } finally {if(tree)act(()=>tree.unmount());}
});

test('alternar projeção explícita recalcula o hook mesmo sem mudar o período', async () => {
    let state={...integrationState(),periodo:3,simularDerrubadaVeto:false};
    const config={...integrationConfig,adjustment_schedule:[
        {period:1,percentage:.1,status:'promulgated' as const},
        {period:2,percentage:.1,status:'vetoed' as const},
        {period:3,percentage:.1,status:'promulgated' as const},
    ]};
    let latest!:ReturnType<typeof useCalculatorResults>;
    const engine=new AgencyCalculationEngine();
    const agency={slug:'jmu',name:'JMU',type:'judiciary'};
    function Probe(){latest=useCalculatorResults(state,engine,config,agency);return null;}
    let tree:any;
    try {
        await act(async()=>{tree=create(React.createElement(Probe));});
        assert.equal(latest.calculationStatus,'ready',latest.calculationError ?? '');
        assert.ok(Math.abs(latest.calculatedState.vencimento-7260)<.001);
        state={...state,simularDerrubadaVeto:true};
        await act(async()=>{tree.update(React.createElement(Probe));});
        assert.ok(Math.abs(latest.calculatedState.vencimento-7986)<.001);
    }finally{if(tree)act(()=>tree.unmount());}
});
