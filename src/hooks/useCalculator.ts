/**
 * Hook Principal da Calculadora - Orquestrador
 * 
 * Compõe hooks especializados para fornecer interface unificada:
 * - useCalculatorState: Gerenciamento de estado
 * - useCalculatorConfig: Carregamento de configuração
 * - useCalculatorExport: Exportação PDF/Excel
 * - useCalculatorResults: Cálculos e resultados
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useCalculatorState } from './calculator/useCalculatorState';
import { useCalculatorConfig } from './calculator/useCalculatorConfig';
import { useCalculatorExport } from './calculator/useCalculatorExport';
import { useCalculatorResults } from './calculator/useCalculatorResults';

export const useCalculator = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

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
        loadingConfig
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
        handleDonationCompleteBase(state, resultRows, courtConfig);
    };

    // Handlers legados (temporariamente vazios, podem ser removidos futuramente)
    const handleCalcFerias = () => {
        // Phase 4: Temporarily disabled or needs migration
    };

    const handleCalc13Manual = () => {
        // Phase 4: Temporarily disabled or needs migration
    };

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
        handleCalcFerias,
        handleCalc13Manual,
        addRubrica,
        removeRubrica,
        updateRubrica,
        handleTipoCalculoChange,
        navigate,
        pendingExportType,
        setState,
        agencyName: agency?.name || 'Carregando...',
        loadingAgency
    };
};
