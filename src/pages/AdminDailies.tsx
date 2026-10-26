import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { calculateDailies, resolveDailiesConfig } from '../services/agency/dailies';
import type { DailiesCalculationResult, DailiesConfigPayload, DailiesInput, DailiesVersion, ResolvedDailiesConfig } from '../services/agency/dailies/types';
import { dailiesService, type DailiesDraft, type DailiesScopeRecord, type DailiesVersionRecord } from '../services/dailies/DailiesService';
import DailiesConfigEditor from '../components/Dailies/DailiesConfigEditor';
import DailiesForm, { DailiesField as Field, dailiesFieldClass as field } from '../components/Dailies/DailiesForm';
import DailiesResult from '../components/Dailies/DailiesResult';

const button = 'rounded-lg border px-4 py-2 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed';
const primary = `${button} bg-secondary-600 text-white hover:bg-secondary-700`;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'A operação não pôde ser concluída.';
type Comparison = { before: DailiesCalculationResult; after: DailiesCalculationResult; inherited?: ResolvedDailiesConfig };

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (value === null || typeof value !== 'object') return { [prefix]: String(value) };
  return Object.assign({}, ...Object.entries(value).map(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key)));
}

export default function AdminDailies() {
  const [scopes, setScopes] = useState<DailiesScopeRecord[]>([]);
  const [versions, setVersions] = useState<DailiesVersionRecord[]>([]);
  const [scopeId, setScopeId] = useState('');
  const [selected, setSelected] = useState<DailiesVersionRecord>();
  const [draft, setDraft] = useState<DailiesDraft>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [comparison, setComparison] = useState<Comparison>();
  const [previewConfig, setPreviewConfig] = useState<ResolvedDailiesConfig>();
  const [previewInput, setPreviewInput] = useState<DailiesInput>({ org_slug: 'jmu', competence: '', mode: 'quantity', quantity: 1, category: '' });
  const generation = useRef(0);

  const load = async () => {
    const [nextScopes, nextVersions] = await Promise.all([dailiesService.listScopes(), dailiesService.listVersions()]);
    setScopes(nextScopes); setVersions(nextVersions);
  };
  useEffect(() => { setBusy(true); load().catch(e => setError(errorMessage(e))).finally(() => setBusy(false)); }, []);

  const change = (next: DailiesDraft) => { generation.current++; setDraft(next); setDirty(true); setComparison(undefined); setConfirmed(false); setNotice(''); };
  const select = (version: DailiesVersionRecord) => {
    generation.current++; setSelected(version); setScopeId(version.scope_id); setDirty(false); setComparison(undefined); setPreviewConfig(undefined); setConfirmed(false); setError(''); setNotice('');
    setDraft({ id: version.id, scopeId: version.scope_id, payload: structuredClone(version.payload), validFrom: version.valid_from, validTo: version.valid_to, reason: version.reason, changeKind: version.change_kind });
    setPreviewInput({ org_slug: 'jmu', mode: 'quantity', quantity: 1, competence: version.valid_from?.slice(0, 7) || '', normative_date: version.valid_from || undefined, category: '' });
  };
  const fresh = () => {
    generation.current++; setSelected(undefined); setDirty(true); setComparison(undefined); setPreviewConfig(undefined); setConfirmed(false); setError(''); setNotice('');
    setDraft({ scopeId: scopeId || scopes[0]?.id || '', payload: {}, validFrom: null, validTo: null, reason: '', changeKind: 'normative' });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft || busy) return;
    setBusy(true); setError('');
    try { const saved = await dailiesService.saveDraft(draft); await load(); select(saved); setNotice('Rascunho salvo. Compare os efeitos antes de publicar.'); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const clone = async () => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { const cloned = await dailiesService.cloneVersion(selected.id); await load(); select(cloned); setNotice('Cópia criada como rascunho. Confira datas, fundamento e motivo.'); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const preview = async () => {
    if (!draft?.validFrom || !draft.id || dirty || busy) return;
    const request = ++generation.current;
    setBusy(true); setError(''); setConfirmed(false);
    try {
      const from = previewInput.mode === 'period' ? previewInput.start_date : previewInput.normative_date || `${previewInput.competence}-01`;
      if (!from) throw new Error('Informe as datas da simulação de impacto.');
      const published = await dailiesService.getForInput(previewInput);
      const scope = scopes.find(s => s.id === draft.scopeId)!;
      if ((scope.scope_type === 'org' && scope.scope_key !== published.context.org_slug) || (scope.scope_type === 'power' && scope.scope_key !== published.context.power) || (scope.scope_type === 'branch' && scope.scope_key !== published.context.branch)) throw new Error('O órgão escolhido não pertence ao âmbito deste rascunho.');
      const dayBefore = (date: string) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
      // Publication closes its explicit predecessor on the eve of the new version.
      const candidate: DailiesVersion = { id: draft.id, scope_type: scope.scope_type, scope_key: scope.scope_key, valid_from: draft.validFrom, valid_to: draft.validTo, status: 'published', payload: draft.payload, revision: selected?.revision || 1 };
      const nextVersions = published.versions.filter(v => !(draft.changeKind === 'correction' && v.scope_type === scope.scope_type && v.scope_key === scope.scope_key && v.valid_from === draft.validFrom && v.valid_to === draft.validTo)).map(v => draft.changeKind === 'normative' && v.scope_type === scope.scope_type && v.scope_key === scope.scope_key && v.valid_from < draft.validFrom! && (!v.valid_to || v.valid_to >= draft.validFrom!) ? { ...v, valid_to: dayBefore(draft.validFrom!) } : v);
      nextVersions.push(candidate);
      let inherited;
      try { inherited = resolveDailiesConfig(published.versions, published.context, from); } catch { /* An initial version can make a previously unavailable period available. */ }
      const result = { before: calculateDailies(previewInput, published.versions, published.context), after: calculateDailies(previewInput, nextVersions, published.context), inherited };
      if (request === generation.current) { setComparison(result); setPreviewConfig(inherited); }
    } catch (e) { if (request === generation.current) setError(errorMessage(e)); } finally { setBusy(false); }
  };
  const overlapping = draft?.validFrom ? versions.filter(v => v.scope_id === draft.scopeId && v.status === 'published' && !v.superseded_by && (draft.changeKind === 'correction' ? v.valid_from === draft.validFrom && v.valid_to === draft.validTo : v.valid_from! < draft.validFrom! && (!v.valid_to || v.valid_to >= draft.validFrom!))) : [];
  const publish = async () => {
    if (!draft?.id || !confirmed || !comparison || dirty || busy) return;
    setBusy(true); setError('');
    try {
      if (overlapping.length > 1) throw new Error('Há mais de uma versão sobreposta; corrija o histórico antes de publicar.');
      const published = await dailiesService.publishVersion(draft.id, overlapping[0]?.id); await load(); select(published); setNotice('Versão publicada. As próximas simulações resolverão a vigência cadastrada.');
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  const readonly = selected?.status === 'published';
  const filtered = versions.filter(v => !scopeId || v.scope_id === scopeId);
  const changed = draft ? flatten(draft.payload) : {};
  const original = selected ? flatten(selected.payload) : {};
  const changedKeys = Array.from(new Set([...Object.keys(changed), ...Object.keys(original)])).filter(k => changed[k] !== original[k]);

  return <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-8 text-neutral-900 dark:text-white"><div className="max-w-7xl mx-auto">
    <Link to="/admin/hub" className="text-secondary-700 underline">Painel administrativo</Link><h1 className="text-3xl font-bold my-4">Configuração de diárias</h1><p className="text-neutral-600 dark:text-neutral-400 mb-6">Histórico próprio de diárias. Publicação exige fundamento, vigência e confirmação dos efeitos; versões publicadas conservam seu conteúdo.</p>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-900 p-4 mb-4">{error}</p>}{notice && <p role="status" className="rounded-lg border border-green-300 bg-green-50 text-green-900 p-4 mb-4">{notice}</p>}{busy && <p role="status" className="mb-4">Processando…</p>}
    <div className="grid lg:grid-cols-[19rem_1fr] gap-6"><aside className="space-y-4"><Field label="Filtrar por âmbito"><select disabled={busy} className={field} value={scopeId} onChange={e => setScopeId(e.target.value)}><option value="">Todos os âmbitos</option>{scopes.map(s => <option key={s.id} value={s.id}>{s.label} ({s.scope_type})</option>)}</select></Field><button disabled={busy || !scopes.length} className={primary} onClick={fresh}>Novo rascunho</button><div className="space-y-2 max-h-[65vh] overflow-y-auto">{filtered.map(v => <button disabled={busy} type="button" key={v.id} onClick={() => select(v)} className={`block text-left w-full rounded-lg border p-3 ${selected?.id === v.id ? 'border-secondary-600 bg-secondary-50 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900'}`}><span className="font-bold">{v.scope_key} · revisão {v.revision}</span><br /><span className="text-sm">{v.status === 'published' ? 'Publicada' : 'Rascunho'}{v.legacy_snapshot ? ' · legado não validado' : ''}<br />{v.valid_from || 'Início não comprovado'} a {v.valid_to || 'sem término'}</span></button>)}{!busy && !filtered.length && <p className="text-sm text-neutral-500">Nenhuma versão cadastrada neste âmbito.</p>}</div></aside>
    <div>{!draft ? <p className="rounded-xl bg-white dark:bg-neutral-900 border p-6">Selecione uma versão ou crie um rascunho.</p> : <>
      <form onSubmit={save} className="rounded-xl bg-white dark:bg-neutral-900 border p-5 md:p-6"><div className="flex justify-between items-start gap-4 mb-5"><h2 className="text-xl font-bold">{readonly ? 'Versão publicada' : draft.id ? 'Editar rascunho' : 'Novo rascunho'}</h2>{selected && <button type="button" disabled={busy} className={button} onClick={clone}>Clonar versão</button>}</div>
        {readonly && <p className="mb-4 text-sm">Para alterar este conteúdo, clone a versão. Publicação: {selected.published_at || 'não informada'}.</p>}
        <fieldset disabled={readonly || busy}><div className="grid sm:grid-cols-2 gap-4">
          <Field label="Âmbito"><select required className={field} value={draft.scopeId} onChange={e => change({ ...draft, scopeId: e.target.value })}><option value="">Selecione</option>{scopes.map(s => <option key={s.id} value={s.id}>{s.label} · {s.scope_type}/{s.scope_key}</option>)}</select></Field>
          <Field label="Tipo de alteração"><select className={field} value={draft.changeKind} onChange={e => change({ ...draft, changeKind: e.target.value as DailiesDraft['changeKind'] })}><option value="normative">Atualização normativa</option><option value="correction">Correção cadastral</option></select></Field>
          <Field label="Início da vigência (inclusive)"><input className={field} type="date" value={draft.validFrom || ''} onChange={e => change({ ...draft, validFrom: e.target.value || null })} /></Field><Field label="Término da vigência (inclusive; vazio = continuidade)"><input className={field} type="date" min={draft.validFrom || undefined} value={draft.validTo || ''} onChange={e => change({ ...draft, validTo: e.target.value || null })} /></Field>
          <div className="sm:col-span-2"><Field label="Motivo e justificativa da revisão"><textarea required className={field} value={draft.reason} rows={3} onChange={e => change({ ...draft, reason: e.target.value })} /></Field></div>
        </div><DailiesConfigEditor value={draft.payload} onChange={payload => change({ ...draft, payload })} />
        </fieldset>
        {!readonly && <div className="mt-6"><button className={primary} disabled={busy || !dirty}>Salvar rascunho</button><p className="text-sm text-neutral-500 mt-2">Salvar rascunho não altera simulações publicadas. Uma versão sem início comprovado pode ser preservada, mas não publicada.</p></div>}
        {dirty && changedKeys.length > 0 && <details className="mt-4"><summary className="cursor-pointer">Alterações ainda não salvas ({changedKeys.length})</summary><ul className="text-sm mt-2 space-y-1">{changedKeys.map(k => <li key={k}>{k}: {original[k] ?? 'herdado'} → {changed[k] ?? 'herdado'}</li>)}</ul></details>}
      </form>
      {!readonly && draft.id && <section className="mt-6 rounded-xl border bg-white dark:bg-neutral-900 p-5"><h2 className="text-xl font-bold mb-3">Comparar e publicar</h2><p className="text-sm mb-4">A comparação usa o mesmo motor da simulação. Confira um enquadramento e período representativos. Uma versão anterior sobreposta será encerrada na véspera do novo início.</p>
        <Field label="Órgão para verificar impacto"><select disabled={busy} className={field} value={previewInput.org_slug} onChange={e => { generation.current++; setPreviewInput({ ...previewInput, org_slug: e.target.value }); setComparison(undefined); setPreviewConfig(undefined); setConfirmed(false); }}><option value="jmu">Justiça Militar da União</option><option value="jf">Justiça Federal</option></select></Field>
        <fieldset disabled={busy} className="my-4"><DailiesForm input={previewInput} onChange={input => { generation.current++; setPreviewInput(input); setComparison(undefined); setConfirmed(false); }} config={{ date: draft.validFrom || '', context: { org_slug: previewInput.org_slug }, payload: { ...previewConfig?.payload, ...draft.payload, rules: { ...previewConfig?.payload.rules, ...draft.payload.rules }, rates: { ...previewConfig?.payload.rates, ...draft.payload.rates } }, provenance: {}, versions: [] }} /></fieldset>
        <button type="button" className={button} disabled={busy || dirty || !draft.validFrom} onClick={preview}>Comparar efeitos do rascunho salvo</button>
        {dirty && <p className="text-sm mt-2">Salve as alterações para comparar e publicar.</p>}
        {comparison && <div className="mt-4 space-y-4"><h3 className="font-bold">Configuração atualmente publicada</h3><DailiesResult result={comparison.before} /><h3 className="font-bold">Resultado com o rascunho</h3><DailiesResult result={comparison.after} />
          {comparison.inherited && <details><summary className="cursor-pointer font-semibold">Valores atuais e origem herdada</summary><dl className="text-sm mt-2 space-y-1">{Object.entries(flatten(comparison.inherited.payload)).map(([path, value]) => <div key={path}><dt className="font-medium">{path}: {value}</dt><dd>{comparison.inherited?.provenance[path]?.scope_key || 'Veja a origem do bloco na memória de cálculo'}</dd></div>)}</dl></details>}
          <p className="text-sm">Vigência a publicar: {draft.validFrom} a {draft.validTo || 'sem término'}. {overlapping.length ? `Encerra a revisão ${overlapping[0].revision} do mesmo âmbito na véspera.` : 'Não há predecessor a encerrar no mesmo âmbito.'}</p>
          <label className="flex gap-2 items-start"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={!comparison.after.available || busy} />Conferi os fundamentos, datas e impacto da versão. Confirmo sua publicação.</label>
          <button type="button" className={primary} disabled={busy || dirty || !confirmed || !comparison.after.available} onClick={publish}>Publicar versão</button>
        </div>}
      </section>}
    </>}</div></div>
  </div></main>;
}
