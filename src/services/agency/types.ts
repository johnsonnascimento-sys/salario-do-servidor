
/**
 * Identifiers for supported agencies.
 */
export type AgencyId = 'JMU' | 'EXECUTIVO_FEDERAL' | 'CAMARA' | 'SENADO';

/**
 * Common input parameters for salary calculations.
 * Additional specific fields can be passed as needed.
 */
export interface ICalculationParams {
    grossSalary: number;
    dependents: number;
    discounts: number;
    otherDeductions?: number;
    // Allow for flexible parameters during the transition/expansion
    [key: string]: any;
}

/**
 * detailed result breakdown.
 */
export interface ICalculationResult {
    netSalary: number;
    totalDeductions: number;
    totalBenefits: number;
    breakdown: Record<string, number>;
}

/**
 * Main contract for Agency-specific calculator implementations.
 * 
 * REFATORADO: Métodos agora suportam operações assíncronas
 * para buscar configurações do banco de dados.
 */
export interface IAgencyCalculator {
    /**
     * Calculates the base salary based on input tables/params.
     */
    calculateBase(params: ICalculationParams): number | Promise<number>;

    /**
     * Calculates deductions (Tax, Pension, Custom).
     * @param grossValue The base value to apply rates on.
     * @param params Full context parameters.
     */
    calculateDeductions(grossValue: number, params: ICalculationParams): any; // Returning detailed object

    /**
     * Calculates benefits (Food, Health, etc).
     */
    calculateBenefits(params: ICalculationParams): any; // Returning detailed object

    /**
     * Orchestrates the full calculation flow.
     * REFATORADO: Agora retorna Promise para suportar ConfigService
     */
    calculateTotal(params: ICalculationParams): ICalculationResult | Promise<ICalculationResult>;
}
