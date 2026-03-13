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

export const useCalculator = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const stateEditPayslipId = (location.state as { editPayslipId?: string } | null)?.editPayslipId;
    const queryEditPayslipId = new URLSearchParams(location.search).get('editPayslipId') || undefined;
    const editPayslipId = stateEditPayslipId || queryEditPayslipId;
    const { user } = useUserAuth();
    const [savingPayslip, setSavingPayslip] = useState(false);
    const [loggedUserName, setLoggedUserName] = useState('');

    // 1. Gerenciamento de Estado
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

    // 2. Configuração e Carregamento
    const {
        agency,
        agencyService,
        loadingAgency,
        courtConfig,
        loadingConfig,
        configError
    } = useCalculatorConfig(slug);

    // 3. Exportação
    const {
        donationModalOpen,
        setDonationModalOpen,
        pendingExportType,
        initiateExportPDF,
        initiateExportExcel,
        handleDonationComplete: handleDonationCompleteBase
    } = useCalculatorExport();

    // 4. Cálculos e Resultados
    const { resultRows } = useCalculatorResults(
        state,
        setState,
        agencyService,
        courtConfig,
        agency
    );

    // Wrapper para handleDonationComplete com parâmetros corretos
    const handleDonationComplete = () => {
        handleDonationCompleteBase(state, resultRows, courtConfig).catch((error) => {
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
        if (!user || !loggedUserName) return;
        if (state.nome !== loggedUserName) {
            update('nome', loggedUserName);
        }
    }, [user, loggedUserName, state.nome, update]);

    useEffect(() => {
        try {
            localStorage.setItem(USER_AREA_LAST_CALCULATOR_STATE_KEY, JSON.stringify(state));
            localStorage.setItem(USER_AREA_LAST_RESULT_ROWS_KEY, JSON.stringify(resultRows));
            localStorage.setItem(CALCULATOR_DRAFT_STORAGE_KEY, JSON.stringify(state));
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

            if (editPayslipId) {
                const updated = await updatePayslip(editPayslipId, {
                    title,
                    agency_slug: slug || 'jmu',
                    agency_name: agency?.name || 'Órgão não identificado',
                    month_ref: state.mesRef,
                    year_ref: state.anoRef,
                    notes: state.observacoes || '',
                    tags: [],
                    calculator_state: state,
                    result_rows: resultRows,
                    liquido: state.liquido,
                    total_bruto: state.totalBruto,
                    total_descontos: state.totalDescontos,
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
                calculator_state: state,
                result_rows: resultRows,
                liquido: state.liquido,
                total_bruto: state.totalBruto,
                total_descontos: state.totalDescontos,
            });
            return { success: true, id: created.id, mode: 'created' as const };
        } finally {
            setSavingPayslip(false);
        }
    }, [user, navigate, state, slug, agency?.name, resultRows, editPayslipId]);

    return {
        state,
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
