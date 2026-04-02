import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCalculator } from '../hooks/useCalculator';
import { styles } from '../components/Calculator/styles';
import { GlobalSettings } from '../components/Calculator/GlobalSettings';
import { CalculatorHeader } from '../components/Calculator/CalculatorHeader';
import { DynamicPayrollForm } from '../components/Calculator/DynamicPayrollForm';
import { ObservationsSection } from '../components/Calculator/ObservationsSection';
import { ResultsSummary } from '../components/Calculator/ResultsSummary';
import { ActionFooter } from '../components/Calculator/ActionFooter';
import { MobileResultsBar } from '../components/Calculator/MobileResultsBar';
import { FieldCalculator } from '../components/Calculator/FieldCalculator';
import DonationModal from '../components/DonationModal';
import { CalculatorState, INITIAL_STATE } from '../types';
import { getPayslipById } from '../services/user/payslipService';
import {
    CALCULATOR_DRAFT_STORAGE_KEY,
    USER_AREA_LAST_CALCULATOR_STATE_KEY,
    USER_AREA_LAST_RESULT_ROWS_KEY,
} from '../constants/storage';
import { hydrateCalculatorState } from '../utils/calculatorState';

export default function Calculator() {
    const {
        state,
        update,
        updateSubstDays,
        courtConfig,
        loadingConfig,
        resultRows,
        donationModalOpen,
        setDonationModalOpen,
        handleDonationComplete,
        initiateExportPDF,
        initiateExportExcel,
        navigate,
        pendingExportType,
        addRubrica,
        removeRubrica,
        updateRubrica,
        setState,
        agencyName,
        configError,
        saveCurrentPayslip,
        savingPayslip,
        isUserAuthenticated,
        loggedUserName,
    } = useCalculator();

    const location = useLocation();
    const editPayslipId = new URLSearchParams(location.search).get('editPayslipId') || '';
    const startBlank = Boolean((location.state as { startBlank?: boolean } | null)?.startBlank);
    const restoreAppliedRef = useRef(false);
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        if (restoreAppliedRef.current) return;

        let active = true;

        const applyHydratedState = (snapshot: unknown) => {
            if (!active || restoreAppliedRef.current || !snapshot) return;
            const hydrated = hydrateCalculatorState(snapshot);
            setState(hydrated);
            setFormKey((prev) => prev + 1);
            restoreAppliedRef.current = true;
        };

        if (startBlank) {
            try {
                localStorage.removeItem(CALCULATOR_DRAFT_STORAGE_KEY);
            } catch (_error) {
                // ignora falhas de localStorage
            }

            setState(hydrateCalculatorState(INITIAL_STATE));
            setFormKey((prev) => prev + 1);
            restoreAppliedRef.current = true;
        } else if (editPayslipId) {
            getPayslipById(editPayslipId)
                .then((payslip) => {
                    applyHydratedState(payslip?.calculator_state);
                })
                .catch(() => undefined);
        } else {
            const restorePayload = (location.state as { restoreSnapshot?: { calculatorState?: unknown } } | null)?.restoreSnapshot;
            if (restorePayload?.calculatorState) {
                applyHydratedState(restorePayload.calculatorState);
            } else {
                try {
                    const rawDraft = localStorage.getItem(CALCULATOR_DRAFT_STORAGE_KEY);
                    if (rawDraft) {
                        applyHydratedState(JSON.parse(rawDraft));
                    }
                } catch (_error) {
                    // ignora rascunho inválido
                }
            }
        }

        return () => {
            active = false;
        };
    }, [location.state, editPayslipId, setState, startBlank]);

    const handleSavePayslip = async () => {
        try {
            const result = await saveCurrentPayslip();
            if (result.success) {
                alert(result.mode === 'updated'
                    ? 'Holerite atualizado com sucesso na sua área.'
                    : 'Holerite salvo com sucesso na sua área.');
            } else if (result.reason === 'auth') {
                alert('Faça login para salvar holerites na sua área.');
            }
        } catch (error) {
            alert((error as Error).message || 'Falha ao salvar holerite.');
        }
    };

    const openMyPayslips = () => navigate('/minha-area/holerites');

    const handleClearCalculator = () => {
        const confirmed = window.confirm('Limpar todos os dados preenchidos da calculadora?');
        if (!confirmed) return;

        try {
            localStorage.removeItem(CALCULATOR_DRAFT_STORAGE_KEY);
            localStorage.removeItem(USER_AREA_LAST_CALCULATOR_STATE_KEY);
            localStorage.removeItem(USER_AREA_LAST_RESULT_ROWS_KEY);
        } catch (_error) {
            // ignora falhas de localStorage
        }

        setState(hydrateCalculatorState(INITIAL_STATE));
        setFormKey((prev) => prev + 1);
        restoreAppliedRef.current = true;
    };

    if (loadingConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 animate-pulse">Carregando...</p>
            </div>
        );
    }

    if (configError || !courtConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <p className="text-neutral-500 dark:text-neutral-300">
                    {configError || 'Configuracao indisponivel.'}
                </p>
            </div>
        );
    }

    return (
        <>
            <MobileResultsBar
                liquido={state.liquido}
                onExportPDF={initiateExportPDF}
                onExportExcel={initiateExportExcel}
                onSavePayslip={handleSavePayslip}
                onOpenPayslips={openMyPayslips}
                onClearCalculator={handleClearCalculator}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-32">
                <CalculatorHeader
                    courtConfig={courtConfig}
                    state={state}
                    update={update}
                    navigate={navigate}
                    styles={styles}
                    isUserAuthenticated={isUserAuthenticated}
                    loggedUserName={loggedUserName}
                    agencyName={agencyName}
                    onSavePayslip={handleSavePayslip}
                    onOpenPayslips={openMyPayslips}
                    savingPayslip={savingPayslip}
                    onClearCalculator={handleClearCalculator}
                />

                <div className="space-y-8 max-w-5xl mx-auto">
                    <GlobalSettings
                        state={state}
                        update={update}
                        courtConfig={courtConfig}
                        styles={styles}
                    />
                    <DynamicPayrollForm
                        key={`dynamic-payroll-form-${formKey}`}
                        state={state}
                        update={update}
                        updateSubstDays={updateSubstDays}
                        courtConfig={courtConfig}
                        addRubrica={addRubrica}
                        removeRubrica={removeRubrica}
                        updateRubrica={updateRubrica}
                        styles={styles}
                    />
                    <ObservationsSection
                        state={state}
                        update={update}
                        styles={styles}
                    />
                    <ResultsSummary
                        state={state}
                        resultRows={resultRows}
                    />
                </div>

                <ActionFooter
                    state={state}
                    onExportPDF={initiateExportPDF}
                    onExportExcel={initiateExportExcel}
                    onSavePayslip={handleSavePayslip}
                    onOpenPayslips={openMyPayslips}
                    savingPayslip={savingPayslip}
                    onClearCalculator={handleClearCalculator}
                />

                <DonationModal
                    isOpen={donationModalOpen}
                    onClose={() => setDonationModalOpen(false)}
                    onDownloadReady={handleDonationComplete}
                    exportType={pendingExportType}
                    countdownSeconds={10}
                />

                <FieldCalculator />
            </div>
        </>
    );
}


