/**
 * Hook de Gerenciamento de Estado - Calculadora
 * 
 * Responsável por:
 * - Estado da calculadora (CalculatorState)
 * - Funções de atualização (update, updateSubstDays)
 * - Gerenciamento de rubricas extras
 * - Handlers de mudança de tipo de cálculo
 */

import { useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { INITIAL_STATE, CalculatorState, Rubrica } from '../../types';
import { applyCalculatorPatch, loadCalculatorDraftState } from '../../utils/calculatorState';
import { CalculatorNavigationState } from '../../types/calculatorRestore';

const createRubricaId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `rubrica-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const invalidateOptionAmountsOnBaseChange = (previous: CalculatorState, next: CalculatorState): CalculatorState => {
    const referenceChanged = previous.anoRef !== next.anoRef || previous.mesRef !== next.mesRef;
    const salarySelectionChanged = previous.cargo !== next.cargo || previous.padrao !== next.padrao || previous.periodo !== next.periodo;
    if (!referenceChanged && !salarySelectionChanged) return next;

    return {
        ...next,
        rubricasExtras: next.rubricasExtras.map(rubrica =>
            referenceChanged || (rubrica.vantagemPessoal === 'ATS' && rubrica.atsPercentual !== undefined)
                ? { ...rubrica, pensionOptionAmountConfirmed: false, pensionOptionConfirmedValue: undefined }
                : rubrica)
    };
};

export const useCalculatorState = () => {
    const location = useLocation();
    const navigationState = location.state as CalculatorNavigationState | null;
    const editPayslipId = new URLSearchParams(location.search).get('editPayslipId') || '';
    const shouldBypassDraftRestore = Boolean(
        editPayslipId ||
        navigationState?.startBlank ||
        navigationState?.restoreSnapshot?.calculatorState
    );

    const [state, setState] = useState<CalculatorState>(() => (
        shouldBypassDraftRestore ? INITIAL_STATE : loadCalculatorDraftState()
    ));

    const update = useCallback((field: keyof CalculatorState, value: any) => {
        setState(prev => invalidateOptionAmountsOnBaseChange(prev, { ...prev, [field]: value }));
    }, []);

    const updateMany = useCallback((patch: Partial<CalculatorState>) => {
        setState(prev => invalidateOptionAmountsOnBaseChange(prev, applyCalculatorPatch(prev, patch)));
    }, []);

    const updateSubstDays = useCallback((key: string, days: number) => {
        setState(prev => ({
            ...prev,
            substDias: { ...prev.substDias, [key]: days }
        }));
    }, []);

    const addRubrica = useCallback((payload?: Rubrica['tipo'] | Partial<Rubrica>) => {
        const isString = typeof payload === 'string';
        const tipo: Rubrica['tipo'] = isString ? payload : payload?.tipo || 'C';
        const templatePatch = !isString && payload ? payload : {};

        const newRubrica: Rubrica = {
            id: createRubricaId(),
            descricao: '',
            valor: 0,
            tipo,
            incideIR: false,
            incidePSS: false,
            isEA: false,
            pssCompetenciaSeparada: false,
            ...templatePatch
        };
        setState(prev => ({
            ...prev,
            rubricasExtras: newRubrica.vantagemPessoal === 'VPNI'
                ? [...prev.rubricasExtras, newRubrica]
                : [newRubrica, ...prev.rubricasExtras]
        }));
        return newRubrica.id;
    }, []);

    const removeRubrica = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            rubricasExtras: prev.rubricasExtras.filter(r => r.id !== id)
        }));
    }, []);

    const updateRubrica = useCallback((id: string, field: keyof Rubrica, value: any, fallback?: Rubrica) => {
        setState(prev => {
            const existing = prev.rubricasExtras.find(rubrica => rubrica.id === id);
            const current = existing ?? fallback;
            if (!current) return prev;

            const updated = {
                ...current,
                ...(fallback?.vantagemPessoal
                    ? { vantagemPessoal: fallback.vantagemPessoal }
                    : field === 'descricao' && current.vantagemPessoal === undefined
                        ? { vantagemPessoal: null }
                        : {}),
                [field]: value,
                ...(['valor', 'atsPercentual', 'tipo', 'pensionRubricId', 'pensionOptionDate', 'pensionOptionReference', 'incideFunpresp', 'funprespCompetenciaSeparada', 'pssCompetenciaSeparada'].includes(field)
                    ? { pensionOptionAmountConfirmed: false, pensionOptionConfirmedValue: undefined } : {}),
                ...(field === 'pensionOptionAmountConfirmed' && current.atsPercentual !== undefined
                    ? { pensionOptionConfirmedValue: value === true ? fallback?.valor : undefined } : {})
            };

            return {
                ...prev,
                rubricasExtras: existing
                    ? prev.rubricasExtras.map(rubrica => rubrica.id === id ? updated : rubrica)
                    : [updated, ...prev.rubricasExtras]
            };
        });
    }, []);

    const handleTipoCalculoChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        const newTipo = e.target.value;
        let updates: Partial<CalculatorState> = { tipoCalculo: newTipo };

        if (newTipo === 'jan') updates.mesRef = 'JANEIRO';
        if (newTipo === 'jun') updates.mesRef = 'JUNHO';
        if (newTipo === 'nov') updates.mesRef = 'NOVEMBRO';

        setState(prev => invalidateOptionAmountsOnBaseChange(prev, { ...prev, ...updates }));
    }, []);

    return {
        state,
        setState,
        update,
        updateMany,
        updateSubstDays,
        addRubrica,
        removeRubrica,
        updateRubrica,
        handleTipoCalculoChange
    };
};
