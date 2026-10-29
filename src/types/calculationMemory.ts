/** Audit values produced by the official engine, never reconstructed by the UI. */
export interface ThirteenthCalculationMemory {
    /** Totals posted to this payroll; installment demonstrations below overlap. */
    payroll: { gross: number; deductions: number; net: number };
    first: { gross: number; deductions: number; net: number; vencimento: number; fc: number };
    /** Gross includes the first installment of each component settled in the second. */
    second: {
        gross: number; deductions: number; net: number; vencimento: number; fc: number;
        pss: number; funpresp: number; ir: number; firstInstallmentDeduction: number; abono: number;
    };
    components: { vencimento: { first: number; second: number }; fc: { first: number; second: number } };
}

export interface SubstitutionCalculationMemory {
    id: string;
    total: number;
    isEA: boolean;
    excluirIR: boolean;
    pssIsEA: boolean;
}

export interface DailiesCalculationMemory {
    /** Before the existing minimum-zero-net rule limits posted deductions. */
    calculatedAmounts: { ldoCut: number; externalGloss: number; foodDiscount: number; transportDiscount: number; deductions: number };
    unappliedDeductions: number;
    dailyRate: number;
    quantity: number;
    embarkationAdditional: number;
    gross: number;
    ldoCut: number;
    externalGloss: number;
    foodDiscount: number;
    transportDiscount: number;
    foodDays: number;
    transportDays: number;
    foodDiscountHalf: number;
    foodDiscountFull: number;
    transportDiscountHalf: number;
    transportDiscountFull: number;
    halfDailyApplied: boolean;
    halfDiscountApplied: boolean;
    deductions: number;
    net: number;
}

export interface CalculationMemory {
    thirteenth: ThirteenthCalculationMemory;
    substitutions: SubstitutionCalculationMemory[];
    dailies: DailiesCalculationMemory;
}
