import React, { useState } from 'react';
import {
  actTitle, emptyAct, implementationLabels, newApplication, organs,
  type Act, type ActDocument, type ActRelation, type Application,
} from '../../services/admin/normativeCatalog';

const field = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-800';
export const action = 'rounded-md border border-gray-300 px-3 py-2 hover:bg-gray-100 dark:border-neutral-600 dark:hover:bg-neutral-800';

export const CatalogInput: React.FC<{
  label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean;
}> = ({ label, value, onChange, type = 'text', required = false }) => {
  return <label className="block space-y-1">
    <span className="block text-body-sm font-medium">{label}</span>
    <input className={field} type={type} value={value} required={required} onChange={event => onChange(event.target.value)} />
  </label>;
};

export function CatalogSelect({ label, value, onChange, children }: {
  label: string; value: string; onChange: (value: string) => void; children: React.ReactNode;
}) {
  return <label className="block space-y-1">
    <span className="block text-body-sm font-medium">{label}</span>
    <select className={field} value={value} onChange={event => onChange(event.target.value)}>{children}</select>
  </label>;
}

export const OrgOptions = () => <>{Object.entries(organs).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</>;

const blankRelation: ActRelation = { targetId: '', applicationId: '', kind: 'amends', provision: '', from: '' };

export default function NormativeActForm({ act, acts, saving, onSave, onCancel }: {
  act: Act | null; acts: Act[]; saving: boolean; onSave: (document: ActDocument) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ActDocument>(() => act?.document ?? emptyAct());
  const change = <K extends keyof ActDocument>(key: K, value: ActDocument[K]) =>
    setDraft(previous => ({ ...previous, [key]: value }));
  const updateApplication = (index: number, patch: Partial<Application>) =>
    change('applications', draft.applications.map((item, position) => index === position ? { ...item, ...patch } : item));
  const updateRelation = (index: number, patch: Partial<ActRelation>) =>
    change('relations', draft.relations.map((item, position) => index === position ? { ...item, ...patch } : item));

  return <form className="space-y-5" onSubmit={event => { event.preventDefault(); onSave(draft); }}>
    <h2 className="text-h5 font-semibold">{act ? 'Editar ato' : 'Cadastrar ato'}</h2>
    <fieldset disabled={saving} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([['issuer', 'Órgão emissor'], ['kind', 'Tipo de ato'], ['number', 'Número'], ['year', 'Ano']] as const)
          .map(([key, label]) => <CatalogInput key={key} label={label} value={draft[key]} required onChange={value => change(key, value)} />)}
      </div>
      <CatalogInput label="Ementa" value={draft.summary} required onChange={value => change('summary', value)} />
      <CatalogInput label="Fonte oficial (HTTPS)" value={draft.source} type="url" onChange={value => change('source', value)} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([['publication', 'Publicação'], ['validFrom', 'Início da vigência'], ['validTo', 'Último dia de vigência'], ['checkedOn', 'Última conferência']] as const)
          .map(([key, label]) => <CatalogInput key={key} label={label} value={draft[key]} type="date" onChange={value => change(key, value)} />)}
      </div>
      <label className="block space-y-1">
        <span className="block text-body-sm font-medium">Observações de conferência</span>
        <textarea className={field} value={draft.notes} onChange={event => change('notes', event.target.value)} />
      </label>
      {act && <label className="flex items-center gap-2">
        <input type="checkbox" checked={draft.archived} onChange={event => change('archived', event.target.checked)} />
        Arquivado no catálogo
      </label>}

      <section className="space-y-3">
        <h3 className="text-body-lg font-semibold">Aplicações por órgão</h3>
        {draft.applications.map((item, index) => <fieldset key={item.id} className="space-y-3 rounded-md border border-gray-300 p-3 dark:border-neutral-600">
          <legend className="px-1 font-medium">{item.rule || 'Nova aplicação'}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <CatalogSelect label="Órgão ou ramo" value={item.org} onChange={org => updateApplication(index, { org })}><OrgOptions /></CatalogSelect>
            {([['subject', 'Assunto'], ['rule', 'Regra afetada'], ['provision', 'Dispositivo'], ['impact', 'Impacto na regra']] as const)
              .map(([key, label]) => <CatalogInput key={key} label={label} value={item[key]} required onChange={value => updateApplication(index, { [key]: value })} />)}
            <CatalogSelect label="Situação no simulador" value={item.status} onChange={status => updateApplication(index, { status: status as Application['status'] })}>
              {Object.entries(implementationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </CatalogSelect>
            <CatalogInput label="Início dos efeitos" type="date" value={item.from} onChange={from => updateApplication(index, { from })} />
            <CatalogInput label="Último dia de efeitos" type="date" value={item.to} onChange={to => updateApplication(index, { to })} />
          </div>
          <CatalogInput label="Evidência no simulador" value={item.evidence} required={item.status === 'implemented'}
            onChange={evidence => updateApplication(index, { evidence })} />
          {!act?.document.applications.some(saved => saved.id === item.id) && <button type="button" className={action}
            onClick={() => change('applications', draft.applications.filter(application => application.id !== item.id))}>Remover aplicação</button>}
        </fieldset>)}
        <button type="button" className={action} onClick={() => change('applications', [...draft.applications, newApplication()])}>Adicionar aplicação</button>
      </section>

      <section className="space-y-3">
        <h3 className="text-body-lg font-semibold">Alterações e revogações</h3>
        {draft.relations.map((item, index) => {
          const predecessor = acts.find(candidate => candidate.id === item.targetId);
          return <fieldset key={index} className="space-y-3 rounded-md border border-gray-300 p-3 dark:border-neutral-600">
            <legend className="px-1 font-medium">Ato anterior</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <CatalogSelect label="Ato anterior vinculado" value={item.targetId} onChange={targetId => updateRelation(index, { targetId, applicationId: '' })}>
                <option value="">Selecione o ato</option>
                {acts.filter(candidate => candidate.id !== act?.id).map(candidate =>
                  <option key={candidate.id} value={candidate.id}>{actTitle(candidate.document)}</option>)}
              </CatalogSelect>
              <CatalogSelect label="Tipo de relação" value={item.kind} onChange={kind => updateRelation(index, {
                kind: kind as ActRelation['kind'], applicationId: item.applicationId === '*' ? '' : item.applicationId,
              })}>
                <option value="amends">Altera</option><option value="repeals">Revoga</option>
              </CatalogSelect>
              <CatalogSelect label="Aplicação anterior afetada" value={item.applicationId} onChange={applicationId => updateRelation(index, { applicationId })}>
                <option value="">Sem aplicação vinculada</option>
                {item.kind === 'repeals' && <option value="*">Ato inteiro</option>}
                {predecessor?.document.applications.map(application =>
                  <option key={application.id} value={application.id}>{application.rule} ({application.org.toUpperCase()})</option>)}
              </CatalogSelect>
              <CatalogInput label="Dispositivo afetado" value={item.provision} required onChange={provision => updateRelation(index, { provision })} />
              <CatalogInput label="Data de efeito comprovada" type="date" value={item.from} onChange={from => updateRelation(index, { from })} />
            </div>
            <button className={action} type="button" onClick={() => change('relations', draft.relations.filter((_, position) => position !== index))}>Remover relação</button>
          </fieldset>;
        })}
        <button type="button" className={action} onClick={() => change('relations', [...draft.relations, { ...blankRelation }])}>Vincular ato anterior</button>
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="rounded-md bg-secondary-700 px-4 py-2 font-semibold text-white hover:bg-secondary-800">
          {saving ? 'Salvando…' : 'Salvar ato'}
        </button>
        <button type="button" className={action} onClick={onCancel}>Cancelar</button>
      </div>
    </fieldset>
  </form>;
}
