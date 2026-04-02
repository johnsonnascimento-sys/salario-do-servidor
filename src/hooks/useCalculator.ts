/**
 * Hook Principal da Calculadora - Orquestrador
 *
 * Compõe hooks especializados para fornecer interface unificada:
 * - useCalculatorState: Gerenciamento de estado
 * - useCalculatorConfig: Carregamento de configuração
 * - useCalculatorExport: Exportação PDF/Excel
 * - useCalculatorResults: Cálculos e resultados
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCalculatorState } from './calculator/useCalculatorState';
import { useCalculatorConfig } from './calculator/useCalculatorConfig';
import { useCalculatorExport } from './calculator/useCalculatorExport';
import { useCalculatorResults } from './calculator/useCalculatorResults';
import { useUserAuth } from './user/useUserAuth';
import { createPayslip, updatePayslip } from '../services/user/payslipService';
import { getMyProfile } from '../services/user/profileService';
import {
    CALCULATOR_DRAFT_STORAGE_KEY,
    USER_AREA_LAST_CALCULATOR_STATE_KEY,
    USER_AREA_LAST_RESULT_ROWS_KEY,
} from '../constants/storage';
import { CalculatorNavigationState } from '../types/calculatorRestore';
import { stripCalculatedFieldsFromCalculatorState } from '../utils/calculatorState';

export const useCalculator = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const navigationState = location.state as (CalculatorNavigationState & { editPayslipId?: string }) | null;
    const stateEditPayslipId = navigationState?.editPayslipId;
    const queryEditPayslipId = new URLSearchParams(location.search).get('editPayslipId') || undefined;
    const editPayslipId = stateEditPayslipId || queryEditPayslipId;
    const isRestoringSavedSnapshot = Boolean(editPayslipId || navigationState?.restoreSnapshot?.calculatorState);
    const { user } = useUserAuth();
    const [savingPayslip, setSavingPayslip] = useState(false);
    const [loggedUserName, setLoggedUserName] = useState('');

    const {
        state,
        setState,
        update,
        updateSubstDays,
        addRubrica,
        removeRubrica,
        updateRubrica,
        handleTipoCalculoChange
    } = useCalculatorState();

    const {
        agency,
        agencyService,
        loadingAgency,
        courtConfig,
        loadingConfig,
        configError
    } = useCalculatorConfig(slug);

    const {
        donationModalOpen,
        setDonationModalOpen,
        pendingExportType,
        initiateExportPDF,
        initiateExportExcel,
        handleDonationComplete: handleDonationCompleteBase
    } = useCalculatorExport();

    const { calculatedState, resultRows } = useCalculatorResults(
        state,
        agencyService,
        courtConfig,
        agency
    );
    const effectiveState = { ...state, ...calculatedState };

    const handleDonationComplete = () => {
        handleDonationCompleteBase(effectiveState, resultRows, courtConfig).catch((error) => {
            console.error('Falha ao exportar arquivo:', error);
        });
    };

    useEffect(() => {
        if (!user) {
            setLoggedUserName('');
            return;
        }

        const metadataName = String(
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ''
        ).trim();

        if (metadataName) {
            setLoggedUserName(metadataName);
        }

        let active = true;
        getMyProfile()
            .then((profile) => {
                if (!active) return;
                const profileName = String(profile?.full_name || '').trim();
                if (profileName) {
                    setLoggedUserName(profileName);
                }
            })
            .catch(() => null);

        return () => {
            active = false;
        };
    }, [user]);

    useEffect(() => {
        if (!user || !loggedUserName || isRestoringSavedSnapshot) return;
        if (!state.nome.trim()) {
            update('nome', loggedUserName);
        }
    }, [user, loggedUserName, state.nome, update, isRestoringSavedSnapshot]);

    useEffect(() => {
        try {
            const persistedState = stripCalculatedFieldsFromCalculatorState(state);
            localStorage.setItem(USER_AREA_LAST_CALCULATOR_STATE_KEY, JSON.stringify(persistedState));
            localStorage.setItem(USER_AREA_LAST_RESULT_ROWS_KEY, JSON.stringify(resultRows));
            localStorage.setItem(CALCULATOR_DRAFT_STORAGE_KEY, JSON.stringify(persistedState));
        } catch (_error) {
            // Ignora falhas de localStorage em modo privado/restrito.
        }
    }, [state, resultRows]);

    const saveCurrentPayslip = useCallback(async () => {
        if (!user) {
            navigate(`/acesso?redirect=${encodeURIComponent(window.location.pathname)}`);
            return { success: false, reason: 'auth' as const };
        }

        setSavingPayslip(true);
        try {
            const title = `Holerite ${state.mesRef}/${state.anoRef} - Simulação`;
            const persistedState = stripCalculatedFieldsFromCalculatorState(state);

            if (editPayslipId) {
                const updated = await updatePayslip(editPayslipId, {
                    title,
                    agency_slug: slug || 'jmu',
                    agency_name: agency?.name || 'Órgão não identificado',
                    month_ref: state.mesRef,
                    year_ref: state.anoRef,
                    notes: state.observacoes || '',
                    tags: [],
                    calculator_state: persistedState,
                    result_rows: resultRows,
                    liquido: calculatedState.liquido,
                    total_bruto: calculatedState.totalBruto,
                    total_descontos: calculatedState.totalDescontos,
                });
                return { success: true, id: updated.id, mode: 'updated' as const };
            }

            const created = await createPayslip({
                title,
                agency_slug: slug || 'jmu',
                agency_name: agency?.name || 'Órgão não identificado',
                month_ref: state.mesRef,
                year_ref: state.anoRef,
                notes: state.observacoes || '',
                tags: [],
                calculator_state: persistedState,
                result_rows: resultRows,
                liquido: calculatedState.liquido,
                total_bruto: calculatedState.totalBruto,
                total_descontos: calculatedState.totalDescontos,
            });
            return { success: true, id: created.id, mode: 'created' as const };
        } finally {
            setSavingPayslip(false);
        }
    }, [user, navigate, state, slug, agency?.name, resultRows, editPayslipId, calculatedState]);

    return {
        state,
        calculatedState,
        effectiveState,
        update,
        courtConfig,
        loadingConfig,
        resultRows,
        donationModalOpen,
        setDonationModalOpen,
        handleDonationComplete,
        initiateExportPDF,
        initiateExportExcel,
        updateSubstDays,
        addRubrica,
        removeRubrica,
        updateRubrica,
        handleTipoCalculoChange,
        navigate,
        pendingExportType,
        setState,
        agencyName: agency?.name || 'Carregando...',
        loadingAgency,
        configError,
        saveCurrentPayslip,
        savingPayslip,
        isUserAuthenticated: Boolean(user),
        loggedUserName,
    };
};
