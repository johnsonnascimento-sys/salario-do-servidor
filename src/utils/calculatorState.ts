import { CALCULATOR_DRAFT_STORAGE_KEY } from '../constants/storage';
import { CalculatorState, INITIAL_STATE } from '../types';

const createEntryId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const cloneCalculatorSnapshot = (snapshot: unknown): Partial<CalculatorState> => {
    if (!snapshot || typeof snapshot !== 'object') {
        return {};
    }

    try {
        if (typeof structuredClone === 'function') {
            return structuredClone(snapshot) as Partial<CalculatorState>;
        }
    } catch (_error) {
        // fallback abaixo
    }

    try {
        return JSON.parse(JSON.stringify(snapshot)) as Partial<CalculatorState>;
    } catch (_error) {
        return snapshot as Partial<CalculatorState>;
    }
};

export const hydrateCalculatorState = (snapshot: unknown): CalculatorState => {
    if (!snapshot || typeof snapshot !== 'object') {
        return INITIAL_STATE;
    }

    const safeSnapshot = cloneCalculatorSnapshot(snapshot);
    const merged = {
        ...INITIAL_STATE,
        ...safeSnapshot,
    };
    const inferredFunctionFromSubstDias = Object.entries(merged.substDias || {}).find(([, days]) => Number(days || 0) > 0)?.[0] || '';
    const inferredFunctionFromEntries = Array.isArray(merged.substitutionEntries)
        ? merged.substitutionEntries
            .flatMap((entry) => Object.entries(entry?.dias || {}))
            .find(([, days]) => Number(days || 0) > 0)?.[0] || ''
        : '';
    const resolvedFuncao = String(merged.funcao || inferredFunctionFromSubstDias || inferredFunctionFromEntries || '').trim();

    return {
        ...merged,
        funcao: resolvedFuncao,
        rubricasExtras: Array.isArray(merged.rubricasExtras) ? merged.rubricasExtras : [],
        overtimeEntries: Array.isArray(merged.overtimeEntries)
            ? merged.overtimeEntries.map((entry) => ({
                ...entry,
                id: entry?.id || createEntryId('he-entry'),
                qtd50: Math.max(0, Number(entry?.qtd50 || 0)),
                qtd100: Math.max(0, Number(entry?.qtd100 || 0)),
                isEA: Boolean(entry?.isEA),
                excluirIR: Boolean(entry?.excluirIR),
            }))
            : [],
        substitutionEntries: Array.isArray(merged.substitutionEntries)
            ? merged.substitutionEntries.map((entry) => ({
                ...entry,
                id: entry?.id || createEntryId('subst-entry'),
                dias: entry?.dias && typeof entry.dias === 'object' ? entry.dias : {},
                isEA: Boolean(entry?.isEA),
                pssIsEA: Boolean(entry?.pssIsEA),
            }))
            : [],
    };
};

export const loadCalculatorDraftState = (): CalculatorState => {
    if (typeof window === 'undefined') {
        return INITIAL_STATE;
    }

    try {
        const rawDraft = window.localStorage.getItem(CALCULATOR_DRAFT_STORAGE_KEY);
        if (!rawDraft) {
            return INITIAL_STATE;
        }

        return hydrateCalculatorState(JSON.parse(rawDraft));
    } catch (_error) {
        return INITIAL_STATE;
    }
};
