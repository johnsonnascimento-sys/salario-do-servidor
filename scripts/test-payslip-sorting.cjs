const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

function loadSource(path, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

test('Supabase receives global ordering, tie breakers, pagination and filters', async () => {
  let url;
  let fail = false;
  const supabase = createClient('https://payslips.example.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      url = new URL(input);
      return new Response(JSON.stringify(fail ? { message: 'Falha de consulta' } : []), {
        status: fail ? 500 : 200,
        headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/24' },
      });
    } },
  });
  const { listPayslips } = loadSource('src/services/user/payslipService.ts', {
    '../../lib/supabase': { supabase },
  });
  await listPayslips();
  assert.equal(url.searchParams.get('order'), 'updated_at.desc,id.asc');
  for (const field of ['title', 'reference', 'agency_name', 'liquido']) {
    for (const direction of ['asc', 'desc']) {
      const result = await listPayslips({
        sortBy: field, sortDirection: direction, page: 2, pageSize: 10,
        year: 2026, month: 'OUTUBRO', query: 'simulação',
      });
      const primary = field === 'reference'
        ? `year_ref.${direction},month_ref_order.${direction}.nullslast`
        : `${field}.${direction}`;
      assert.equal(url.searchParams.get('order'), `${primary},updated_at.desc,id.asc`);
      assert.equal(url.searchParams.get('offset'), '10');
      assert.equal(url.searchParams.get('limit'), '10');
      assert.equal(url.searchParams.get('year_ref'), 'eq.2026');
      assert.equal(url.searchParams.get('month_ref'), 'eq.OUTUBRO');
      assert.match(url.searchParams.get('or'), /simulação/);
      assert.equal(result.count, 24);
      assert.equal(result.page, 2);
    }
  }
  fail = true;
  await assert.rejects(listPayslips(), /Falha de consulta/);
});

// Minimal hook host: keeps state/ref cells between renders, without DOM dependencies.
function hookHost(service) {
  const cells = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = initial;
      return [cells[index], (value) => { cells[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in cells)) cells[index] = { current: initial };
      return cells[index];
    },
    useCallback: (callback) => callback,
    useEffect: () => {},
  };
  const { useUserPayslips } = loadSource('src/hooks/user/useUserPayslips.ts', {
    react, '../../services/user/payslipService': service,
  });
  return () => {
    cursor = 0;
    return useUserPayslips({ page: 1, pageSize: 10 });
  };
}

const listResult = (filters, count = 24) => ({
  data: [{ id: 'record' }], count, page: filters.page || 1, pageSize: 10,
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

test('Mutation reload uses current sorting and applied filters; final empty page is corrected', async () => {
  const calls = [];
  const insert = deferred();
  let count = 24;
  const render = hookHost({
    listPayslips: async (filters) => { calls.push({ ...filters }); return listResult(filters, count); },
    createPayslip: () => insert.promise,
    deletePayslip: async () => {},
  });
  await render().reload({ query: 'aplicado', year: 2026, sortBy: 'title', sortDirection: 'asc' });
  const duplicate = render().create({});
  assert.equal(render().loading, true);
  await render().reload({ sortBy: 'liquido', sortDirection: 'desc' });
  insert.resolve({ id: 'copy' });
  await duplicate;
  assert.equal(render().loading, false);
  assert.equal(calls.at(-1).sortBy, 'liquido');
  assert.equal(calls.at(-1).sortDirection, 'desc');
  assert.equal(calls.at(-1).query, 'aplicado');
  await render().reload({ page: 3 });
  count = 20;
  await render().remove('record');
  assert.equal(render().result.page, 2);
  assert.equal(render().filters.sortBy, 'liquido');
});

test('Obsolete responses cannot overwrite sorting; failures retain applied state', async () => {
  const slow = deferred();
  let fail = false;
  const render = hookHost({
    listPayslips: async (filters) => {
      if (fail) throw new Error('Indisponível');
      return filters.sortBy === 'title' ? slow.promise : listResult(filters);
    },
  });
  const pending = render().reload({ sortBy: 'title', sortDirection: 'asc' });
  await render().reload({ sortBy: 'reference', sortDirection: 'desc' });
  slow.resolve(listResult({ page: 1 }));
  await pending;
  assert.equal(render().filters.sortBy, 'reference');
  fail = true;
  await assert.rejects(render().reload({ sortBy: 'liquido' }), /Indisponível/);
  assert.equal(render().filters.sortBy, 'reference');
  assert.equal(render().error, 'Indisponível');
  assert.equal(render().loading, false);
});

test('Table headers expose accessible sorting and reset the page on every click', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let filters = {};
  let loading = false;
  let error = null;
  const requests = [];
  const { default: Page } = loadSource('src/pages/UserPayslipsPage.tsx', {
    react: { ...React, useMemo: (fn) => fn(), useState: (initial) => [initial, () => {}] },
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react-router-dom': {
      useNavigate: () => () => {},
      Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children),
    },
    'lucide-react': require('lucide-react'),
    '../hooks/user/useUserPayslips': { useUserPayslips: () => ({
      filters, loading, error, result: { data: [], page: 2, pageSize: 10, count: 24 },
      reload: async (next) => { requests.push(next); },
    }) },
    '../utils/calculations': { formatCurrency: String },
    '../services/exportService': {},
  });
  function collect(element, type) {
    if (!element || typeof element !== 'object') return [];
    return [
      ...(element.type === type ? [element] : []),
      ...React.Children.toArray(element.props?.children).flatMap((child) => collect(child, type)),
    ];
  }
  for (const [index, field] of ['title', 'reference', 'agency_name', 'liquido'].entries()) {
    for (const direction of [undefined, 'asc', 'desc']) {
      filters = direction ? { sortBy: field, sortDirection: direction } : {};
      const header = collect(Page(), 'th')[index];
      assert.equal(header.props['aria-sort'], direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none');
      const button = header.props.children;
      assert.equal(button.props.type, 'button');
      assert.match(button.props.className, /focus-visible:ring-2/);
      await button.props.onClick();
      assert.equal(requests.at(-1).sortBy, field);
      assert.equal(requests.at(-1).sortDirection, direction === 'asc' ? 'desc' : 'asc');
      assert.equal(requests.at(-1).page, 1);
      assert.equal('query' in requests.at(-1), false);
    }
  }
  assert.equal(collect(Page(), 'th')[4].props.children, 'Ações');
  loading = true;
  assert.equal(collect(Page(), 'th')[0].props.children.props.disabled, true);
  assert.match(renderToStaticMarkup(Page()), /Carregando/);
  loading = false;
  assert.match(renderToStaticMarkup(Page()), /Nenhum holerite salvo/);
  error = 'Falha de consulta';
  assert.match(renderToStaticMarkup(Page()), /Falha de consulta/);
});
