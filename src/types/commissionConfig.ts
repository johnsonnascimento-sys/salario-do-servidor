export interface CommissionConfig {
    /** Each organ enables the reviewed feature through its configuration override. */
    enabled?: boolean;
    versions: CommissionPayVersion[];
    dailiesFc?: { validFrom: string; amount: number; source: string };
    gaactaSource?: { label: string; url: string };
    /** Historical interval, with an exclusive end date. */
    compensatoryLeave?: {
        validFrom: string;
        validTo: string;
        source: string;
        documentedGross?: boolean;
        maxDays?: number;
        eligibleFunctions?: string[];
    };
}

export interface CommissionPayVersion {
    validFrom: string;
    validTo?: string | null;
    cjIntegral: Record<string, number>;
    fc: Record<string, number>;
    cjOptionRate: number;
    source: string;
}

export interface RgpsConfig {
    versions: RgpsTableVersion[];
}

export interface RgpsTableVersion {
    validFrom: string;
    validTo?: string | null;
    teto: number;
    faixas: Array<{ ate: number; aliq: number }>;
    source: string;
}
