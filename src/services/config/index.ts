/**
 * Config Service - Exportações Públicas
 */

export { ConfigService, configService, ConfigLoadError, ConfigNotFoundError } from './ConfigService';
export { deepMerge, deepMergeMultiple } from './mergeConfig';
export { mapEffectiveConfigToCourtConfig } from './mapEffectiveConfig';
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
