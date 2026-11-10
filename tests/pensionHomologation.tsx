import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React, { useCallback, useState } from 'react';
import { act, create } from 'react-test-renderer';
import { ConfigService } from '../src/services/config/ConfigService';
import { mapEffectiveConfigToCourtConfig } from '../src/services/config/mapEffectiveConfig';
import { AgencyCalculationEngine } from '../src/services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../src/services/agency/adapters/stateToParams';
import { useCalculatorResults } from '../src/hooks/calculator/useCalculatorResults';
import { DynamicPayrollForm } from '../src/components/Calculator/DynamicPayrollForm';
import { INITIAL_STATE, type CalculatorState, type CourtConfig, type Rubrica } from '../src/types';
import { applyCalculatorPatch, hydrateCalculatorState, stripCalculatedFieldsFromCalculatorState } from '../src/utils/calculatorState';
import { buildPensionAuditRows } from '../src/utils/pensionExport';

const check = (name: string) => console.log(`APROVADO: ${name}`);

/** Opt-in integration against a configuration-only snapshot, never a remote database. */
export async function runPensionHomologation(db: { query: Function; exec: Function }) {
  const config = async () => mapEffectiveConfigToCourtConfig(await new ConfigService().getEffectiveConfig('jmu'));
  const previousConfig = await config();
  const before = (await db.query('select config_key,config_value,valid_from::text,valid_to::text from power_config order by config_key,valid_from')).rows;
  const original = before.find((row: any) => row.config_key === 'previdencia_complementar' && row.valid_to === null);
  assert.ok(original, 'Configuração previdenciária ativa precisa existir no snapshot.');
  const globalBefore = (await db.query('select * from global_config')).rows;
  const orgBefore = (await db.query('select * from org_config')).rows;
  const sql = await readFile('supabase/migrations/20261105_pju_pension_catalog.sql', 'utf8');
  await db.exec(sql);
  const after = (await db.query('select config_key,config_value,valid_from::text,valid_to::text from power_config order by config_key,valid_from')).rows;
  assert.equal(after.length, before.length + 1);
  const closed = after.find((row: any) => row.config_key === original.config_key && row.valid_from === original.valid_from);
  assert.deepEqual(closed.config_value, original.config_value);
  assert.equal(closed.valid_to, '2026-11-04');
  assert.deepEqual((await db.query('select * from global_config')).rows, globalBefore);
  assert.deepEqual((await db.query('select * from org_config')).rows, orgBefore);
  for (const row of before.filter((item: any) => item !== original)) {
    assert.deepEqual(after.find((item: any) => item.config_key === row.config_key && item.valid_from === row.valid_from), row);
  }
  check('migration sobre a cópia do projeto: uma versão nova; JSON anterior, outras chaves, global e órgão preservados');
  await db.exec(sql);
  assert.deepEqual((await db.query('select config_key,config_value,valid_from::text,valid_to::text from power_config order by config_key,valid_from')).rows, after);
  check('reaplicação idempotente na cópia');
  const effective = await config();
  assert.equal(effective.previdenciaComplementar?.rubricCatalog?.length, 10);
  assert.deepEqual(effective.previdenciaComplementar?.incidenceRules, previousConfig.previdenciaComplementar?.incidenceRules);
  assert.ok(effective.previdenciaComplementar?.historicalRules?.length);
  check('ConfigService e mapper reais leem catálogo e histórico do PostgreSQL local, com merge do órgão');
  await runPensionFormScenarios(effective);
  console.log('Homologação local concluída. Nenhuma escrita externa; navegador, autenticação, RLS e persistência remota não certificados.');
}

/** The same mounted interface scenarios can also consume configuration fetched through public access. */
export async function runPensionFormScenarios(effective: CourtConfig) {
  const cargo = Object.keys(effective.bases.salario)[0];
  const padrao = Object.keys(effective.bases.salario[cargo])[0];
  const initial = (): CalculatorState => ({ ...INITIAL_STATE, anoRef: 2026, mesRef: 'JULHO', periodo: 0,
    cargo, padrao, funcao: effective.careerCatalog!.noFunctionCode, tabelaPSS: '2026',
    tabelaIR: Object.keys(effective.historico_ir)[0], regimePrev: 'rpc', funprespParticipacao: 'patrocinado',
    auxAlimentacao: effective.values?.food_allowance ?? 0,
    funprespAliq: effective.previdenciaComplementar!.sponsoredRate.defaultRpc!, funprespRevisarOpcoes: false,
    manualAdiant13: true, adiant13Venc: 0, adiant13FC: 0, segunda13Venc: 0, segunda13FC: 0,
    rubricasExtras: [], pensionRetroEntries: [] });
  const rubric = (patch: Partial<Rubrica> = {}): Rubrica => ({ id: 'homo-r', tipo: 'C', descricao: 'Crédito hipotético de homologação',
    valor: 1000, incideIR: false, isEA: false, incidePSS: false, pssCompetenciaSeparada: false,
    incideFunpresp: true, pensionRubricId: 'vencimento_basico', ...patch });
  const engine = new AgencyCalculationEngine();
  const agency = { slug: 'jmu', name: 'JMU (homologação local)', type: 'judiciary' };
  async function mount(starting: CalculatorState, courtConfig: CourtConfig = effective) {
    let latest!: ReturnType<typeof useCalculatorResults>;
    let inputs!: CalculatorState;
    let replace!: React.Dispatch<React.SetStateAction<CalculatorState>>;
    function Harness() {
      const [state, setState] = useState(starting);
      inputs = state; replace = setState;
      const update = useCallback((key: keyof CalculatorState, value: any) => setState(old => ({ ...old, [key]: value })), []);
      const updateMany = useCallback((patch: Partial<CalculatorState>) => setState(old => applyCalculatorPatch(old, patch)), []);
      latest = useCalculatorResults(state, engine, courtConfig, agency);
      return <DynamicPayrollForm state={{ ...state, ...latest.calculatedState }} inputState={state} courtConfig={courtConfig}
        update={update} updateMany={updateMany} updateSubstDays={() => {}} preserveRestoredGlobals
        addRubrica={() => {}} removeRubrica={id => setState(old => ({ ...old, rubricasExtras: old.rubricasExtras.filter(item => item.id !== id) }))}
        updateRubrica={(id, field, value) => setState(old => ({ ...old,
          rubricasExtras: old.rubricasExtras.map(item => item.id === id ? { ...item, [field]: value } : item) }))}
        styles={{}} calculationReady={latest.calculationStatus === 'ready'} calculationError={latest.calculationError}
        pensionPending={Boolean(latest.calculationPending)} pensionContexts={latest.pensionContexts} />;
    }
    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<Harness />); });
    return { tree, get result() { return latest; }, get inputs() { return inputs; },
      async change(patch: Partial<CalculatorState>) { await act(async () => replace(old => ({ ...old, ...patch }))); },
      close() { act(() => tree.unmount()); } };
  }
  const ready = (probe: Awaited<ReturnType<typeof mount>>) => {
    assert.equal(probe.result.calculationStatus, 'ready', probe.result.calculationPending?.message ?? probe.result.calculationError ?? '');
    const sum = (type: string) => probe.result.resultRows.filter(row => row.type === type).reduce((total, row) => total + row.value, 0);
    assert.equal(Math.round((sum('C') - sum('D')) * 100), Math.round(probe.result.calculatedState.liquido * 100),
      JSON.stringify({ rows: probe.result.resultRows, bruto: probe.result.calculatedState.totalBruto, descontos: probe.result.calculatedState.totalDescontos, inputs: { tipo: probe.inputs.tipoCalculo, ferias: probe.inputs.ferias1_3, mes: probe.inputs.mesRef } }));
  };
  const base = await mount(initial()); ready(base);
  const baseContribution = base.result.calculatedState.valFunpresp;
  await base.change({ rubricasExtras: [rubric()] }); ready(base);
  assert.equal(Math.round((base.result.calculatedState.valFunpresp - baseContribution) * 100), Math.round(1000 * initial().funprespAliq * 100));
  assert.match(JSON.stringify(base.tree.toJSON()), /Resumo compartilhado da Funpresp/);
  check('formulário completo + hook + motor: patrocinado, total compartilhado e líquido reconciliado'); base.close();
  const absent = await mount({ ...initial(), funprespParticipacao: 'nao', rubricasExtras: [rubric({ incideFunpresp: false })] }); ready(absent);
  assert.equal(absent.result.calculatedState.valFunpresp, 0); check('não participante sem contribuição mensal'); absent.close();
  const linked = await mount({ ...initial(), regimePrev: 'antigo', funprespParticipacao: 'vinculado',
    funprespAliq: effective.previdenciaComplementar!.linkedRate!.min, funprespVinculadaInicio: '2026-07',
    funprespBaseIntegral: 5000 }); ready(linked);
  const linkedBefore = linked.result.calculatedState.valFunpresp;
  await linked.change({ rubricasExtras: [rubric()] }); ready(linked);
  assert.equal(linked.result.calculatedState.valFunpresp, linkedBefore); check('vinculado: crédito não altera remuneração de participação eleita'); linked.close();
  const optional = await mount({ ...initial(), rubricasExtras: [rubric({ pensionRubricId: 'fc_cj' })] });
  assert.equal(optional.result.calculationStatus, 'pension_pending');
  assert.equal(optional.result.resultRows.length, 0);
  await act(async () => optional.tree.root.findByProps({ 'aria-label': 'Data da opção de homo-r' }).props.onChange({ target: { value: '2026-07-20' } }));
  await act(async () => optional.tree.root.findByProps({ 'aria-label': 'Referência da opção de homo-r' }).props.onChange({ target: { value: 'PROTOCOLO-HOMOLOGACAO' } }));
  assert.equal(optional.result.calculationStatus, 'pension_pending');
  const confirmation = optional.tree.root.findAllByType('label').find(label => label.findAllByType('span').some(span =>
    span.children.some(child => typeof child === 'string' && child.includes('O valor lançado considera somente'))))!;
  assert.ok(confirmation, 'Confirmação de parcela elegível disponível no formulário.');
  await act(async () => confirmation.findByType('input').props.onChange({ target: { checked: true } }));
  ready(optional);
  assert.ok(buildPensionAuditRows(optional.result.calculatedState.pensionMemory).some(([key, value]) => key === 'Protocolo da opção expressa' && value === 'PROTOCOLO-HOMOLOGACAO'));
  check('opção facultativa preenchida pela interface: pendente até protocolo e confirmação do valor; auditoria preservada'); optional.close();
  const excluded = await mount({ ...initial(), rubricasExtras: [rubric({ pensionRubricId: 'diarias' })] });
  assert.equal(excluded.result.calculationStatus, 'pension_pending');
  await excluded.change({ rubricasExtras: [rubric({ pensionRubricId: 'diarias', incideFunpresp: false })] }); ready(excluded);
  check('verba excluída: incidência indevida bloqueada e correção retoma cálculo'); excluded.close();
  const historicRule = effective.previdenciaComplementar!.historicalRules![0];
  const originalBase = 0;
  const historical = await mount({ ...initial(), funprespParticipacao: 'nao', rubricasExtras: [rubric({ valor: 10000,
    funprespCompetenciaSeparada: true, pssCompetenciaSeparada: true })], pensionRetroEntries: [{ id: 'homo-retro',
      competencia: '2026-06', tipo: 'mensal', modo: 'completo', destinoIR: 'ea', tabelaPSS: historicRule.tabelaPSS,
      regimePrev: 'rpc', participacao: 'patrocinado', regraHistoricaId: historicRule.id, vinculos: [{ rubricaId: 'homo-r', valor: 10000 }],
      baseRppsOriginal: originalBase, baseComplementarOriginal: originalBase, contribuicaoRppsRecolhida: 0,
      contribuicaoComplementarRecolhida: 0, aliquotaNormal: historicRule.configuration.sponsoredRate.defaultRpc!, aliquotaFacultativa: 0 }] }); ready(historical);
  assert.equal(historical.inputs.funprespParticipacao, 'nao');
  assert.equal(historical.result.calculatedState.pensionMemory!.retroativos[0].entrada!.participacao, 'patrocinado');
  assert.ok(historical.result.calculatedState.pensionMemory!.retroativos[0].complementar > 0);
  const restored = hydrateCalculatorState(JSON.parse(JSON.stringify(stripCalculatedFieldsFromCalculatorState(historical.inputs))));
  const recalculated = await engine.calculateTotal(mapStateToAgencyParams(restored, 'jmu', effective));
  assert.equal(recalculated.netSalary, historical.result.calculatedState.liquido);
  await historical.change({ pensionRetroEntries: [] });
  assert.equal(historical.result.calculationStatus, 'pension_pending'); assert.equal(historical.result.resultRows.length, 0);
  check('regime histórico diferente do atual, restauração e bloqueio após remoção de vínculos'); historical.close();
}
