export type ExternalCommissionProfile = {
    kind: 'exclusive_cj';
    otherRgpsBase?: number;
    otherRgpsThirteenthBase?: number;
    vacationTaxableRemuneration?: number;
    receivesFoodAllowance?: boolean;
    transportIndemnityAdHoc?: boolean;
    gaactaEligibleRole?: boolean;
    compensatoryLeaveEligible?: boolean;
    compensatoryLeaveDocumentedGross?: number;
} | {
    kind: 'external';
    originLink?: 'statutory' | 'public_employee';
    payment?: 'origin' | 'judiciary';
    cjOption?: 'full' | 'effective_plus_65';
    originRemuneration?: number;
    compensatoryLeaveOriginRemuneration?: number;
    originBasicSalary?: number;
    receivesFoodAllowance?: boolean;
    transportIndemnityAdHoc?: boolean;
    gaactaEligibleRole?: boolean;
    compensatoryLeaveEligible?: boolean;
    compensatoryLeaveDocumentedGross?: number;
    documentedDailyRate?: number;
    pensionRegime?: 'rpps' | 'rgps';
    withholdingMonthly?: number;
    withholdingThirteenth?: number;
    withholdingVacation?: number;
    vacationTaxableRemuneration?: number;
    vacationPaysOriginRemuneration?: boolean;
    thirteenthPaysOriginRemuneration?: boolean;
};

export interface CommissionPayMemory {
    profile: ExternalCommissionProfile['kind'];
    functionCode: string;
    option: 'full' | 'effective_plus_65' | 'fc';
    tableAmount: number;
    paidAmount: number;
    rate?: number;
    originRemuneration: number;
    payment?: 'origin' | 'judiciary';
    regime: 'rpps' | 'rgps';
    competence: string;
    source: string;
}

export interface RgpsCalculationMemory {
    base: number;
    otherBase: number;
    totalBase: number;
    teto: number;
    amount: number;
    source: string;
    competencia: string;
    tipo: 'mensal' | '13';
}
