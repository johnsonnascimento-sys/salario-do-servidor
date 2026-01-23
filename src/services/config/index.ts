/**
 * Config Service - Exportações Públicas
 */

export { ConfigService, configService } from './ConfigService';
export { deepMerge, deepMergeMultiple } from './mergeConfig';
export type {
    GlobalConfig,
    PowerConfig,
    OrgConfig,
    EffectiveConfig,
    IRDeductionConfig,
    PSSTablesConfig,
    SalaryBasesConfig,
    AdjustmentScheduleConfig,
    GratificationPercentagesConfig,
    AQRulesConfig,
    BenefitsConfig,
} from './types';
