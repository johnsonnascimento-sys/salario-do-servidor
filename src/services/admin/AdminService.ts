import { supabase } from '../../lib/supabase';
import {
  GlobalConfig,
  OrgConfig,
  PowerConfig,
  UpsertGlobalConfigDTO,
  UpsertOrgConfigDTO,
  UpsertPowerConfigDTO,
  JsonObject,
} from '../../types/admin';

const isPlainObject = (value: unknown): value is JsonObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseJsonIfString = (value: unknown, fieldName: string): JsonObject => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (!isPlainObject(parsed)) {
        throw new Error(`${fieldName} deve ser um objeto JSON.`);
      }
      return parsed;
    } catch (err) {
      throw new Error(`${fieldName} invalido: ${(err as Error).message}`);
    }
  }

  if (!isPlainObject(value)) {
    throw new Error(`${fieldName} deve ser um objeto JSON.`);
  }

  return value;
};

const sanitizePayload = <T extends Record<string, unknown>>(payload: T) => {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
};

export class AdminService {
  static async getAdminAccessStatus(): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_admin_user');

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  static async listGlobalConfigs(): Promise<GlobalConfig[]> {
    const { data, error } = await supabase
      .from('global_config')
      .select('*')
      .order('valid_from', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as GlobalConfig[];
  }

  static async getGlobalConfigById(id: string): Promise<GlobalConfig | null> {
    const { data, error } = await supabase
      .from('global_config')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data as GlobalConfig;
  }

  static async upsertGlobalConfig(payload: UpsertGlobalConfigDTO): Promise<GlobalConfig> {
    const configValue = parseJsonIfString(payload.config_value, 'config_value');
    const sanitized = sanitizePayload({ ...payload, config_value: configValue });

    const { data, error } = await supabase
      .from('global_config')
      .upsert(sanitized)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as GlobalConfig;
  }

  static async versionGlobalConfig(payload: UpsertGlobalConfigDTO & { previous_id: string }): Promise<void> {
    const configValue = parseJsonIfString(payload.config_value, 'config_value');
    const { error } = await supabase.rpc('admin_version_global_config', {
      p_previous_id: payload.previous_id,
      p_config_key: payload.config_key,
      p_config_value: configValue,
      p_valid_from: payload.valid_from,
      p_valid_to: payload.valid_to,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  static async listPowerConfigs(): Promise<PowerConfig[]> {
    const { data, error } = await supabase
      .from('power_config')
      .select('*')
      .order('power_name', { ascending: true })
      .order('valid_from', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as PowerConfig[];
  }

  static async upsertPowerConfig(payload: UpsertPowerConfigDTO): Promise<PowerConfig> {
    const configValue = parseJsonIfString(payload.config_value, 'config_value');
    const sanitized = sanitizePayload({ ...payload, config_value: configValue });

    const { data, error } = await supabase
      .from('power_config')
      .upsert(sanitized)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as PowerConfig;
  }

  static async versionPowerConfig(payload: UpsertPowerConfigDTO & { previous_id: string }): Promise<void> {
    const configValue = parseJsonIfString(payload.config_value, 'config_value');
    const { error } = await supabase.rpc('admin_version_power_config', {
      p_previous_id: payload.previous_id,
      p_power_name: payload.power_name,
      p_config_key: payload.config_key,
      p_config_value: configValue,
      p_valid_from: payload.valid_from,
      p_valid_to: payload.valid_to,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  static async listOrgConfigs(): Promise<OrgConfig[]> {
    const { data, error } = await supabase
      .from('org_config')
      .select('*')
      .order('org_slug', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as OrgConfig[];
  }

  static async upsertOrgConfig(payload: UpsertOrgConfigDTO): Promise<OrgConfig> {
    const configValue = parseJsonIfString(payload.configuration, 'configuration');
    const sanitized = sanitizePayload({ ...payload, configuration: configValue });

    const { data, error } = await supabase
      .from('org_config')
      .upsert(sanitized)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as OrgConfig;
  }
}
