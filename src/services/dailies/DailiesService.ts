import { supabase } from '../../lib/supabase';
import type { DailiesConfigPayload, DailiesContext, DailiesInput, DailiesScope, DailiesVersion } from '../agency/dailies/types';

export interface DailiesScopeRecord {
  id: string;
  scope_type: DailiesScope;
  scope_key: string;
  label: string;
}
export interface DailiesVersionRecord extends Omit<DailiesVersion, 'valid_from'> {
  valid_from: string | null;
  scope_id: string;
  reason: string;
  change_kind: 'normative' | 'correction';
  published_at: string | null;
  created_at: string;
  superseded_by: string | null;
  legacy_snapshot?: unknown;
}
export interface DailiesDraft {
  id?: string;
  scopeId: string;
  payload: DailiesConfigPayload;
  validFrom: string | null;
  validTo: string | null;
  reason: string;
  changeKind: 'normative' | 'correction';
}
export interface PublishedDailiesVersions {
  context: DailiesContext;
  revision: string;
  versions: DailiesVersion[];
}

/** Dedicated history. Never reads courts.config or payroll power_config. */
export class DailiesService {
  private readonly cache = new Map<string, PublishedDailiesVersions>();

  async listScopes(): Promise<DailiesScopeRecord[]> {
    const { data, error } = await supabase.from('dailies_scopes').select('*').order('scope_type').order('scope_key');
    if (error) throw new Error(`Falha ao carregar âmbitos de diárias: ${error.message}`);
    return data || [];
  }

  async listVersions(scopeId?: string): Promise<DailiesVersionRecord[]> {
    let query = supabase.from('dailies_versions').select('*, dailies_scopes!inner(scope_type,scope_key)');
    if (scopeId) query = query.eq('scope_id', scopeId);
    const { data, error } = await query.order('revision', { ascending: false });
    if (error) throw new Error(`Falha ao carregar versões de diárias: ${error.message}`);
    return (data || []).map(row => {
      const { dailies_scopes, ...version } = row;
      return { ...version, ...dailies_scopes } as DailiesVersionRecord;
    });
  }

  async saveDraft(draft: DailiesDraft): Promise<DailiesVersionRecord> {
    const { data, error } = await supabase.rpc('admin_save_dailies_draft', {
      p_id: draft.id || null, p_scope_id: draft.scopeId, p_payload: draft.payload,
      p_valid_from: draft.validFrom, p_valid_to: draft.validTo, p_reason: draft.reason,
      p_change_kind: draft.changeKind,
    });
    if (error) throw new Error(`Não foi possível salvar o rascunho: ${error.message}`);
    return this.withScope(data);
  }

  async cloneVersion(id: string): Promise<DailiesVersionRecord> {
    const { data, error } = await supabase.rpc('admin_clone_dailies_version', { p_id: id });
    if (error) throw new Error(`Não foi possível clonar a versão: ${error.message}`);
    return this.withScope(data);
  }

  async publishVersion(id: string, previousId?: string): Promise<DailiesVersionRecord> {
    const { data, error } = await supabase.rpc('admin_publish_dailies_version', { p_id: id, p_previous_id: previousId || null });
    if (error) throw new Error(`Publicação rejeitada: ${error.message}`);
    this.clearCache();
    return this.withScope(data);
  }

  /** RPC atomically reads current revision and period: no indefinite revision cache. */
  async getForInput(input: DailiesInput): Promise<PublishedDailiesVersions> {
    if (input.mode === 'period') {
      if (!input.start_date || !input.end_date) throw new Error('Informe início e fim da viagem');
      return this.fetchPublishedVersions(input.org_slug, input.start_date, input.end_date);
    }
    if (input.normative_date) return this.fetchPublishedVersions(input.org_slug, input.normative_date, input.normative_date);
    if (!/^\d{4}-\d{2}$/.test(input.competence)) throw new Error('Competência inválida');
    const [year, month] = input.competence.split('-').map(Number);
    if (month < 1 || month > 12) throw new Error('Competência inválida');
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return this.fetchPublishedVersions(input.org_slug, `${input.competence}-01`, `${input.competence}-${lastDay}`);
  }

  async fetchPublishedVersions(orgSlug: string, from: string, to: string): Promise<PublishedDailiesVersions> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
      throw new Error('Período de diárias inválido');
    }
    const { data, error } = await supabase.rpc('get_dailies_versions', { p_org_slug: orgSlug, p_from: from, p_to: to });
    if (error) throw new Error(`Configuração de diárias indisponível: ${error.message}`);
    const result = data as PublishedDailiesVersions;
    if (!result || !Array.isArray(result.versions) || !result.revision || result.context?.org_slug !== orgSlug) {
      throw new Error('Resposta de configuração de diárias inválida');
    }
    const key = JSON.stringify([orgSlug, from, to, result.revision]);
    const cached = this.cache.get(key);
    if (cached) return structuredClone(cached);
    // Bound memory while preserving immutable copies from callers.
    if (this.cache.size >= 32) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, structuredClone(result));
    return structuredClone(result);
  }

  async setBranch(orgSlug: string, branchKey: string): Promise<void> {
    const { error } = await supabase.rpc('admin_set_dailies_branch', { p_org_slug: orgSlug, p_branch_key: branchKey });
    if (error) throw new Error(`Não foi possível vincular o ramo: ${error.message}`);
    this.clearCache();
  }

  clearCache(): void { this.cache.clear(); }

  private async withScope(data: Omit<DailiesVersionRecord, 'scope_type' | 'scope_key'>): Promise<DailiesVersionRecord> {
    const scopes = await this.listScopes();
    const scope = scopes.find(item => item.id === data.scope_id);
    if (!scope) throw new Error('Âmbito de diárias não encontrado');
    return { ...data, scope_type: scope.scope_type, scope_key: scope.scope_key };
  }
}

export const dailiesService = new DailiesService();
