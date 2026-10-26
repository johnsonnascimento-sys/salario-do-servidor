import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act, create } from 'react-test-renderer';
import DailiesForm from '../src/components/Dailies/DailiesForm';
import DailiesResult from '../src/components/Dailies/DailiesResult';
import DailiesConfigEditor from '../src/components/Dailies/DailiesConfigEditor';
import { calculateDailies } from '../src/services/agency/dailies';
import { useDailies } from '../src/hooks/useDailies';
import { dailiesService } from '../src/services/dailies/DailiesService';
import AdminDailies from '../src/pages/AdminDailies';
import { MemoryRouter } from 'react-router-dom';
import type { DailiesInput, DailiesVersion, ResolvedDailiesConfig } from '../src/services/agency/dailies/types';

const version: DailiesVersion = { id: 'test', revision: 1, status: 'published', scope_type: 'org', scope_key: 'jmu', valid_from: '2026-01-01', valid_to: null,
  payload: { sources: { test: { title: 'Fonte sintética para teste', url: 'https://example.test/norma' } },
    rates: { servidor: { kind: 'fixed', value: 200, currency: 'BRL', source_ids: ['test'] }, embarque: { kind: 'fixed', value: 30, currency: 'BRL', source_ids: ['test'] }, especial: { kind: 'fixed', value: 20, currency: 'BRL', source_ids: ['test'] } },
    auxiliary: { holidays: [], weekend_days: [0, 6] },
    rules: { temporal_basis: 'daily', return_fraction: 0.5, no_overnight_fraction: 0.5, supplied_lodging_fraction: 0.7, supplied_meals_fraction: 0.8, rounding: 'half_up', decimals: 2, deduction_divisor: 30, deduct_meals: false, deduct_transport: false, deduction_days: 'business', deduction_cap: 'daily_gross', boarding: { rate: 'embarque', count: 'once', reduction_applies: false }, additional_rates: ['especial'] } } };
const input: DailiesInput = { org_slug: 'jmu', competence: '2026-10', mode: 'quantity', quantity: 1, category: 'servidor', normative_date: '2026-10-26' };
version.payload.rule_sources = Object.fromEntries(Object.keys(version.payload.rules!).map(key => [key, ['test']]));
const config: ResolvedDailiesConfig = { date: '2026-10-26', context: { org_slug: 'jmu' }, payload: version.payload, provenance: {}, versions: [version] };

function labeledInput(tree: ReturnType<typeof create>, label: string, scope = tree.root) {
  return scope.findAllByType('label').find(node => node.children[0] === label)!.findByType('input');
}

test('formulário usa categorias e circunstâncias configuradas e não apresenta benefícios inaplicáveis', () => {
  let next: DailiesInput | undefined;
  const tree = create(<DailiesForm input={input} onChange={value => { next = value; }} config={config} />);
  const category = tree.root.findAllByType('select').find(node => node.props.value === 'servidor')!;
  assert.deepEqual(category.findAllByType('option').map(node => node.props.value), ['', 'servidor']);
  assert.ok(!JSON.stringify(tree.toJSON()).includes('Auxílio-alimentação'));
  category.props.onChange({ target: { value: 'nova_categoria' } });
  assert.equal(next?.category, 'nova_categoria');
  assert.equal(next?.org_slug, 'jmu');
  tree.unmount();
});

test('resultado indisponível expõe pendência sem apresentar totais parciais', () => {
  const tree = create(<DailiesResult result={{ available: false, issues: [{ code: 'CONFIG_GAP', message: 'Sem versão comprovada' }], parcels: [], totals: { BRL: { gross: 100, net: 100 } as any }, memory: {} as any }} />);
  const rendered = JSON.stringify(tree.toJSON());
  assert.ok(rendered.includes('Sem versão comprovada'));
  assert.ok(!rendered.includes('Total de diárias líquidas'));
  tree.unmount();
});

test('viagem entre competências coleta benefícios separados sem copiar valor único', async () => {
  const monthlyVersion = structuredClone(version);
  Object.assign(monthlyVersion.payload.rules!, { deduct_meals: true, deduct_transport: true, deduction_days: 'all', deduction_fraction: 'full_day' });
  monthlyVersion.payload.rule_sources = Object.fromEntries(Object.keys(monthlyVersion.payload.rules!).map(key => [key, ['test']]));
  const monthlyConfig = { ...config, payload: monthlyVersion.payload };
  let current: DailiesInput = { ...input, mode: 'period', start_date: '2026-10-30', end_date: '2026-11-02', benefits: { currency: 'BRL', meals_monthly: 900, transport_monthly: 300 } };
  function Form() { const [value, setValue] = React.useState(current); current = value; return <DailiesForm input={value} onChange={setValue} config={monthlyConfig} />; }
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<Form />); });
  const month = (key: string) => tree.root.findAllByType('fieldset').find(node => node.findAllByType('legend')[0]?.children.join('') === `Benefícios — ${key}`)!;
  assert.equal(labeledInput(tree, 'Auxílio-alimentação', month('2026-10')).props.value, '');
  assert.equal(labeledInput(tree, 'Auxílio-alimentação', month('2026-11')).props.value, '');
  assert.equal(calculateDailies(current, [monthlyVersion]).issues[0].code, 'AMBIGUOUS_BENEFITS');
  for (const [key, amount] of [['2026-10', 300], ['2026-11', 600]] as const) {
    await act(async () => { labeledInput(tree, 'Moeda dos benefícios (código ISO)', month(key)).props.onChange({ target: { value: 'BRL' } }); });
    await act(async () => { labeledInput(tree, 'Auxílio-alimentação', month(key)).props.onChange({ target: { value: String(amount) } }); });
    await act(async () => { labeledInput(tree, 'Auxílio-transporte', month(key)).props.onChange({ target: { value: '0' } }); });
  }
  assert.equal(current.benefits?.meals_monthly, 900);
  assert.equal(current.benefits_by_month?.['2026-10']?.meals_monthly, 300);
  assert.equal(current.benefits_by_month?.['2026-11']?.meals_monthly, 600);
  const result = calculateDailies(current, [monthlyVersion]);
  assert.equal(result.available, true, JSON.stringify(result.issues));
  assert.equal(result.totals.BRL.food_deduction, 60);
  assert.equal(result.totals.BRL.net, 640);
  await act(async () => tree.unmount());
});

test('editor altera percentual, divisor e limite, com efeito apenas na vigência nova', async () => {
  const candidate = structuredClone(version);
  candidate.id = 'nova'; candidate.valid_from = '2026-11-01';
  candidate.payload.rates = { servidor: { kind: 'reference_percent', reference: 'base', percent: 10, currency: 'BRL', source_ids: ['test'] } };
  candidate.payload.references = { base: { value: 1000, currency: 'BRL', source_ids: ['test'] } };
  candidate.payload.limits = { teto: { value: 500, currency: 'BRL', applies_to: 'daily_rate', source_ids: ['test'] } };
  Object.assign(candidate.payload.rules!, { deduct_meals: true, deduct_transport: false, deduction_divisor: 20, additional_rates: undefined, boarding: undefined });
  delete candidate.payload.rules!.additional_rates; delete candidate.payload.rules!.boarding;
  candidate.payload.rule_sources = Object.fromEntries(Object.keys(candidate.payload.rules!).map(key => [key, ['test']]));
  let payload = candidate.payload;
  function Editor() { const [value, setValue] = React.useState(payload); payload = value; return <DailiesConfigEditor value={value} onChange={setValue} />; }
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<Editor />); });
  const calculate = (date = '2026-11-01') => calculateDailies({ ...input, competence: date.slice(0, 7), normative_date: date, food_deduction_days_quantity: 1, benefits: { currency: 'BRL', meals_monthly: 200 } }, [{ ...version, valid_to: '2026-10-31' }, { ...candidate, payload }]);
  assert.equal(calculate().totals.BRL.net, 90);
  await act(async () => { labeledInput(tree, 'Percentual (%)').props.onChange({ target: { value: '20' } }); });
  assert.equal(calculate().totals.BRL.net, 190);
  await act(async () => { labeledInput(tree, 'Divisor comum dos benefícios').props.onChange({ target: { value: '10' } }); });
  assert.equal(calculate().totals.BRL.net, 180);
  await act(async () => { labeledInput(tree, 'Valor máximo').props.onChange({ target: { value: '150' } }); });
  assert.equal(calculate().totals.BRL.net, 130);
  assert.equal(calculate('2026-10-31').totals.BRL.net, 200);
  await act(async () => tree.unmount());
});

test('hook invalida imediatamente e ignora respostas atrasadas de outro período/órgão', async () => {
  const original = dailiesService.fetchPublishedVersions;
  const calls: Array<{ resolve: (value: any) => void; reject: (error: Error) => void }> = [];
  dailiesService.fetchPublishedVersions = () => new Promise((resolve, reject) => { calls.push({ resolve, reject }); });
  let latest!: ReturnType<typeof useDailies>;
  const renders: typeof latest[] = [];
  function Probe({ value }: { value: DailiesInput }) { latest = useDailies(value, { org_slug: value.org_slug }); renders.push(latest); return null; }
  let tree: ReturnType<typeof create>;
  try {
    await act(async () => { tree = create(<Probe value={input} />); });
    assert.equal(latest.loading, true);
    await act(async () => { calls[0].resolve({ context: { org_slug: 'jmu' }, revision: '1', versions: [version] }); });
    assert.equal(latest.result?.available, true);
    assert.equal(latest.result?.totals.BRL.net, 200);
    const firstChange = renders.length;
    await act(async () => { tree.update(<Probe value={{ ...input, normative_date: '2026-10-27' }} />); });
    assert.equal(renders[firstChange].result, undefined);
    assert.equal(renders[firstChange].loading, true);
    await act(async () => { tree.update(<Probe value={{ ...input, org_slug: 'jf' }} />); });
    await act(async () => { calls[2].resolve({ context: { org_slug: 'jf' }, revision: '2', versions: [{ ...version, scope_key: 'jf', payload: { ...version.payload, rates: { ...version.payload.rates, servidor: { kind: 'fixed', value: 350, currency: 'BRL', source_ids: ['test'] } } } }] }); });
    assert.equal(latest.result?.totals.BRL.net, 350);
    await act(async () => { calls[1].resolve({ context: { org_slug: 'jmu' }, revision: '1', versions: [version] }); });
    assert.equal(latest.result?.totals.BRL.net, 350);
    await act(async () => { tree.update(<Probe value={{ ...input, org_slug: 'jf', normative_date: '2026-10-28' }} />); });
    await act(async () => { calls[3].reject(new Error('indisponível')); });
    assert.equal(latest.result, undefined);
    assert.equal(latest.error, 'indisponível');
  } finally { await act(async () => tree?.unmount()); dailiesService.fetchPublishedVersions = original; }
});

test('desconto que começa na segunda competência fica acessível a partir das fronteiras resolvidas', async () => {
  const original = dailiesService.fetchPublishedVersions;
  const future = structuredClone(version);
  future.id = 'future'; future.valid_from = '2026-11-01';
  Object.assign(future.payload.rules!, { deduct_meals: true, deduction_days: 'all', deduction_fraction: 'full_day' });
  future.payload.rule_sources = Object.fromEntries(Object.keys(future.payload.rules!).map(key => [key, ['test']]));
  dailiesService.fetchPublishedVersions = async () => ({ context: { org_slug: 'jmu' }, revision: '2', versions: [{ ...version, valid_to: '2026-10-31' }, future] });
  let current: DailiesInput = { ...input, mode: 'period', start_date: '2026-10-30', end_date: '2026-11-02' };
  let latest!: ReturnType<typeof useDailies>;
  function Form() { const [value, setValue] = React.useState(current); current = value; latest = useDailies(value, { org_slug: 'jmu' }); return <DailiesForm input={value} onChange={setValue} config={latest.config} configs={latest.configs} />; }
  let tree: ReturnType<typeof create>;
  try {
    await act(async () => { tree = create(<Form />); });
    assert.equal(latest.configs.length, 2);
    assert.equal(latest.result?.issues[0]?.code, 'AMBIGUOUS_BENEFITS');
    const legends = tree.root.findAllByType('legend').map(node => node.children.join(''));
    assert.ok(legends.includes('Benefícios — 2026-11'));
    assert.ok(!legends.includes('Benefícios — 2026-10'));
    await act(async () => { labeledInput(tree, 'Moeda dos benefícios (código ISO)').props.onChange({ target: { value: 'BRL' } }); });
    await act(async () => { labeledInput(tree, 'Auxílio-alimentação').props.onChange({ target: { value: '600' } }); });
    assert.equal(current.benefits_by_month?.['2026-11']?.meals_monthly, 600);
    assert.equal(latest.result?.available, true, JSON.stringify(latest.result?.issues));
  } finally { await act(async () => tree?.unmount()); dailiesService.fetchPublishedVersions = original; }
});

test('digitação preserva campos sem RPC e foco revalida a revisão ocultando apenas o resultado', async () => {
  const original = dailiesService.fetchPublishedVersions;
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  const handlers = new Map<string, () => void>();
  globalThis.window = { addEventListener: (name, handler) => handlers.set(name, handler), removeEventListener: name => handlers.delete(name) } as any;
  globalThis.document = { visibilityState: 'visible', addEventListener: (name, handler) => handlers.set(name, handler), removeEventListener: name => handlers.delete(name) } as any;
  const requests: Array<(value: any) => void> = [];
  dailiesService.fetchPublishedVersions = () => new Promise(resolve => { requests.push(resolve); });
  let current = input;
  let latest!: ReturnType<typeof useDailies>;
  function Probe() { latest = useDailies(current, { org_slug: current.org_slug }); return null; }
  let tree: ReturnType<typeof create>;
  try {
    await act(async () => { tree = create(<Probe />); });
    await act(async () => { requests[0]({ context: { org_slug: 'jmu' }, revision: '1', versions: [version] }); });
    current = { ...input, quantity: 2 };
    await act(async () => { tree.update(<Probe />); });
    assert.equal(requests.length, 1);
    assert.equal(latest.loading, false);
    assert.ok(latest.config);
    assert.equal(latest.result?.totals.BRL.net, 400);
    await act(async () => { handlers.get('focus')!(); });
    assert.equal(requests.length, 2);
    assert.equal(latest.loading, true);
    assert.ok(latest.config);
    assert.equal(latest.result, undefined);
    const updated = structuredClone(version); updated.revision = 2; updated.payload.rates!.servidor = { kind: 'fixed', value: 250, currency: 'BRL', source_ids: ['test'] };
    await act(async () => { requests[1]({ context: { org_slug: 'jmu' }, revision: '2', versions: [updated] }); });
    assert.equal(latest.result?.totals.BRL.net, 500);
    assert.equal(latest.revision, '2');
  } finally {
    await act(async () => tree?.unmount()); dailiesService.fetchPublishedVersions = original;
    if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow;
    if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument;
  }
});

test('admin compara alteração de valor e exige confirmação antes da publicação com predecessor explícito', async () => {
  const originals = { listScopes: dailiesService.listScopes, listVersions: dailiesService.listVersions, cloneVersion: dailiesService.cloneVersion, fetchPublishedVersions: dailiesService.fetchPublishedVersions, publishVersion: dailiesService.publishVersion };
  const published = { ...version, scope_id: 'scope-jmu', reason: 'Teste', change_kind: 'normative' as const, published_at: '2026-01-01', created_at: '2026-01-01', superseded_by: null };
  const draft = { ...published, id: 'draft', revision: 2, status: 'draft' as const, published_at: null, valid_from: '2026-11-01', payload: { ...version.payload, rates: { ...version.payload.rates, servidor: { kind: 'fixed' as const, value: 300, currency: 'BRL', source_ids: ['test'] } } } };
  let cloned = false;
  let publication: unknown[] | undefined;
  dailiesService.listScopes = async () => [{ id: 'scope-jmu', scope_type: 'org', scope_key: 'jmu', label: 'JMU' }];
  dailiesService.listVersions = async () => cloned ? [draft, published] : [published];
  dailiesService.cloneVersion = async () => { cloned = true; return draft; };
  const ranges: string[][] = [];
  const fetch = async (...args: string[]) => { ranges.push(args); return { context: { org_slug: 'jmu' }, revision: '1', versions: [version] }; };
  dailiesService.fetchPublishedVersions = fetch;
  dailiesService.publishVersion = async (...args) => { publication = args; return { ...draft, status: 'published' }; };
  let tree: ReturnType<typeof create>;
  const button = (label: string) => tree.root.findAllByType('button').find(node => node.children.join('') === label)!;
  try {
    await act(async () => { tree = create(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminDailies /></MemoryRouter>); });
    await act(async () => { tree.root.findAllByType('button').find(node => node.findAllByType('span').some(span => span.children.join('').includes('revisão 1')))!.props.onClick(); });
    await act(async () => { button('Clonar versão').props.onClick(); });
    assert.equal(publication, undefined);
    const form = tree.root.findByType(DailiesForm);
    await act(async () => { form.props.onChange({ ...form.props.input, category: 'servidor', normative_date: undefined }); });
    let finish!: (data: any) => void;
    dailiesService.fetchPublishedVersions = () => new Promise(resolve => { finish = resolve; });
    await act(async () => { button('Comparar efeitos do rascunho salvo').props.onClick(); });
    assert.equal(button('Comparar efeitos do rascunho salvo').props.disabled, true);
    // A late external input update must discard the comparison and release the busy state.
    await act(async () => { tree.root.findByType(DailiesForm).props.onChange({ ...tree.root.findByType(DailiesForm).props.input, quantity: 2 }); });
    await act(async () => { finish({ context: { org_slug: 'jmu' }, revision: '1', versions: [version] }); });
    assert.equal(button('Comparar efeitos do rascunho salvo').props.disabled, false);
    assert.equal(tree.root.findAllByType(DailiesResult).length, 0);
    dailiesService.fetchPublishedVersions = fetch;
    await act(async () => { tree.root.findByType(DailiesForm).props.onChange({ ...tree.root.findByType(DailiesForm).props.input, quantity: 1 }); });
    await act(async () => { button('Comparar efeitos do rascunho salvo').props.onClick(); });
    assert.deepEqual(ranges.at(-1), ['jmu', '2026-11-01', '2026-11-30']);
    const results = tree.root.findAllByType(DailiesResult);
    assert.equal(results.length, 2);
    assert.equal(results[0].props.result.totals.BRL.net, 200);
    assert.equal(results[1].props.result.totals.BRL.net, 300);
    assert.equal(button('Publicar versão').props.disabled, true);
    const confirmation = tree.root.findAllByType('label').find(node => node.children.some(child => typeof child === 'string' && child.includes('Confirmo sua publicação')))!.findByType('input');
    await act(async () => { confirmation.props.onChange({ target: { checked: true } }); });
    assert.equal(button('Publicar versão').props.disabled, false);
    await act(async () => { button('Publicar versão').props.onClick(); });
    assert.deepEqual(publication, ['draft', 'test']);
  } finally { await act(async () => tree?.unmount()); Object.assign(dailiesService, originals); }
});
