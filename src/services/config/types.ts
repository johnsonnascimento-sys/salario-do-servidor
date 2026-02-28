/**
 * Tipos para o Sistema de Configuração Hierárquica
 * 
 * Hierarquia: global_config → power_config → org_config
 * Configurações mais específicas sobrescrevem as mais genéricas.
 */

/**
 * Configuração Global
 * Regras que se aplicam a todos os órgãos (IR, PSS, etc.)
 */
export interface GlobalConfig {
    ir_deduction: IRDeductionConfig;
    pss_tables: PSSTablesConfig;
    dependent_deduction: number;
}

/**
 * Configuração de Dedução de IR
 */
export interface IRDeductionConfig {
    [year: string]: {
        deduction: number;
        brackets: Array<{
            min: number;
            max: number | null;
            rate: number;
            deduction: number;
        }>;
    };
}

/**
 * Configuração de Tabelas PSS
 */
export interface PSSTablesConfig {
    [year: string]: {
        ceiling: number;
        rates: Array<{
            min: number;
            max: number | null;
            rate: number;
        }>;
    };
}

/**
 * Configuração de Poder
 * Regras compartilhadas por um poder (PJU, Executivo, etc.)
 */
export interface PowerConfig {
    cj1_integral_base?: number;
    salary_bases?: SalaryBasesConfig;
    adjustment_schedule?: AdjustmentScheduleConfig;
    gratification_percentages?: GratificationPercentagesConfig;
    aq_rules?: AQRulesConfig;
    benefits?: BenefitsConfig;
    dailies_rules?: DailiesRulesConfig;
    payroll_rules?: PayrollRulesConfig;
    previdencia_complementar?: PrevidenciaComplementarPowerConfig;
    career_catalog?: CareerCatalogConfig;
}

export interface PrevidenciaComplementarPowerConfig {
    enabled: boolean;
    scope: string;
    sponsored_rate: {
        min: number;
        max: number;
        step: number;
        default_rpc: number;
    };
    facultative_rate: {
        min_if_positive: number;
        max: number;
        step: number;
        default: number;
    };
    base_rule: string;
    include_thirteenth: boolean;
    costing_disclosure?: {
        loading_normal?: number;
        loading_facultative?: number;
        fcbe_share_of_normal?: number;
        admin_remido_assistido?: number;
        effective_from?: string;
    };
    references?: {
        regulamento_version?: string;
        plano_custeio_ref?: string;
    };
}

/**
 * Bases Salariais
 */
export interface SalaryBasesConfig {
    analista: {
        [level: string]: number;
    };
    tecnico: {
        [level: string]: number;
    };
    funcoes: {
        [fc: string]: number;
    };
}

/**
 * Cronograma de Reajustes
 */
export interface AdjustmentScheduleConfig {
    [period: string]: {
        date: string;
        percentage: number;
        label?: string;
    };
}

/**
 * Percentuais de Gratificações
 */
export interface GratificationPercentagesConfig {
    gaj: number;
    gae: number;
    gas: number;
}

/**
 * Regras de AQ (Adicional de Qualificação)
 */
export interface AQRulesConfig {
    old_system: {
        [qualification: string]: number;
    };
    new_system: {
        [qualification: string]: number;
    };
}

/**
 * Benefícios (Auxílios)
 */
export interface BenefitsConfig {
    auxilio_alimentacao: {
        [period: string]: number;
    };
    auxilio_preescolar: {
        [period: string]: number;
    };
}

/**
 * Regras de Diarias de Viagem
 */
export interface DailiesRulesConfig {
    rates: Record<string, number>;
    embarkation_additional: {
        completo: number;
        metade: number;
    };
    derived_from_minister?: {
        enabled: boolean;
        minister_per_diem: number;
        rates_percentages: Record<string, number>;
        embarkation_percentage_full: number;
        embarkation_percentage_half?: number;
    };
    external_gloss: {
        hospedagem: number;
        alimentacao: number;
        transporte: number;
    };
    ldo_cap?: {
        enabled: boolean;
        per_diem_limit: number;
    };
    discount_rules?: {
        food_divisor: number;
        transport_divisor: number;
        exclude_weekends_and_holidays: boolean;
        holidays: string[];
        return_day_half_diem_business_day?: boolean;
        return_day_half_discount_business_day?: boolean;
        holiday_calendar_label?: string;
        holiday_calendar_reference?: string;
        holiday_calendar_version?: string;
    };
}

/**
 * Regras gerais de calculo da folha
 */
export interface PayrollRulesConfig {
    gaj_rate: number;
    specific_gratification_rate: number;
    vr_rate_on_cj1: number;
    month_day_divisor: number;
    overtime_month_hours: number;
    transport_workdays: number;
    transport_discount_rate: number;
    irrf_top_rate: number;
}

/**
 * Catalogo de carreira para UI e parametros funcionais
 */
export interface CareerCatalogConfig {
    no_function_code: string;
    no_function_label: string;
    cargo_labels: Record<string, string>;
}

/**
 * Configuração de Organização
 * Regras específicas de um órgão (JMU, STM, etc.)
 */
export interface OrgConfig {
    org_slug: string;
    org_name: string;
    power_name: string;
    configuration: Partial<PowerConfig>;
}

/**
 * Configuração Efetiva (Resultado do Merge)
 * União de global + power + org
 */
export interface EffectiveConfig extends GlobalConfig, PowerConfig {
    org_slug: string;
    org_name: string;
    power_name: string;
}

/**
 * Registro de Global Config do Banco
 */
export interface GlobalConfigRecord {
    id: string;
    config_key: string;
    config_value: any;
    valid_from: string;
    valid_to: string | null;
}

/**
 * Registro de Power Config do Banco
 */
export interface PowerConfigRecord {
    id: string;
    power_name: string;
    config_key: string;
    config_value: any;
    valid_from: string;
    valid_to: string | null;
}

/**
 * Registro de Org Config do Banco
 */
export interface OrgConfigRecord {
    id: string;
    org_slug: string;
    org_name: string;
    power_name: string;
    configuration: any;
}
