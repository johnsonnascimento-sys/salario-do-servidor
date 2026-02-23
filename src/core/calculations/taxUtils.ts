
/**
 * Core calculation logic for Taxes (IRRF) and Social Security (PSS/INSS).
 * Designed to be pure functions independent of React state.
 */

// Define local interfaces to ensure this module is self-contained core logic.
// These match the structure of the data in the database/config.
export interface TaxBracket {
    min: number;
    max: number;
    rate: number;
}

export interface TaxTable {
    teto_rgps: number; // Optional in some contexts, but usually present for PSS
    faixas: TaxBracket[];
}

export interface IrrfBracket {
    min: number;
    max: number;
    rate: number;
    deduction: number;
}

/**
 * Calculates PSS (Social Security Contribution) based on progressive tables.
 * This logic applies to the "New" PSS rules (EC 103/2019) where rates are progressive over chunks.
 * 
 * @param base - The monetary base value to calculate tax on.
 * @param table - The tax table containing brackets (faixas).
 * @returns The total tax value.
 */
export const calculatePss = (base: number, table: TaxTable): number => {
    let total = 0;
    if (!table || !table.faixas) return 0;

    for (let f of table.faixas) {
        if (base > f.min) {
            // "teto" is the portion of the base that falls within this bracket
            // If the base is larger than the max of this bracket, we take the max
            // If the base is smaller, we take the base.
            // Then we subtract the min of the bracket to get the effective chunk size.
            let teto = Math.min(base, f.max);

            if (teto > f.min) {
                total += (teto - f.min) * f.rate;
            }
        }
    }
    return total;
};

/**
 * Calculates Standard IRRF (Income Tax).
 * Formula: (Base * Rate) - Deduction
 * 
 * @param base - The monetary base value (after PSS/dependents deductions).
 * @param rate - The tax rate (e.g., 0.275 for 27.5%).
 * @param deduction - The deductible amount (parcela a deduzir).
 * @returns The calculated tax value (floored at 0).
 */
export const calculateIrrf = (base: number, rate: number, deduction: number): number => {
    const val = (base * rate) - deduction;
    return val > 0 ? val : 0;
};

/**
 * Calculates IRRF based on progressive bracket rules loaded from configuration.
 * 
 * @param baseCalculo - The monetary base value.
 * @param brackets - Progressive IR bracket list.
 * @returns The calculated tax value.
 */
export const calculateIrrfProgressive = (baseCalculo: number, brackets: IrrfBracket[]): number => {
    if (!Array.isArray(brackets) || brackets.length === 0) return 0;
    const sorted = [...brackets].sort((a, b) => a.min - b.min);
    const faixa = sorted.find((item) => baseCalculo > item.min && baseCalculo <= item.max) || sorted[sorted.length - 1];
    const imposto = (baseCalculo * faixa.rate) - faixa.deduction;
    return imposto > 0 ? imposto : 0;
};

/**
 * Helper to determine the IRRF rate/deduction based on a table lookup if provided.
 * (This mimics global calcIR logic but decoupled).
 */
export const calculateIrrfFromTable = (base: number, rate: number, deductionValue: number): number => {
    const val = (base * rate) - deductionValue;
    return val > 0 ? val : 0;
};
