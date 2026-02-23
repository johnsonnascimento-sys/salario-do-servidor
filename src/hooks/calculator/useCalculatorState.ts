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
import { INITIAL_STATE, CalculatorState, Rubrica } from '../../types';

export const useCalculatorState = () => {
    const [state, setState] = useState<CalculatorState>(INITIAL_STATE);

    const update = useCallback((field: keyof CalculatorState, value: any) => {
        setState(prev => ({ ...prev, [field]: value }));
    }, []);

    const updateSubstDays = useCallback((key: string, days: number) => {
        setState(prev => ({
            ...prev,
            substDias: { ...prev.substDias, [key]: days }
        }));
    }, []);

    const addRubrica = useCallback((tipo: Rubrica['tipo'] = 'C') => {
        const newRubrica: Rubrica = {
            id: Math.random().toString(36).substr(2, 9),
            descricao: '',
            valor: 0,
            tipo,
            incideIR: false,
            incidePSS: false,
            isEA: false
        };
        setState(prev => ({
            ...prev,
            rubricasExtras: [...prev.rubricasExtras, newRubrica]
        }));
    }, []);

    const removeRubrica = useCallback((id: string) => {
        setState(prev => ({
            ...prev,
            rubricasExtras: prev.rubricasExtras.filter(r => r.id !== id)
        }));
    }, []);

    const updateRubrica = useCallback((id: string, field: keyof Rubrica, value: any) => {
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
        updateSubstDays,
        addRubrica,
        removeRubrica,
        updateRubrica,
        handleTipoCalculoChange
    };
};
