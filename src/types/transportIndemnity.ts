/** Monthly reimbursement for designated external service using a private vehicle. */
export interface TransportIndemnityConfig {
  enabled: boolean;
  divisor: number;
  versions: Array<{
    validFrom: string;
    validTo?: string | null;
    fullAmount: number;
    reference: string;
  }>;
  normativeLabel: string;
  info: string;
  notes: string[];
  incidences: { ir: boolean; pss: boolean; funpresp: boolean };
}

export interface TransportIndemnityMemory {
  competence: string;
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
}
