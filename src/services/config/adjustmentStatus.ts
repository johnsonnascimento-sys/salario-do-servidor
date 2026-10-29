import type { CourtConfig, AdjustmentScheduleEntry } from '../../types';

export function resolveAdjustmentStatus(entry: Partial<AdjustmentScheduleEntry>) {
    const known = ['promulgated', 'vetoed', 'projected'].includes(entry.status || '');
    const status = known ? entry.status : entry.status !== undefined ? undefined
        : entry.vetoed === true ? 'vetoed' as const : entry.vetoed === false ? 'promulgated' as const : undefined;
    return { status, vetoed: status === 'vetoed', reviewRequired: Boolean(entry.reviewRequired || status === undefined) };
}

/** Technical fallback configurations must obey the same explicit-status contract. */
export function normalizeLegacyAdjustmentStatus(config: CourtConfig): CourtConfig {
    const schedule = config.adjustment_schedule ?? config.values?.adjustment_schedule ?? config.values?.reajustes;
    if (!Array.isArray(schedule)) return config;
    return { ...config, adjustment_schedule: schedule.map(entry => ({ ...entry, ...resolveAdjustmentStatus(entry) })) };
}
