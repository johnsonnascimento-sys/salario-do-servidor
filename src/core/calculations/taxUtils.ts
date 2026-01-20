
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
 * Calculates IRRF based on specific progressive logic (typically for EA/RRA).
 * Note: This contains hardcoded values from "Holerite 8249" / Receita Federal logic.
 * Ideally, these ranges should also be parameterized in the future.
 * 
 * @param baseCalculo - The monetary base value.
 * @returns The calculated tax value.
 */
export const calculateIrrfProgressive = (baseCalculo: number): number => {
    if (baseCalculo <= 2259.20) {
        return 0.00;
    } else if (baseCalculo <= 2826.65) {
        return (baseCalculo * 0.075) - 169.44;
    } else if (baseCalculo <= 3751.05) {
        return (baseCalculo * 0.150) - 381.44;
    } else if (baseCalculo <= 4664.68) {
        return (baseCalculo * 0.225) - 662.77;
    } else {
        return (baseCalculo * 0.275) - 896.00;
    }
};

/**
 * Helper to determine the IRRF rate/deduction based on a table lookup if provided.
 * (This mimics global calcIR logic but decoupled).
 */
export const calculateIrrfFromTable = (base: number, deductionValue: number): number => {
    // Default top bracket behavior (27.5%)
    const val = (base * 0.275) - deductionValue;
    return val > 0 ? val : 0;
};
