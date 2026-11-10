export interface TransportIndemnityIncidences {
  ir: boolean;
  pss: boolean;
  funpresp: boolean;
}

export type TransportIndemnityCompetenceMode = 'current_month' | 'previous_month';

/** Monthly reimbursement for designated external service using a private vehicle. */
export interface TransportIndemnityConfig {
  enabled: boolean;
  /** Monthly simulation convention for a rule starting during the competence. */
  transitionPolicy?: 'latest_in_month';
  /**
   * Relationship between the payroll competence (mês de pagamento) and service execution (mês de serviço).
   * - 'current_month' (default / JMU): payment competence is the service competence.
   * - 'previous_month' (CJF / JF, art. 56 Res. CJF 4/2008): external service was executed in the month preceding payment.
   */
  competenceMode?: TransportIndemnityCompetenceMode;
  /** @deprecated Read only for an entirely legacy configuration. New rules belong to each version. */
  divisor?: number;
  versions: Array<{
    validFrom: string;
    validTo?: string | null;
    fullAmount: number;
    reference: string;
    divisor?: number;
    incidences?: TransportIndemnityIncidences;
    normativeLabel?: string;
    publicationDate?: string;
    financialEffectsFrom?: string;
  }>;
  normativeLabel: string;
  info: string;
  notes: string[];
  /** @deprecated Read only for an entirely legacy configuration. */
  incidences?: TransportIndemnityIncidences;
}

export interface TransportIndemnityMemory {
  competence: string;
  serviceCompetence?: string;
  paymentCompetence?: string;
  status: 'inactive' | 'unavailable' | 'invalid' | 'zero' | 'proportional' | 'full';
  reason?: string;
  days: number;
  eligibleDays: number;
  maxDays: number;
  divisor: number;
  fullAmount: number;
  amount: number;
  validFrom?: string;
  validTo?: string | null;
  reference?: string;
  normativeLabel?: string;
  transitionWarning?: string;
  transitionDate?: string;
  publicationDate?: string;
  financialEffectsFrom?: string;
  retroactiveNote?: string;
}
