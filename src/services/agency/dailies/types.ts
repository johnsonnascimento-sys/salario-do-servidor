export type DailiesScope = 'global' | 'power' | 'branch' | 'org';
export interface DailiesSource {
  title: string;
  url: string;
  article?: string;
  published_on?: string;
  effective_from?: string;
  effective_to?: string | null;
}
export type DailiesRate =
  | { kind: 'fixed'; value: number; currency: string; source_ids?: string[] }
  | { kind: 'reference_percent'; reference: string; percent: number; currency: string; source_ids?: string[] }
  | { kind: 'category_percent'; category: string; percent: number; currency: string; source_ids?: string[] };
export interface DailiesRules {
  temporal_basis: 'daily' | 'departure';
  return_fraction: number;
  no_overnight_fraction: number;
  supplied_lodging_fraction: number;
  supplied_meals_fraction: number;
  supplied_transport_fraction?: number;
  supplied_reduction_combination?: 'multiply' | 'add_reductions';
  unit_rounding?: 'half_up' | 'half_even' | 'truncate';
  unit_decimals?: number;
  rounding: 'half_up' | 'half_even' | 'truncate';
  decimals: number;
  deduction_divisor?: number;
  food_divisor?: number;
  transport_divisor?: number;
  deduction_fraction?: 'full_day' | 'payable_fraction';
  deduct_meals: boolean;
  deduct_transport: boolean;
  deduction_days: 'business' | 'all';
  deduction_cap: 'daily_gross' | 'none';
  boarding?: { rate: string; count: 'once' | 'per_leg'; reduction_applies: boolean };
  additional_rates?: string[];
  allowed_reductions?: Record<string, number>;
}
export interface DailiesLimit {
  value: number;
  currency: string;
  applies_to: 'daily_rate' | 'daily_gross' | 'trip_gross';
  mandatory?: boolean;
  source_ids?: string[];
}
export interface DailiesConfigPayload {
  rules?: Partial<DailiesRules>;
  rates?: Record<string, DailiesRate>;
  references?: Record<string, { value: number; currency: string; source_ids?: string[] }>;
  limits?: Record<string, DailiesLimit>;
  auxiliary?: { holidays?: string[]; weekend_days?: number[]; source_ids?: string[] };
  sources?: Record<string, DailiesSource>;
  rule_sources?: Record<string, string[]>;
  /** National mandatory rules: children may add locks, never remove or change them. */
  locked_rules?: Array<keyof DailiesRules>;
}
export interface DailiesVersion {
  id: string;
  revision: number;
  scope_type: DailiesScope;
  scope_key: string;
  valid_from: string;
  valid_to: string | null;
  status: 'draft' | 'published';
  payload: DailiesConfigPayload;
}
export interface DailiesContext { org_slug: string; power?: string; branch?: string }
export interface DailiesProvenance {
  version_id: string;
  revision: number;
  scope_type: DailiesScope;
  scope_key: string;
  valid_from: string;
  valid_to: string | null;
}
export interface ResolvedDailiesConfig {
  date: string;
  context: DailiesContext;
  payload: DailiesConfigPayload;
  provenance: Record<string, DailiesProvenance>;
  versions: DailiesVersion[];
}
export interface DailiesInput {
  org_slug: string;
  competence: string;
  category: string;
  mode: 'period' | 'quantity';
  start_date?: string;
  end_date?: string;
  normative_date?: string;
  quantity?: number;
  deduction_days_quantity?: number;
  food_deduction_days_quantity?: number;
  transport_deduction_days_quantity?: number;
  circumstances?: {
    no_overnight?: boolean;
    supplied_lodging?: boolean;
    supplied_meals?: boolean;
    supplied_transport?: boolean;
    boarding?: boolean;
    boarding_legs?: number;
    reduction_fraction?: number;
    reduction_id?: string;
    /** Explicit configured rate keys; no amounts or percentages supplied by UI. */
    additional_rates?: string[];
  };
  benefits?: { meals_monthly?: number; transport_monthly?: number; currency: string };
  benefits_by_month?: Record<string, DailiesInput['benefits']>;
}
export interface DailiesParcel {
  date: string;
  configuration_date: string;
  currency: string;
  quantity: number;
  daily_rate: number;
  fraction: number;
  reduction_factor: number;
  gross: number;
  boarding: number;
  additions: number;
  deductions: number;
  food_deduction: number;
  transport_deduction: number;
  food_deduction_days: number;
  transport_deduction_days: number;
  reductions: number;
  limit_cut: number;
  net: number;
  config: ResolvedDailiesConfig;
}
export interface DailiesCalculationResult {
  available: boolean;
  issues: Array<{ code: string; message: string; date?: string }>;
  parcels: DailiesParcel[];
  totals: Record<string, { gross: number; boarding: number; additions: number; deductions: number; food_deduction: number; transport_deduction: number; reductions: number; limit_cut: number; net: number }>;
  memory: { schema_version: 1; engine_version: '1'; input: DailiesInput; context: DailiesContext; versions: DailiesVersion[]; parcels: DailiesParcel[]; totals: DailiesCalculationResult['totals'] };
}
