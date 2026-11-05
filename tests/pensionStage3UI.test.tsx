import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { PensionRubricFields } from '../src/components/Calculator/PensionRubricFields';
import { ManualRubricasSection } from '../src/components/Calculator/ManualRubricasSection';
import { useCalculatorState } from '../src/hooks/calculator/useCalculatorState';
import { buildPensionAuditRows } from '../src/utils/pensionExport';
import type { PrevidenciaComplementarConfig, Rubrica } from '../src/types';
import type { PensionMemory, PensionRubricAssessment } from '../src/types/pension';

const config: PrevidenciaComplementarConfig = { enabled: true, scope: 'teste', baseRule: 'excedente_teto_rgps',
  sponsoredRate: { min: .05, max: .09, step: .005 }, facultativeRate: { minIfPositive: .02, default: 0 },
  rubricCatalog: ['obrigatoria', 'facultativa', 'excluida'].map(classification => ({ id: classification, label: classification,
    classification: classification as 'obrigatoria' | 'facultativa' | 'excluida', validFrom: '2026-01', source: 'https://example.test/rule' })) };
const rubric = (patch: Partial<Rubrica> = {}): Rubrica => ({ id: 'r', descricao: 'Teste', tipo: 'C', valor: 100,
  incideIR: false, isEA: false, incidePSS: false, pssCompetenciaSeparada: false, incideFunpresp: true,
  pensionRubricId: 'facultativa', pensionOptionDate: '2026-07-20', pensionOptionReference: 'Protocolo', pensionOptionAmountConfirmed: true, ...patch });

test('natureza mensal orienta a incidência e a histórica preserva a escolha para validação própria', () => {
  for (const historical of [false, true]) {
    const updates: unknown[][] = [];
    const tree = create(<PensionRubricFields rubrica={rubric({ pssCompetenciaSeparada: historical })} competencia="2026-07"
      config={config} styles={{}} updateRubrica={(...args) => updates.push(args)} />);
    act(() => tree.root.findByType('select').props.onChange({ target: { value: 'obrigatoria' } }));
    assert.deepEqual(updates, historical ? [['r', 'pensionRubricId', 'obrigatoria']]
      : [['r', 'pensionRubricId', 'obrigatoria'], ['r', 'incideFunpresp', true]]);
    const text = JSON.stringify(tree.toJSON());
    assert.match(text, historical ? /cada competência original/ : /Consultar fundamento/);
    tree.unmount();
  }
});

test('protocolo alterado exige nova confirmação e seleção salva desconhecida continua visível', () => {
  const updates: unknown[][] = [];
  const tree = create(<PensionRubricFields rubrica={rubric()} competencia="2026-07" config={config} styles={{}}
    updateRubrica={(...args) => updates.push(args)} />);
  act(() => tree.root.findByProps({ type: 'date' }).props.onChange({ target: { value: '2026-07-21' } }));
  assert.deepEqual(updates, [['r', 'pensionOptionDate', '2026-07-21'], ['r', 'pensionOptionAmountConfirmed', false]]);
  act(() => tree.update(<PensionRubricFields rubrica={rubric({ pensionRubricId: 'antiga' })} competencia="2026-07"
    config={undefined} styles={{}} updateRubrica={() => {}} />));
  assert.equal(tree.root.findByType('select').props.value, 'antiga');
  assert.match(JSON.stringify(tree.toJSON()), /salvo indisponível|Catálogo previdenciário indisponível/);
  tree.unmount();
});

test('incidência mensal divergente pode ser corrigida diretamente após mudança de competência', () => {
  for (const [nature, included] of [['obrigatoria', false], ['excluida', true]] as const) {
    for (const aligned of [false, true]) {
      const tree = create(<ManualRubricasSection rubricas={[rubric({ pensionRubricId: nature, incideFunpresp: aligned ? !included : included })]}
        styles={{}} totalCreditos={100} totalDescontos={0} calculationReady={false} funprespParticipacao="patrocinado"
        pensionConfig={config} competencia="2026-07" addRubrica={() => {}} removeRubrica={() => {}}
        updateRubrica={() => {}} toPositiveNumber={Number} />);
      const label = tree.root.findAllByType('label').find(node => node.findAllByType('span').some(span =>
        span.children.join('').includes('Incluir na base da Funpresp')))!;
      assert.equal(label.findByType('input').props.disabled, aligned);
      tree.unmount();
    }
  }
});

test('edições de valor e natureza invalidam a confirmação sem apagar as informações da opção', () => {
  let hook!: ReturnType<typeof useCalculatorState>;
  function Probe() { hook = useCalculatorState(); return null; }
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<MemoryRouter initialEntries={[{ pathname: '/', state: { startBlank: true } }]}><Probe /></MemoryRouter>); });
  for (const [field, value] of [['valor', 200], ['pensionRubricId', 'obrigatoria'], ['funprespCompetenciaSeparada', true]] as const) {
    act(() => hook.setState(state => ({ ...state, rubricasExtras: [rubric()] })));
    act(() => hook.updateRubrica('r', field, value));
    assert.equal(hook.state.rubricasExtras[0].pensionOptionAmountConfirmed, false);
    assert.equal(hook.state.rubricasExtras[0].pensionOptionReference, 'Protocolo');
  }
  act(() => hook.setState(state => ({ ...state, rubricasExtras: [rubric()] })));
  act(() => hook.updateRubrica('r', 'pensionOptionReference', 'Outro protocolo'));
  assert.equal(hook.state.rubricasExtras[0].pensionOptionAmountConfirmed, false);
  act(() => hook.setState(state => ({ ...state, anoRef: 2026, mesRef: 'JULHO', rubricasExtras: [rubric()] })));
  act(() => hook.updateMany({ mesRef: 'AGOSTO' }));
  assert.equal(hook.state.rubricasExtras[0].pensionOptionAmountConfirmed, false);
  act(() => tree.unmount());
});

test('auditoria exportável apresenta fonte e protocolo por competência sem ratear contribuição', () => {
  const assessment: PensionRubricAssessment = { rubricaId: 'r', ruleId: 'facultativa', classification: 'facultativa',
    source: 'https://example.test/rule', competencia: '2026-07', optionDate: '2026-07-20', optionReference: 'Protocolo', optionAmountConfirmed: true };
  const memory = { mensal: { competencia: '2026-07', tipo: 'mensal', componentes: {}, enquadramentos: [assessment] },
    retroativos: [{ competencia: '2026-06', enquadramentos: [{ ...assessment, competencia: '2026-06', source: 'https://example.test/past' }] }] } as unknown as PensionMemory;
  const rows = buildPensionAuditRows(memory);
  assert.ok(rows.some(([label, value]) => label === 'Fonte do enquadramento' && value === 'https://example.test/past'));
  assert.ok(rows.some(([label, value]) => label === 'Protocolo da opção expressa' && value === 'Protocolo'));
  assert.ok(rows.some(([label, value]) => label === 'Competência do enquadramento' && value === '2026-07'));
  assert.equal(rows.some(([, value]) => String(value).includes('[object Object]')), false);
});
