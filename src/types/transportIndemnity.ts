export interface TransportIndemnityIncidences {
  ir: boolean;
  pss: boolean;
  funpresp: boolean;
}

/** Monthly reimbursement for designated external service using a private vehicle. */
export interface TransportIndemnityConfig {
  enabled: boolean;
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
  }>;
  normativeLabel: string;
  info: string;
  notes: string[];
  /** @deprecated Read only for an entirely legacy configuration. */
  incidences?: TransportIndemnityIncidences;
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
  normativeLabel?: string;
}
