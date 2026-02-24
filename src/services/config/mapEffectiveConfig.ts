import { AdjustmentScheduleConfig, EffectiveConfig } from './types';
import { CourtConfig, TaxTable } from '../../types';

const toNumberKey = (key: string) => {
    const parsed = Number(key.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
};

const pickLatestValue = (values?: Record<string, number>): number | undefined => {
    if (!values) return undefined;
    const entries = Object.entries(values);
    if (entries.length === 0) return undefined;

    const withNumericKeys = entries
        .map(([key, value]) => ({ key, value, numeric: toNumberKey(key) }))
        .filter((entry) => entry.numeric !== null) as Array<{ key: string; value: number; numeric: number }>;

    if (withNumericKeys.length > 0) {
        withNumericKeys.sort((a, b) => b.numeric - a.numeric);
        return withNumericKeys[0].value;
    }

    return entries[entries.length - 1][1];
};

const toMenuOptions = (values?: Record<string, number>) => {
    if (!values) return undefined;
    return Object.entries(values)
        .sort(([a], [b]) => {
            const aNum = toNumberKey(a);
            const bNum = toNumberKey(b);
            if (aNum !== null && bNum !== null) return bNum - aNum;
            return b.localeCompare(a);
        })
        .map(([label, value]) => ({ label, value }));
};

const pickCaseInsensitive = (obj: Record<string, any> | undefined, key: string) => {
    if (!obj) return undefined;
    if (key in obj) return obj[key];
    const found = Object.keys(obj).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    return found ? obj[found] : undefined;
};

const toAdjustmentSchedule = (schedule?: AdjustmentScheduleConfig) => {
    if (!schedule) return undefined;
    return Object.entries(schedule)
        .map(([key, entry]) => {
            const numeric = toNumberKey(key);
            if (numeric === null) return null;
            return { period: numeric, percentage: entry.percentage, label: entry.label, date: entry.date };
        })
        .filter((entry): entry is { period: number; percentage: number; label?: string; date?: string } => !!entry)
        .sort((a, b) => a.period - b.period);
};

export const mapEffectiveConfigToCourtConfig = (effective: EffectiveConfig): CourtConfig => {
    const salaryBases = effective.salary_bases;
    const salarySource = (salaryBases as any)?.salario ?? salaryBases ?? {};

    const historico_pss: Record<string, TaxTable> = {};
    if (effective.pss_tables) {
        Object.entries(effective.pss_tables).forEach(([key, table]) => {
            historico_pss[key] = {
                teto_rgps: table.ceiling,
                faixas: table.rates.map((rate) => ({
                    min: rate.min,
                    max: rate.max ?? Infinity,
                    rate: rate.rate,
                })),
            };
        });
    }

    const historico_ir: Record<string, number> = {};
    const historico_ir_brackets: Record<string, Array<{ min: number; max: number; rate: number; deduction: number }>> = {};
    if (effective.ir_deduction) {
        Object.entries(effective.ir_deduction).forEach(([key, table]) => {
            historico_ir[key] = table.deduction;
            historico_ir_brackets[key] = (table.brackets || []).map((bracket) => ({
                min: bracket.min,
                max: bracket.max ?? Infinity,
                rate: bracket.rate,
                deduction: bracket.deduction,
            }));
        });
    }

    // Compat: explicita jan-abr/2025 quando a base ainda só trouxe 2025_maio.
    // Isso mantém a seleção histórica correta no front até a migração do banco ser aplicada.
    if (!historico_ir['2025_jan'] && historico_ir['2025_maio'] && historico_ir['2024_fev']) {
        historico_ir['2025_jan'] = historico_ir['2024_fev'];
        historico_ir_brackets['2025_jan'] = [...(historico_ir_brackets['2024_fev'] || [])];
    }

    const salaryBasesNormalized: Record<string, Record<string, number>> = {};
    Object.entries(salarySource || {}).forEach(([cargo, padroes]) => {
        if (cargo.toLowerCase() === 'funcoes') return;
        if (!padroes || typeof padroes !== 'object') return;
        salaryBasesNormalized[cargo] = padroes as Record<string, number>;
    });
    const funcoesBases =
        pickCaseInsensitive(salaryBases as any, 'funcoes') ??
        pickCaseInsensitive(salarySource, 'funcoes') ??
        {};

    return {
        adjustment_schedule: toAdjustmentSchedule(effective.adjustment_schedule),
        bases: {
            salario: salaryBasesNormalized,
            funcoes: funcoesBases,
        },
        historico_pss,
        historico_ir,
        historico_ir_brackets,
        values: {
            food_allowance: pickLatestValue(effective.benefits?.auxilio_alimentacao),
            pre_school: pickLatestValue(effective.benefits?.auxilio_preescolar),
            deducao_dep: effective.dependent_deduction,
            cj1_integral_base: effective.cj1_integral_base,
        },
        menus: {
            food_allowance: toMenuOptions(effective.benefits?.auxilio_alimentacao),
            preschool_allowance: toMenuOptions(effective.benefits?.auxilio_preescolar),
        },
        dailies: effective.dailies_rules
            ? {
                rates: effective.dailies_rules.rates ?? {},
                embarkationAdditional: {
                    completo: effective.dailies_rules.embarkation_additional?.completo ?? 0,
                    metade: effective.dailies_rules.embarkation_additional?.metade ?? 0,
                },
                externalGloss: {
                    hospedagem: effective.dailies_rules.external_gloss?.hospedagem ?? 0,
                    alimentacao: effective.dailies_rules.external_gloss?.alimentacao ?? 0,
                    transporte: effective.dailies_rules.external_gloss?.transporte ?? 0,
                },
            }
            : undefined,
        payrollRules: effective.payroll_rules
            ? {
                gajRate: effective.payroll_rules.gaj_rate,
                specificGratificationRate: effective.payroll_rules.specific_gratification_rate,
                vrRateOnCj1: effective.payroll_rules.vr_rate_on_cj1,
                monthDayDivisor: effective.payroll_rules.month_day_divisor,
                overtimeMonthHours: effective.payroll_rules.overtime_month_hours,
                transportWorkdays: effective.payroll_rules.transport_workdays,
                transportDiscountRate: effective.payroll_rules.transport_discount_rate,
                irrfTopRate: effective.payroll_rules.irrf_top_rate,
            }
            : undefined,
        careerCatalog: effective.career_catalog
            ? {
                noFunctionCode: effective.career_catalog.no_function_code,
                noFunctionLabel: effective.career_catalog.no_function_label,
                cargoLabels: effective.career_catalog.cargo_labels ?? {},
            }
            : undefined,
    };
};
