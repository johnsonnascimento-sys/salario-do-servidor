import { supabase } from '../../lib/supabase';
const DEFAULT_AUTH_REDIRECT_URL = 'https://salariodoservidor.com.br';
const AUTH_REDIRECT_URL = (
  import.meta.env.VITE_AUTH_REDIRECT_URL ||
  (window.location.hostname === 'localhost' ? window.location.origin : DEFAULT_AUTH_REDIRECT_URL)
).replace(/\/$/, '');

export interface AdminUserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  cpf: string | null;
  is_beta_enabled: boolean;
  allowlist_enabled: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface SignupAllowlistRow {
  full_name: string;
  cpf: string;
  email: string;
  enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAllowlistRow {
  email: string;
  enabled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUpdateUserPayload {
  userId: string;
  fullName: string;
  cpf: string;
  email: string;
  isBetaEnabled: boolean;
  allowlistEnabled: boolean;
}

export interface AdminAllowlistPayload {
  fullName: string;
  cpf: string;
  email: string;
  enabled: boolean;
  notes?: string;
}

export class UserAdminService {
  static async listUsers(): Promise<AdminUserRow[]> {
    const { data, error } = await supabase.rpc('admin_list_users');
    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as AdminUserRow[];
  }

  static async updateUser(payload: AdminUpdateUserPayload): Promise<void> {
    const { error } = await supabase.rpc('admin_update_user_profile', {
      p_user_id: payload.userId,
      p_full_name: payload.fullName.trim(),
      p_cpf: payload.cpf,
      p_email: payload.email.trim().toLowerCase(),
      p_is_beta_enabled: payload.isBetaEnabled,
      p_allowlist_enabled: payload.allowlistEnabled,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  static async deleteUser(userId: string, email?: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_user', {
      p_user_id: userId,
      p_email: email?.trim().toLowerCase() || null,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  static async upsertAllowlistUser(payload: AdminAllowlistPayload): Promise<void> {
    const { error } = await supabase.rpc('admin_upsert_allowlist_user', {
      p_full_name: payload.fullName.trim(),
      p_cpf: payload.cpf,
      p_email: payload.email.trim().toLowerCase(),
      p_enabled: payload.enabled,
      p_notes: payload.notes?.trim() || null,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  static async listSignupAllowlist(): Promise<SignupAllowlistRow[]> {
    const { data, error } = await supabase.rpc('admin_list_signup_allowlist');
    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as SignupAllowlistRow[];
  }

  static async listAdminAllowlist(): Promise<AdminAllowlistRow[]> {
    const { data, error } = await supabase.rpc('admin_list_admin_allowlist');
    if (error) {
      throw new Error(error.message);
    }
    return (data || []) as AdminAllowlistRow[];
  }

  static async upsertAdminAllowlist(email: string, enabled: boolean, notes?: string): Promise<void> {
    const { error } = await supabase.rpc('admin_upsert_admin_allowlist', {
      p_email: email.trim().toLowerCase(),
      p_enabled: enabled,
      p_notes: notes?.trim() || null,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  static async deleteAdminAllowlist(email: string): Promise<void> {
    const { error } = await supabase.rpc('admin_delete_admin_allowlist', {
      p_email: email.trim().toLowerCase(),
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  static async sendPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email inválido.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${AUTH_REDIRECT_URL}/acesso?mode=reset`,
    });
    if (error) {
      throw new Error(error.message);
    }
  }
}
