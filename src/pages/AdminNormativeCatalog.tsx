import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NormativeActForm, { action, CatalogInput, CatalogSelect, OrgOptions } from '../components/Admin/NormativeActForm';
import {
  actTitle, applicationOnDate, filterCatalog, implementationLabels, listActRevisions, listNormativeActs, organs, saveNormativeAct,
  type Act, type ActDocument, type ActRelation, type ActRevision, type CatalogFilters,
} from '../services/admin/normativeCatalog';

const formatDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')
  ? value.split('-').reverse().join('/') : 'Não confirmada';
const errorMessage = (value: unknown) => value && typeof value === 'object' && 'message' in value
  ? String(value.message) : 'Não foi possível concluir a operação.';
const orgName = (value: string) => organs[value as keyof typeof organs] ?? value;
const box = 'rounded-lg border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900';

const effectLabels = { active: 'Aplicável na data', pending: 'Início a confirmar', ended: 'Efeitos encerrados na data', future: 'Efeitos ainda não iniciados' };

function DocumentDetail({ document, acts, date, incoming = [] }: {
  document: ActDocument; acts: Act[]; date?: string; incoming?: ActRelation[];
}) {
  return <div className="space-y-3 break-words">
    <p>{document.summary}</p>
    <p>{/^https:\/\//i.test(document.source) ? <a href={document.source} target="_blank" rel="noreferrer"
      className="text-secondary-700 underline dark:text-secondary-300">Abrir fonte oficial</a> : 'Fonte oficial não informada'}</p>
    <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
      <div><dt className="font-medium">Publicação</dt><dd>{formatDate(document.publication)}</dd></div>
      <div><dt className="font-medium">Última conferência</dt><dd>{formatDate(document.checkedOn)}</dd></div>
      <div><dt className="font-medium">Início da vigência</dt><dd>{formatDate(document.validFrom)}</dd></div>
      <div><dt className="font-medium">Fim da vigência</dt><dd>{formatDate(document.validTo)}</dd></div>
    </dl>
    {(!document.source || !document.validFrom || !document.checkedOn) && <p className="font-medium">Cadastro normativo a conferir</p>}
    {document.notes && <p>{document.notes}</p>}
    <h3 className="font-semibold">Aplicações por órgão</h3>
    {document.applications.length === 0 && <p>Nenhuma aplicação cadastrada.</p>}
    {document.applications.map(item => <div key={item.id} className="space-y-1 rounded-md border border-gray-200 p-3 dark:border-neutral-700">
      <h4 className="font-medium">{orgName(item.org)} · {item.subject} · {item.rule}</h4>
      <p>{item.provision} · {implementationLabels[item.status]}</p>
      <p>{item.impact}</p>
      <p className="text-body-sm">Início dos efeitos: {formatDate(item.from)} · Último dia: {formatDate(item.to)}</p>
      {date && <p className="text-body-sm font-medium">{effectLabels[applicationOnDate(item, date, incoming)]}</p>}
      {item.evidence && <p className="text-body-sm">Evidência: {item.evidence}</p>}
    </div>)}
    {document.relations.length > 0 && <div className="space-y-2">
      <h3 className="font-semibold">Atos anteriores relacionados</h3>
      <ul className="list-disc space-y-1 pl-5">
        {document.relations.map((relation, index) => {
          const target = acts.find(act => act.id === relation.targetId);
          const application = target?.document.applications.find(item => item.id === relation.applicationId);
          return <li key={index}>
            {relation.kind === 'amends' ? 'Altera' : 'Revoga'} {target ? actTitle(target.document) : 'ato anterior'}
            {' · '}{relation.provision}{application && ` · ${application.rule} (${orgName(application.org)})`}
            {relation.applicationId === '*' && ' · Ato inteiro'}
            {' · Efeito: '}{formatDate(relation.from)}
          </li>;
        })}
      </ul>
    </div>}
  </div>;
}

const RevisionHistory: React.FC<{ act: Act; acts: Act[] }> = ({ act, acts }) => {
  const [revisions, setRevisions] = useState<ActRevision[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    listActRevisions(act.id).then(rows => {
      if (!cancelled) setRevisions(rows);
    }).catch(reason => {
      if (!cancelled) setError(errorMessage(reason));
    });
    return () => { cancelled = true; };
  }, [act.id, act.revision]);
  return <section className="space-y-2">
    <h3 className="font-semibold">Histórico de edições</h3>
    {error ? <p role="alert">{error}</p> : revisions === null ? <p>Carregando histórico…</p> :
      revisions.length === 0 ? <p>Nenhuma edição anterior.</p> : revisions.map(item => <details key={item.revision} className={box}>
        <summary className="cursor-pointer">Revisão {item.revision} · {new Date(item.changed_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</summary>
        <div className="mt-3 space-y-2">
          <p className="break-all text-body-sm">Identificador do responsável pela edição: {item.changed_by}</p>
          <p className="font-medium">{actTitle(item.previous_document)}</p>
          <DocumentDetail document={item.previous_document} acts={acts} />
        </div>
      </details>)}
  </section>;
};

export default function AdminNormativeCatalog() {
  const [acts, setActs] = useState<Act[] | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>({ query: '', org: '', status: '', date: '', archived: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Act | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError('');
    listNormativeActs().then(rows => {
      if (!cancelled) setActs(rows);
    }).catch(reason => {
      if (!cancelled) setLoadError(errorMessage(reason));
    });
    return () => { cancelled = true; };
  }, [reload]);

  const filter = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    setSelected(null);
    setFilters(previous => ({ ...previous, [key]: value }));
  };
  const startEdit = (act: Act | null) => {
    setSaveError(''); setNotice(''); setConflict(false); setEditing(act);
  };
  const save = async (document: ActDocument) => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const id = await saveNormativeAct(editing ?? null, document);
      setEditing(undefined);
      setSelected(id);
      setNotice('Ato salvo.');
      setReload(value => value + 1);
    } catch (reason) {
      setSaveError(errorMessage(reason));
      if (reason && typeof reason === 'object' && 'code' in reason && reason.code === '40001') setConflict(true);
    } finally {
      setSaving(false);
    }
  };
  const active = acts?.find(act => act.id === selected);
  const results = acts ? filterCatalog(acts, filters) : [];
  const renderList = (pending: boolean) => results.filter(item => item.pending === pending).map(({ act }) =>
    <li key={act.id}>
      <button type="button" className={`${action} w-full text-left`} aria-pressed={selected === act.id} onClick={() => setSelected(act.id)}>
        <span className="block font-medium">{actTitle(act.document)}{act.document.archived && ' · Arquivado'}</span>
        <span className="block text-body-sm">{act.document.summary}</span>
      </button>
    </li>);

  return <main className="min-h-screen bg-gray-50 p-4 text-gray-900 dark:bg-neutral-950 dark:text-neutral-100 sm:p-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <Link to="/admin/hub" className="underline">Voltar ao painel</Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 font-bold">Normas e vigências</h1>
        {acts && !loadError && editing === undefined && <button type="button" className={action} onClick={() => startEdit(null)}>Cadastrar ato</button>}
      </header>
      {notice && <p role="status">{notice}</p>}
      {loadError && <div className={box}><p role="alert">{loadError}</p>
        <button className={action} onClick={() => setReload(value => value + 1)}>Tentar novamente</button></div>}
      {!acts && !loadError && <p role="status">Carregando catálogo…</p>}
      {acts && editing !== undefined && <div className={`${box} space-y-3`}>
        {saveError && <p role="alert">{saveError}</p>}
        {conflict ? <button type="button" className={action} onClick={() => {
          setEditing(undefined); setSelected(editing?.id ?? null); setReload(value => value + 1);
        }}>Descartar rascunho e recarregar</button> :
          <NormativeActForm act={editing} acts={acts} saving={saving} onSave={document => void save(document)}
            onCancel={() => setEditing(undefined)} />}
      </div>}
      {acts && editing === undefined && <>
        <section aria-label="Filtros do catálogo" className={`${box} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
          <CatalogSelect label="Órgão ou ramo" value={filters.org} onChange={value => filter('org', value)}>
            <option value="">Todos</option><OrgOptions />
          </CatalogSelect>
          <CatalogInput label="Número, ementa ou assunto" value={filters.query} onChange={value => filter('query', value)} />
          <CatalogSelect label="Situação no simulador" value={filters.status} onChange={value => filter('status', value)}>
            <option value="">Todas</option>
            {Object.entries(implementationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </CatalogSelect>
          <CatalogInput label="Data de referência" type="date" value={filters.date} onChange={value => filter('date', value)} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={filters.archived}
            onChange={event => filter('archived', event.target.checked)} /> Incluir arquivados</label>
        </section>
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_2fr]">
          <section aria-label="Resultados" className={`${box} space-y-3`}>
            {filters.date && <h2 className="font-semibold">Aplicações na data de referência</h2>}
            {results.length === 0 ? <p>Nenhum ato encontrado.</p> : <ul className="space-y-2">{renderList(false)}</ul>}
            {results.some(item => item.pending) && <>
              <h2 className="font-semibold">Pendências de vigência ou efeito</h2>
              <ul className="space-y-2">{renderList(true)}</ul>
            </>}
          </section>
          {active && <section className={`${box} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-h5 font-semibold">{actTitle(active.document)}</h2>
              {!loadError && <button className={action} onClick={() => startEdit(active)}>Editar ato</button>}
            </div>
            {active.document.archived && <p>Arquivado no catálogo</p>}
            <DocumentDetail document={active.document} acts={acts} date={filters.date}
              incoming={acts.flatMap(act => act.document.relations.filter(relation => relation.targetId === active.id))} />
            {acts.some(act => act.document.relations.some(relation => relation.targetId === active.id)) && <div>
              <h3 className="font-semibold">Atos posteriores relacionados</h3>
              <ul className="list-disc pl-5">{acts.flatMap(act => act.document.relations
                .filter(relation => relation.targetId === active.id).map((relation, index) =>
                  <li key={`${act.id}-${index}`}><button className="underline" onClick={() => setSelected(act.id)}>{actTitle(act.document)}</button>
                    {' · '}{relation.provision}{' · Efeito: '}{formatDate(relation.from)}</li>))}</ul>
            </div>}
            <RevisionHistory key={`${active.id}-${active.revision}`} act={active} acts={acts} />
          </section>}
        </div>
      </>}
    </div>
  </main>;
}
