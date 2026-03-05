import { CalculatorState } from '../types';

export interface UserProfile {
  id: string;
  full_name: string;
  cpf: string;
  email: string;
  is_beta_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayslipResultRow {
  label: string;
  value: number;
  type: 'C' | 'D';
}

export interface UserPayslip {
  id: string;
  user_id: string;
  title: string;
  agency_slug: string;
  agency_name: string;
  month_ref: string;
  year_ref: number;
  tags: string[];
  notes: string;
  calculator_state: CalculatorState;
  result_rows: PayslipResultRow[];
  liquido: number;
  total_bruto: number;
  total_descontos: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePayslipDTO {
  title: string;
  agency_slug: string;
  agency_name: string;
  month_ref: string;
  year_ref: number;
  tags?: string[];
  notes?: string;
  calculator_state: CalculatorState;
  result_rows: PayslipResultRow[];
  liquido: number;
  total_bruto: number;
  total_descontos: number;
}

export interface UpdatePayslipDTO {
  title?: string;
  tags?: string[];
  notes?: string;
  calculator_state?: CalculatorState;
  result_rows?: PayslipResultRow[];
  liquido?: number;
  total_bruto?: number;
  total_descontos?: number;
}

export interface PayslipListFilters {
  page?: number;
  pageSize?: number;
  year?: number;
  month?: string;
  query?: string;
}

export interface PayslipListResult {
  data: UserPayslip[];
  count: number;
  page: number;
  pageSize: number;
}
