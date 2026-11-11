/** Regra de vigência institucional da GAACTA. Fim da vigência é exclusivo. */
export interface GaactaRulesConfig {
  enabled: boolean;
  versions: Array<{
    validFrom: string;
    validTo?: string | null;
    percentage: number;
    reference: string;
  }>;
}
