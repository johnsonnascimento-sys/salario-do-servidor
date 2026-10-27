import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import DailiesForm from '../src/components/Dailies/DailiesForm';
import DailiesResult from '../src/components/Dailies/DailiesResult';
import DailiesConfigEditor from '../src/components/Dailies/DailiesConfigEditor';
import { calculateDailies, resolveDailiesConfig } from '../src/services/agency/dailies';
import type { DailiesConfigPayload, DailiesInput, DailiesVersion } from '../src/services/agency/dailies';

// Test-only fixture. No official legal rate, service, auth, database or production write.
const initialPayload: DailiesConfigPayload = {
  sources: { sintetica: { title: 'FONTE SINTÉTICA — exclusivamente teste visual', url: 'https://example.invalid/diarias-teste', article: 'Exemplo sem valor normativo', published_on: '2026-01-01', effective_from: '2026-01-01' } },
  rates: { servidor: { kind: 'fixed', value: 200, currency: 'BRL', source_ids: ['sintetica'] }, gestor: { kind: 'category_percent', category: 'servidor', percent: 120, currency: 'BRL', source_ids: ['sintetica'] }, embarque: { kind: 'fixed', value: 30, currency: 'BRL', source_ids: ['sintetica'] }, adicional: { kind: 'fixed', value: 20, currency: 'BRL', source_ids: ['sintetica'] } },
  rules: { temporal_basis: 'daily', return_fraction: 0.5, no_overnight_fraction: 0.5, supplied_lodging_fraction: 0.7, supplied_meals_fraction: 0.8, supplied_transport_fraction: 0.9, supplied_reduction_combination: 'multiply', rounding: 'half_up', decimals: 2, deduction_divisor: 30, deduct_meals: true, deduct_transport: true, deduction_days: 'business', deduction_fraction: 'full_day', deduction_cap: 'daily_gross', boarding: { rate: 'embarque', count: 'once', reduction_applies: false }, additional_rates: ['adicional'], allowed_reductions: { glosa_teste: 0.8 } },
  auxiliary: { holidays: [], weekend_days: [0, 6], source_ids: ['sintetica'] },
  limits: { teto_teste: { value: 500, currency: 'BRL', applies_to: 'daily_gross', mandatory: false, source_ids: ['sintetica'] } },
};
initialPayload.rule_sources = Object.fromEntries(Object.keys(initialPayload.rules!).map(key => [key, ['sintetica']]));

function Review() {
  const [input, setInput] = useState<DailiesInput>({ org_slug: 'jmu', competence: '2026-10', mode: 'period', start_date: '2026-10-26', end_date: '2026-10-28', category: 'servidor', circumstances: { boarding: true }, benefits: { meals_monthly: 600, transport_monthly: 0, currency: 'BRL' } });
  const [payload, setPayload] = useState(initialPayload);
  const version: DailiesVersion = { id: 'synthetic-visual-review', revision: 1, status: 'published', scope_type: 'org', scope_key: 'jmu', valid_from: '2026-01-01', valid_to: null, payload };
  const result = calculateDailies(input, [version]);
  let config;
  try { config = resolveDailiesConfig([version], { org_slug: 'jmu' }, input.start_date || input.normative_date || `${input.competence}-01`); } catch { /* Keep diagnostics visible when editing an incomplete fixture. */ }
  return <main className="min-h-screen bg-neutral-50 text-neutral-900 p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <div className="border border-amber-400 rounded-xl bg-amber-50 p-4" role="note"><strong>DADOS SINTÉTICOS — TESTE VISUAL</strong><p>Valores fictícios, sem fundamento jurídico e sem acesso a banco. Data de referência fixa: 26/10/2026.</p></div>
    <header><h1 className="text-3xl font-bold">Diárias — revisão da interface</h1><p className="mt-2 text-neutral-600">Formulário, motor e memória reais com configuração isolada de teste.</p></header>
    <DailiesForm input={input} onChange={setInput} config={config} />
    <DailiesResult result={result} />
    <details className="rounded-xl border bg-white p-5"><summary className="font-bold cursor-pointer">Editor administrativo — configuração sintética local</summary><div className="mt-4"><DailiesConfigEditor value={payload} onChange={setPayload} /></div></details>
  </div></main>;
}

createRoot(document.getElementById('root')!).render(<Review />);
