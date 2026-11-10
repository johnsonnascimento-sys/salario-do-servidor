import { AdjustmentScheduleConfig, EffectiveConfig, PrevidenciaComplementarPowerConfig } from './types';
import { CourtConfig, TaxTable, AdjustmentScheduleEntry, PrevidenciaComplementarConfig } from '../../types';
import type { IrTableMetadata } from '../../types/irEa';

const mapComplementaryConfig = (config: Omit<PrevidenciaComplementarPowerConfig, 'historical_rules'>): PrevidenciaComplementarConfig => ({
    enabled: Boolean(config.enabled),
    scope: config.scope ?? 'patrocinado',
    sponsoredRate: {
        min: Number(config.sponsored_rate?.min ?? 0),
        max: Number(config.sponsored_rate?.max ?? 0),
        step: Number(config.sponsored_rate?.step ?? 0),
        defaultRpc: Number(config.sponsored_rate?.default_rpc ?? 0),
    },
    facultativeRate: {
        minIfPositive: Number(config.facultative_rate?.min_if_positive ?? 0),
        max: config.facultative_rate?.max,
        step: config.facultative_rate?.step,
        default: Number(config.facultative_rate?.default ?? 0),
    },
    linkedRate: config.linked_rate,
    minimumUrpUnits: config.minimum_urp_units,
    urpByCompetence: config.urp_by_competence,
    urpSourcesByCompetence: config.urp_sources_by_competence,
    incidenceRules: config.incidence_rules,
    baseRule: config.base_rule ?? 'excedente_teto_rgps',
    includeThirteenth: Boolean(config.include_thirteenth),
    rubricCatalog: config.rubric_catalog?.map(rule => ({ id: rule.id, label: rule.label,
        classification: rule.classification, validFrom: rule.valid_from, validTo: rule.valid_to, source: rule.source })),
    costingDisclosure: {
        loadingNormal: config.costing_disclosure?.loading_normal,
        loadingFacultative: config.costing_disclosure?.loading_facultative,
        fcbeShareOfNormal: config.costing_disclosure?.fcbe_share_of_normal,
        adminRemidoAssistido: config.costing_disclosure?.admin_remido_assistido,
        effectiveFrom: config.costing_disclosure?.effective_from,
    },
    references: {
        regulamentoVersion: config.references?.regulamento_version,
        planoCusteioRef: config.references?.plano_custeio_ref,
    },
});

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
        .reduce<AdjustmentScheduleEntry[]>((acc, [key, entry]) => {
            const numeric = toNumberKey(key);
            if (numeric === null) return acc;
            const isVetoed = entry.vetoed !== undefined
                ? entry.vetoed
                : (entry.status === 'vetoed' || (entry.date ? entry.date >= '2027-01-01' && entry.percentage > 0 : false));
            acc.push({
                period: numeric,
                percentage: entry.percentage,
                label: entry.label,
                date: entry.date,
                status: entry.status ?? (isVetoed ? 'vetoed' : 'promulgated'),
                vetoed: isVetoed,
                veto_reference: entry.veto_reference ?? (isVetoed ? 'Veto nº 45/2025' : undefined)
            });
            return acc;
        }, [])
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
    const historico_ir_metadata: Record<string, IrTableMetadata> = {};
    const historico_ir_brackets: Record<string, Array<{ min: number; max: number; rate: number; deduction: number }>> = {};
    if (effective.ir_deduction) {
        Object.entries(effective.ir_deduction).forEach(([key, table]) => {
            historico_ir[key] = table.deduction;
            // Missing metadata remains missing: the EA engine must request review,
            // rather than infer legal validity or RRA deductions from a table name.
            if (table.valid_from && table.reference && table.rra) {
                historico_ir_metadata[key] = {
                    validFrom: table.valid_from,
                    ...(table.valid_to ? { validTo: table.valid_to } : {}),
                    reference: table.reference,
                    rra: table.rra,
                };
            }
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
        orgSlug: effective.org_slug,
        orgName: effective.org_name,
        powerName: effective.power_name,
        // No fallback: an organ without a registered rule cannot offer this credit.
        transportIndemnity: effective.transport_indemnity,
        adjustment_schedule: toAdjustmentSchedule(effective.adjustment_schedule),
        bases: {
            salario: salaryBasesNormalized,
            funcoes: funcoesBases,
        },
        historico_pss,
        historico_ir,
        historico_ir_brackets,
        historico_ir_metadata,
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
                branchId: (effective.dailies_rules as any)?.branch_id ?? (
                    effective.org_slug === 'jmu' || effective.org_slug === 'stm' ? 'jmu' : 'cjf'
                ),
                orgSlug: effective.org_slug,
                rates: effective.dailies_rules.rates ?? {},
                embarkationAdditional: {
                    completo: effective.dailies_rules.embarkation_additional?.completo ?? 0,
                    metade: effective.dailies_rules.embarkation_additional?.metade ?? 0,
                },
                derivedFromMinister: {
                    enabled: Boolean(effective.dailies_rules.derived_from_minister?.enabled),
                    ministerPerDiem: Number(effective.dailies_rules.derived_from_minister?.minister_per_diem ?? 0),
                    ratesPercentages: effective.dailies_rules.derived_from_minister?.rates_percentages ?? {},
                    embarkationPercentageFull: Number(effective.dailies_rules.derived_from_minister?.embarkation_percentage_full ?? 0),
                    embarkationPercentageHalf: effective.dailies_rules.derived_from_minister?.embarkation_percentage_half !== undefined
                        ? Number(effective.dailies_rules.derived_from_minister?.embarkation_percentage_half)
                        : undefined,
                    assistancePercentage: effective.dailies_rules.derived_from_minister?.assistance_percentage !== undefined
                        ? Number(effective.dailies_rules.derived_from_minister?.assistance_percentage)
                        : undefined,
                    fullTimeAccompanimentPercentage: effective.dailies_rules.derived_from_minister?.full_time_accompaniment_percentage !== undefined
                        ? Number(effective.dailies_rules.derived_from_minister?.full_time_accompaniment_percentage)
                        : undefined,
                },
                externalGloss: {
                    hospedagem: effective.dailies_rules.external_gloss?.hospedagem ?? 0,
                    alimentacao: effective.dailies_rules.external_gloss?.alimentacao ?? 0,
                    transporte: effective.dailies_rules.external_gloss?.transporte ?? 0,
                },
                ldoCap: {
                    enabled: Boolean(effective.dailies_rules.ldo_cap?.enabled),
                    perDiemLimit: Number(effective.dailies_rules.ldo_cap?.per_diem_limit ?? 0),
                },
                embarkationLabel: effective.dailies_rules.embarkation_label,
                embarkationDescription: effective.dailies_rules.embarkation_description,
                discountRules: {
                    foodDivisor: Number(effective.dailies_rules.discount_rules?.food_divisor ?? 0),
                    transportDivisor: Number(effective.dailies_rules.discount_rules?.transport_divisor ?? 0),
                    excludeWeekendsAndHolidays: Boolean(effective.dailies_rules.discount_rules?.exclude_weekends_and_holidays),
                    holidays: Array.isArray(effective.dailies_rules.discount_rules?.holidays)
                        ? effective.dailies_rules.discount_rules!.holidays
                        : [],
                    halfDailyOnBusinessReturnDay: Boolean(effective.dailies_rules.discount_rules?.return_day_half_diem_business_day),
                    halfDiscountOnBusinessReturnDay: Boolean(effective.dailies_rules.discount_rules?.return_day_half_discount_business_day),
                    holidayCalendarLabel: effective.dailies_rules.discount_rules?.holiday_calendar_label,
                    holidayCalendarReference: effective.dailies_rules.discount_rules?.holiday_calendar_reference,
                    holidayCalendarVersion: effective.dailies_rules.discount_rules?.holiday_calendar_version,
                },
                normativeInfo: effective.dailies_rules.normative_info
                    ? {
                        generalRuleLabel: effective.dailies_rules.normative_info.general_rule_label,
                        branchRuleLabel: effective.dailies_rules.normative_info.branch_rule_label,
                        localRuleLabel: effective.dailies_rules.normative_info.local_rule_label,
                        notes: effective.dailies_rules.normative_info.notes,
                    }
                    : undefined,
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
        previdenciaComplementar: effective.previdencia_complementar ? {
            ...mapComplementaryConfig(effective.previdencia_complementar),
            historicalRules: effective.previdencia_complementar.historical_rules?.map(rule => ({
                id: rule.id, validFrom: rule.valid_from, validTo: rule.valid_to, source: rule.source, tabelaPSS: rule.tabela_pss,
                configuration: mapComplementaryConfig(rule.configuration),
            })),
        } : undefined,
        careerCatalog: effective.career_catalog
            ? {
                noFunctionCode: effective.career_catalog.no_function_code,
                noFunctionLabel: effective.career_catalog.no_function_label,
                cargoLabels: effective.career_catalog.cargo_labels ?? {},
            }
            : undefined,
    };
};
