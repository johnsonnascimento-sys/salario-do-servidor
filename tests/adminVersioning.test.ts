import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { validateConfigVersionDate } from '../src/services/admin/configVersionValidation';
import { pickPeriodFromScheduleByReference } from '../src/components/Calculator/referenceDateUtils';
import { getTablesForPeriod } from '../src/utils/calculations';
import AdminGlobal from '../src/pages/AdminGlobal';
import AdminPower from '../src/pages/AdminPower';
import ConfigVersionDateField from '../src/components/Admin/ConfigVersionDateField';
import JsonEditor from '../src/components/Admin/JsonEditor';
import { hydrateCalculatorState } from '../src/utils/calculatorState';
import { validateCalculationParams } from '../src/services/agency/engine/validation';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { normalizeLegacyAdjustmentStatus, resolveAdjustmentStatus } from '../src/services/config/adjustmentStatus';

const active = { id:'old', config_key:'rules', power_name:'PJU', config_value:{ rate:1 }, valid_from:'2025-01-01', valid_to:null };
test('datas administrativas rejeitam versão encerrada, duplicada, anterior, inválida e futura', () => {
  const today='2026-10-29';
  assert.equal(validateConfigVersionDate(active,today,today),null);
  for(const date of ['','2025-01-01','2024-12-31','2026-02-30','2026-10-30']) assert.ok(validateConfigVersionDate(active,date,today));
  assert.ok(validateConfigVersionDate({...active,valid_to:'2026-01-01'},today,today));
});
for (const [name, Page] of [['global',AdminGlobal],['power',AdminPower]] as const) {
  test(`admin ${name} cria versão via RPC, invalida cache só no sucesso e mantém edição em erro`, async () => {
    let payload:any, fail=false, cleared=0;
    (globalThis as any).__adminVersionIO={
      list:async()=>[active],
      version:async(p:any)=>{ payload=p; if(fail)throw new Error('Concorrência: versão encerrada'); },
      clear:()=>cleared++,
    };
    const originalWindow=(globalThis as any).window;
    (globalThis as any).window={confirm:()=>true};
    let tree:any;
    try {
      await act(async()=>{ tree=create(React.createElement(Page)); });
      const table=tree.root.find(node=>node.props.kind===name && typeof node.props.onEdit==='function');
      await act(async()=>{table.props.onEdit(active);});
      await act(async()=>{tree.root.findByType(ConfigVersionDateField).props.onChange('2026-10-29');});
      await act(async()=>{tree.root.findByType(JsonEditor).props.onChange({rate:2});});
      const save=()=>tree.root.findAllByType('button').find((n:any)=>n.children.includes('Criar nova versão'));
      fail=true;
      await act(async()=>{await save().props.onClick();});
      assert.equal(cleared,0);
      assert.deepEqual(tree.root.findByType(JsonEditor).props.value,{rate:2});
      assert.ok(tree.root.findAllByProps({role:'alert'}).some((n:any)=>JSON.stringify(n.children).includes('Concorrência')));
      fail=false;
      await act(async()=>{await save().props.onClick();});
      assert.equal(cleared,1);
      assert.equal(payload.previous_id,'old');
      assert.equal(payload.id,undefined);
      assert.equal(payload.valid_from,'2026-10-29');
      assert.equal(payload.valid_to,null);
      assert.equal(tree.root.findAllByType(JsonEditor).length,0);
    } finally {if(tree)act(()=>tree.unmount()); (globalThis as any).window=originalWindow;}
  });
}
test('parcelas em revisão não são selecionadas nem aplicadas e veto explícito independe do ano',()=>{
  const schedule=[{period:0,date:'2024-01-01',percentage:0,status:'promulgated' as const},
    {period:1,date:'2025-01-01',percentage:.2,status:'vetoed' as const},
    {period:2,date:'2026-01-01',percentage:.3,reviewRequired:true}];
  assert.equal(pickPeriodFromScheduleByReference(schedule,2026,10),0);
  assert.equal(pickPeriodFromScheduleByReference(schedule,2026,10,true),1);
  assert.throws(()=>getTablesForPeriod(2,{adjustment_schedule:schedule, bases:{salario:{teste:{A1:1}},funcoes:{}}, values:{}, payrollRules:{vrRateOnCj1:0}} as any),/revisão/);
});

test('restauração preserva valores inválidos para revisão e códigos do catálogo, sem alterar o snapshot', () => {
  const snapshot = { overtimeEntries: [{id:'old',qtd50:-2,qtd100:0,isEA:false,excluirIR:false}], diariasAutoridadeAssistida:'autoridade_configurada' };
  const original = structuredClone(snapshot);
  const restored = hydrateCalculatorState(snapshot);
  assert.equal(restored.overtimeEntries[0].qtd50,-2);
  assert.equal(restored.diariasAutoridadeAssistida,'autoridade_configurada');
  assert.deepEqual(snapshot,original);
  assert.throws(()=>validateCalculationParams(mapStateToAgencyParams(restored)),/overtimeEntries/);
  restored.overtimeEntries[0].qtd50=0;
  assert.doesNotThrow(()=>validateCalculationParams(mapStateToAgencyParams(restored)));
});

test('fallback legado também exige status explícito sem alterar seu cadastro original', () => {
  const legacy={values:{reajustes:[{period:0,percentage:0,date:'2026-01-01'},{period:1,percentage:.08,date:'2027-01-01'}]}} as any;
  const original=structuredClone(legacy);
  const normalized=normalizeLegacyAdjustmentStatus(legacy);
  assert.ok(normalized.adjustment_schedule?.every(entry=>entry.reviewRequired));
  assert.deepEqual(legacy,original);
  assert.equal(resolveAdjustmentStatus({status:'inexistente'} as any).reviewRequired,true);
  assert.equal(resolveAdjustmentStatus({vetoed:false}).status,'promulgated');
});
