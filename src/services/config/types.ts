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
