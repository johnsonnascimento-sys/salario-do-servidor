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
        if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) return;
        setState(prev => ({ ...prev, [field]: value }));
    }, []);

    const updateMany = useCallback((patch: Partial<CalculatorState>) => {
        setState(prev => applyCalculatorPatch(prev, patch));
    }, []);

    const updateSubstDays = useCallback((key: string, days: number) => {
        if (!Number.isFinite(days) || days < 0) return;
        setState(prev => ({
            ...prev,
            substDias: { ...prev.substDias, [key]: days }
        }));
    }, []);

    const addRubrica = useCallback((tipo: Rubrica['tipo'] = 'C') => {
        const newRubrica: Rubrica = {
            id: createRubricaId(),
            descricao: '',
            valor: 0,
            tipo,
            incideIR: false,
            incidePSS: false,
            isEA: false,
            pssCompetenciaSeparada: false
        };
        setState(prev => ({
            ...prev,
            rubricasExtras: [newRubrica, ...prev.rubricasExtras]
        }));
    }, []);

    const removeRubrica = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            rubricasExtras: prev.rubricasExtras.filter(r => r.id !== id)
        }));
    }, []);

    const updateRubrica = useCallback((id: string, field: keyof Rubrica, value: any) => {
        if (field === 'valor' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return;
        setState(prev => ({
            ...prev,
            rubricasExtras: prev.rubricasExtras.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    }, []);

    const handleTipoCalculoChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
        const newTipo = e.target.value;
        let updates: Partial<CalculatorState> = { tipoCalculo: newTipo };

        if (newTipo === 'jan') updates.mesRef = 'JANEIRO';
        if (newTipo === 'jun') updates.mesRef = 'JUNHO';
        if (newTipo === 'nov') updates.mesRef = 'NOVEMBRO';

        setState(prev => ({ ...prev, ...updates }));
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
