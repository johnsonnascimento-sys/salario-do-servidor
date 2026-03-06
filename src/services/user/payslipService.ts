import { supabase } from '../../lib/supabase';
import {
  CreatePayslipDTO,
  PayslipListFilters,
  PayslipListResult,
  UpdatePayslipDTO,
  UserPayslip,
} from '../../types/user';

const sanitizeTags = (tags: string[] | undefined) =>
  (tags || [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);

export const createPayslip = async (payload: CreatePayslipDTO): Promise<UserPayslip> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw new Error(userError.message);
  if (!user) throw new Error('Usuário não autenticado.');

  const insertPayload = {
    user_id: user.id,
    title: payload.title.trim(),
    agency_slug: payload.agency_slug,
    agency_name: payload.agency_name,
    month_ref: payload.month_ref,
    year_ref: payload.year_ref,
    tags: sanitizeTags(payload.tags),
    notes: payload.notes || '',
    calculator_state: payload.calculator_state,
    result_rows: payload.result_rows,
    liquido: payload.liquido,
    total_bruto: payload.total_bruto,
    total_descontos: payload.total_descontos,
  };

  const { data, error } = await supabase
    .from('user_payslips')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as UserPayslip;
};

export const listPayslips = async (filters: PayslipListFilters = {}): Promise<PayslipListResult> => {
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize || 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('user_payslips')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (filters.year) {
    query = query.eq('year_ref', filters.year);
  }

  if (filters.month) {
    query = query.eq('month_ref', filters.month);
  }

  if (filters.query?.trim()) {
    const term = filters.query.trim();
    query = query.or(`title.ilike.%${term}%,agency_name.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data || []) as UserPayslip[],
    count: count || 0,
    page,
    pageSize,
  };
};

export const getPayslipById = async (id: string): Promise<UserPayslip | null> => {
  const { data, error } = await supabase
    .from('user_payslips')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as UserPayslip | null) ?? null;
};

export const updatePayslip = async (id: string, payload: UpdatePayslipDTO): Promise<UserPayslip> => {
  const updatePayload: Record<string, unknown> = {
    ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
    ...(payload.agency_slug !== undefined ? { agency_slug: payload.agency_slug } : {}),
    ...(payload.agency_name !== undefined ? { agency_name: payload.agency_name } : {}),
    ...(payload.month_ref !== undefined ? { month_ref: payload.month_ref } : {}),
    ...(payload.year_ref !== undefined ? { year_ref: payload.year_ref } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
    ...(payload.tags !== undefined ? { tags: sanitizeTags(payload.tags) } : {}),
    ...(payload.calculator_state !== undefined ? { calculator_state: payload.calculator_state } : {}),
    ...(payload.result_rows !== undefined ? { result_rows: payload.result_rows } : {}),
    ...(payload.liquido !== undefined ? { liquido: payload.liquido } : {}),
    ...(payload.total_bruto !== undefined ? { total_bruto: payload.total_bruto } : {}),
    ...(payload.total_descontos !== undefined ? { total_descontos: payload.total_descontos } : {}),
  };

  const { data, error } = await supabase
    .from('user_payslips')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as UserPayslip;
};

export const deletePayslip = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('user_payslips')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
};
