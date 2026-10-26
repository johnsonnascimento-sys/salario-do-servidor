import type { CourtConfig, SalaryAdjustment } from '../types';

export interface SalaryScenarioState {
    periodo: number;
    simularDerrubadaVeto?: boolean;
    salaryProjectionLabel?: string;
    anoRef?: number;
    mesRef?: string;
}

const rawSchedule = (config?: CourtConfig | null): SalaryAdjustment[] => {
    const entries = config?.adjustment_schedule ?? config?.values?.adjustment_schedule ?? config?.values?.reajustes;
    return Array.isArray(entries) ? entries : [];
};

/** Unclassified legacy configuration retains its former behavior; legal status comes only from configuration. */
export const getSalarySchedule = (config?: CourtConfig | null, includeHypothetical = false): SalaryAdjustment[] =>
    rawSchedule(config)
        .filter(entry => Number.isFinite(entry.period) && Number.isFinite(entry.percentage))
        .filter(entry => includeHypothetical || entry.status !== 'hypothetical')
        .sort((a, b) => a.period - b.period);

/** An explicit false always wins. Only an unclassified legacy input can infer its original scenario. */
export const isSalaryProjection = (state: SalaryScenarioState, config?: CourtConfig | null): boolean => {
    if (typeof state.simularDerrubadaVeto === 'boolean') return state.simularDerrubadaVeto;
    return Boolean(state.salaryProjectionLabel || rawSchedule(config).find(entry => entry.period === state.periodo)?.status === 'hypothetical');
};

export const getSalaryCorrections = (periodo: number, config: CourtConfig, projection?: boolean): SalaryAdjustment[] =>
    getSalarySchedule(config, isSalaryProjection({ periodo, simularDerrubadaVeto: projection }, config))
        .filter(entry => entry.period <= periodo);

export const applySalaryCorrections = (base: number, periodo: number, config: CourtConfig, projection?: boolean): number =>
    getSalaryCorrections(periodo, config, projection).reduce((value, entry) => {
        const percentage = entry.percentage > 1 ? entry.percentage / 100 : entry.percentage;
        return value * (1 + percentage);
    }, base);

const referenceMonth = (value?: string): number | undefined => {
    if (!value) return undefined;
    if (/^(0?[1-9]|1[0-2])$/.test(value)) return Number(value);
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (let month = 1; month <= 12; month++) {
        const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })
            .format(new Date(Date.UTC(2000, month - 1, 1)))
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (label === normalized || label.slice(0, 3) === normalized) return month;
    }
    return undefined;
};

/** Competence chooses an eligible period within the scenario; it never enables projections itself. */
export const resolveSalaryPeriod = (
    state: SalaryScenarioState, config: CourtConfig, ano = state.anoRef, mes: number | string | undefined = state.mesRef,
): number => {
    const schedule = getSalarySchedule(config, isSalaryProjection(state, config));
    if (!schedule.length) return state.periodo;
    const month = typeof mes === 'number' ? mes : referenceMonth(mes);
    if (!Number.isFinite(ano) || !Number.isInteger(month) || month! < 1 || month! > 12) {
        return schedule.filter(entry => entry.period <= state.periodo).at(-1)?.period ?? schedule[0].period;
    }
    const competence = `${ano}-${String(month).padStart(2, '0')}`;
    const dated = schedule.filter(entry => entry.date && /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(entry.date))
        .sort((a, b) => a.date!.localeCompare(b.date!) || a.period - b.period);
    return dated.filter(entry => entry.date!.slice(0, 7) <= competence).at(-1)?.period
        ?? dated[0]?.period ?? schedule.filter(entry => entry.period <= state.periodo).at(-1)?.period ?? schedule[0].period;
};

/** Persist the projection label with the snapshot so exports never need today's configuration to describe it. */
export const getSalaryScenarioNotice = (state: SalaryScenarioState, config?: CourtConfig | null): string[] => {
    if (!isSalaryProjection(state, config)) {
        if (!config && state.simularDerrubadaVeto === undefined) return ['Cenário salarial não identificado no holerite salvo.'];
        return ['Folha vigente — sem aplicação de reajustes hipotéticos.'];
    }
    const hypothetical = getSalarySchedule(config, true)
        .filter(entry => entry.status === 'hypothetical' && entry.period <= state.periodo);
    const last = hypothetical.at(-1);
    const label = state.salaryProjectionLabel || last?.scenarioLabel || 'Projeção de derrubada do veto';
    const references = [...new Set(hypothetical.map(entry => entry.legalReference).filter(Boolean))];
    return [label, 'Cenário hipotético, condicionado à alteração legislativa. Não corresponde à folha vigente.', ...references as string[]];
};
