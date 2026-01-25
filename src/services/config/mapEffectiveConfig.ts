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

const toAdjustmentSchedule = (schedule?: AdjustmentScheduleConfig) => {
    if (!schedule) return undefined;
    return Object.entries(schedule)
        .map(([key, entry]) => {
            const numeric = toNumberKey(key);
            if (numeric === null) return null;
            return { period: numeric, percentage: entry.percentage };
        })
        .filter((entry): entry is { period: number; percentage: number } => !!entry)
        .sort((a, b) => a.period - b.period);
};

export const mapEffectiveConfigToCourtConfig = (effective: EffectiveConfig): CourtConfig => {
    const salaryBases = effective.salary_bases;

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
    if (effective.ir_deduction) {
        Object.entries(effective.ir_deduction).forEach(([key, table]) => {
            historico_ir[key] = table.deduction;
        });
    }

    const tecnicoBases = salaryBases?.tecnico ?? (salaryBases as any)?.tec ?? {};

    return {
        adjustment_schedule: toAdjustmentSchedule(effective.adjustment_schedule),
        bases: {
            salario: {
                analista: salaryBases?.analista ?? {},
                tec: tecnicoBases,
            },
            funcoes: salaryBases?.funcoes ?? {},
        },
        historico_pss,
        historico_ir,
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
    };
};
