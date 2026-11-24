import { supabase } from '../../lib/supabase';

export const organs = {
  jmu: 'JMU',
  pju: 'PJU',
  cjf: 'CJF / Justiça Federal',
  trf1: 'TRF1',
  trf2: 'TRF2',
  trf3: 'TRF3',
  trf4: 'TRF4',
  trf5: 'TRF5',
  trf6: 'TRF6',
} as const;

export const implementationLabels = {
  review: 'A conferir',
  implemented: 'Implementado',
  update: 'Requer atualização',
} as const;

export type ImplementationStatus = keyof typeof implementationLabels;

export interface Application {
  id: string;
  org: string;
  subject: string;
  rule: string;
  provision: string;
  from: string;
  to: string;
  impact: string;
  status: ImplementationStatus;
  evidence: string;
}

export interface ActRelation {
  targetId: string;
  applicationId: string;
  kind: 'amends' | 'repeals';
  provision: string;
  from: string;
}

export interface ActDocument {
  issuer: string;
  kind: string;
  number: string;
  year: string;
  summary: string;
  source: string;
  publication: string;
  validFrom: string;
  validTo: string;
  checkedOn: string;
  notes: string;
  archived: boolean;
  applications: Application[];
  relations: ActRelation[];
}

export interface Act {
  id: string;
  revision: number;
  document: ActDocument;
}

export interface ActRevision {
  revision: number;
  previous_document: ActDocument;
  changed_by: string;
  changed_at: string;
}

export const emptyAct = (): ActDocument => ({
  issuer: '', kind: 'Resolução', number: '', year: '', summary: '', source: '', publication: '',
  validFrom: '', validTo: '', checkedOn: '', notes: '', archived: false, applications: [], relations: [],
});

export const newApplication = (): Application => ({
  id: crypto.randomUUID(), org: 'jmu', subject: '', rule: '', provision: '', from: '', to: '',
  impact: '', status: 'review', evidence: '',
});

export const actTitle = ({ kind, issuer, number, year }: ActDocument) =>
  `${kind} ${issuer} nº ${number}/${year}`;

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const affectsApplication = (relation: ActRelation, application: Application) =>
  relation.applicationId === application.id || (relation.applicationId === '*' && relation.kind === 'repeals');

export function applicationOnDate(application: Application, date: string, incoming: ActRelation[]) {
  if ((application.to && date > application.to) ||
      incoming.some(relation => affectsApplication(relation, application) && relation.from && relation.from <= date)) return 'ended';
  if (!application.from) return 'pending';
  return application.from <= date ? 'active' : 'future';
}

export interface CatalogFilters {
  query: string;
  org: string;
  status: string;
  date: string;
  archived: boolean;
}

export function filterCatalog(acts: Act[], filters: CatalogFilters) {
  const query = normalized(filters.query);
  const results: { act: Act; pending: boolean }[] = [];
  const relationsByTarget = new Map<string, ActRelation[]>();
  for (const { document } of acts) {
    for (const relation of document.relations) {
      const previous = relationsByTarget.get(relation.targetId) ?? [];
      relationsByTarget.set(relation.targetId, [...previous, relation]);
    }
  }

  for (const act of acts) {
    const { document } = act;
    if (document.archived && !filters.archived) continue;
    const generalMatch = normalized(`${actTitle(document)} ${document.summary}`).includes(query);
    const related = relationsByTarget.get(act.id) ?? [];
    const applications = document.applications.filter(application =>
      (!filters.org || application.org === filters.org) &&
      (!filters.status || application.status === filters.status) &&
      (generalMatch || normalized(`${application.subject} ${application.rule}`).includes(query)));
    const outgoing = document.relations.filter(relation => {
      const predecessor = acts.find(candidate => candidate.id === relation.targetId);
      return predecessor?.document.applications.some(application =>
        (!relation.applicationId || affectsApplication(relation, application)) &&
        (!filters.org || application.org === filters.org) &&
        (!filters.status || application.status === filters.status) &&
        (generalMatch || normalized(`${application.subject} ${application.rule}`).includes(query)));
    });
    if (!applications.length && !outgoing.length &&
        (document.applications.length || filters.org || filters.status || !generalMatch)) continue;
    if (!filters.date) {
      results.push({ act, pending: false });
      continue;
    }

    const dated = applications.map(application => ({ application, status: applicationOnDate(application, filters.date, related) }));
    const applicable = dated.some(item => item.status === 'active') ||
      outgoing.some(relation => relation.from && relation.from <= filters.date);
    const undated = dated.some(item => item.status === 'pending');
    const uncertain = undated ||
      related.some(relation => !relation.from && dated.some(item => item.status === 'active' && affectsApplication(relation, item.application))) ||
      outgoing.some(relation => !relation.from) ||
      ((applicable || (!document.applications.length && !outgoing.length)) &&
        (!document.validFrom || document.relations.some(relation => !relation.from)));
    const actOnly = !document.applications.length && !outgoing.length && document.validFrom &&
      document.validFrom <= filters.date && (!document.validTo || document.validTo >= filters.date) &&
      !related.some(relation => relation.kind === 'repeals' && relation.applicationId === '*' && relation.from && relation.from <= filters.date);
    if (applicable || actOnly) results.push({ act, pending: false });
    if (uncertain) results.push({ act, pending: true });
  }
  return results;
}

export async function listNormativeActs(): Promise<Act[]> {
  const acts: Act[] = [];
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('normative_acts')
      .select('id,revision,document').order('id').range(offset, offset + pageSize - 1);
    if (error) throw error;
    acts.push(...((data ?? []) as Act[]));
    if ((data?.length ?? 0) < pageSize) break;
  }
  return acts.sort((a, b) => actTitle(a.document).localeCompare(actTitle(b.document), 'pt-BR'));
}

export async function listActRevisions(id: string): Promise<ActRevision[]> {
  const { data, error } = await supabase.from('normative_act_revisions')
    .select('revision,previous_document,changed_by,changed_at').eq('act_id', id).order('revision', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ActRevision[];
}

export async function saveNormativeAct(act: Act | null, document: ActDocument): Promise<string> {
  const { data, error } = await supabase.rpc('admin_save_normative_act', {
    p_id: act?.id ?? null, p_revision: act?.revision ?? null, p_document: document,
  });
  if (error?.code === '23505') throw new Error('Já existe um ato com esse emissor, tipo, número e ano.');
  if (error) throw error;
  return data as string;
}
