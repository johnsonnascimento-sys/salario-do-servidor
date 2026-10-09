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
import type { PayslipResultRow } from '../types/user';
import { getPayslipById } from '../services/user/payslipService';
import {
    CALCULATOR_DRAFT_STORAGE_KEY,
    USER_AREA_LAST_CALCULATOR_STATE_KEY,
    USER_AREA_LAST_RESULT_ROWS_KEY,
} from '../constants/storage';
import { hydrateCalculatorState } from '../utils/calculatorState';
import { CalculatorNavigationState, CalculatorRestoreSource } from '../types/calculatorRestore';

export default function Calculator() {
    const {
        state,
        effectiveState,
        calculationStatus,
        calculationError,
        calculationReady,
        loadingAgency,
        agencyError,
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
    const navigationState = location.state as CalculatorNavigationState | null;
    const editPayslipId = new URLSearchParams(location.search).get('editPayslipId') || '';
    const startBlank = Boolean(navigationState?.startBlank);
    const restoreSnapshot = navigationState?.restoreSnapshot;
    const preserveRestoredGlobals = Boolean(editPayslipId || restoreSnapshot?.calculatorState);
    const lastRestoreSourceRef = useRef('');
    const [formKey, setFormKey] = useState(0);
    const [restoreReady, setRestoreReady] = useState(!(editPayslipId || restoreSnapshot?.calculatorState));
    const [restoreError, setRestoreError] = useState('');

    useEffect(() => {
        let active = true;

        const applyHydratedState = (snapshot: unknown, savedRows: PayslipResultRow[] = []) => {
            if (!active || !snapshot) return;
            const hydrated = hydrateCalculatorState(snapshot, savedRows);
            setState(hydrated);
            setFormKey((prev) => prev + 1);
            setRestoreReady(true);
            lastRestoreSourceRef.current = restoreSource;
        };

        const restoreKind: CalculatorRestoreSource = startBlank
            ? 'blank'
            : editPayslipId
                ? 'savedPayslip'
                : restoreSnapshot?.calculatorState
                    ? 'navigationRestore'
                    : 'draft';
        const restoreSource = restoreKind === 'savedPayslip'
            ? `${restoreKind}:${editPayslipId}`
            : restoreKind === 'navigationRestore'
                ? `${restoreKind}:${location.key}`
                : restoreKind;

        if (lastRestoreSourceRef.current === restoreSource) {
            return () => {
                active = false;
            };
        }

        setRestoreError('');

        if (startBlank) {
            try {
                localStorage.removeItem(CALCULATOR_DRAFT_STORAGE_KEY);
            } catch (_error) {
                // ignora falhas de localStorage
            }

            setState(hydrateCalculatorState(INITIAL_STATE));
            setFormKey((prev) => prev + 1);
            setRestoreReady(true);
            lastRestoreSourceRef.current = restoreSource;
        } else if (editPayslipId) {
            setRestoreReady(false);
            getPayslipById(editPayslipId)
                .then((payslip) => {
                    if (!payslip?.calculator_state) {
                        throw new Error('Holerite não encontrado ou indisponível para edição.');
                    }
                    applyHydratedState(payslip.calculator_state, payslip.result_rows || []);
                })
                .catch((error) => {
                    if (active) {
                        setRestoreError((error as Error).message || 'Falha ao carregar o holerite salvo.');
                    }
                });
        } else {
            if (restoreSnapshot?.calculatorState) {
                applyHydratedState(restoreSnapshot.calculatorState);
            } else {
                try {
                    const rawDraft = localStorage.getItem(CALCULATOR_DRAFT_STORAGE_KEY);
                    if (rawDraft) {
                        applyHydratedState(JSON.parse(rawDraft));
                    } else {
                        setRestoreReady(true);
                    }
                } catch (_error) {
                    // ignora rascunho inválido
                    setRestoreReady(true);
                }
            }
        }

        return () => {
            active = false;
        };
    }, [editPayslipId, location.key, restoreSnapshot, setState, startBlank]);

    const handleSavePayslip = async () => {
        try {
            const result = await saveCurrentPayslip();
            if (result.success) {
                alert(result.mode === 'updated'
                    ? 'Holerite atualizado com sucesso na sua área.'
                    : 'Holerite salvo com sucesso na sua área.');
            } else if (result.reason === 'auth') {
                alert('Faça login para salvar holerites na sua área.');
            } else {
                alert('Aguarde a conclusão do cálculo antes de salvar.');
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
        lastRestoreSourceRef.current = 'blank';
    };

    if (loadingConfig || loadingAgency) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 animate-pulse">Carregando...</p>
            </div>
        );
    }

    if (agencyError || configError || !courtConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <p className="text-neutral-500 dark:text-neutral-300">
                    {agencyError || configError || 'Configuracao indisponivel.'}
                </p>
            </div>
        );
    }

    if (restoreError || !restoreReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                <p className="text-neutral-500 dark:text-neutral-300">
                    {restoreError || 'Carregando holerite salvo...'}
                </p>
            </div>
        );
    }

        return (
        <>
            <MobileResultsBar
                calculationReady={calculationReady}
                resultMessage={calculationStatus === 'error' ? 'Cálculo indisponível' : 'Calculando...'}
                savingPayslip={savingPayslip}
                liquido={effectiveState.liquido}
                onExportPDF={initiateExportPDF}
                onExportExcel={initiateExportExcel}
                onSavePayslip={handleSavePayslip}
                onOpenPayslips={openMyPayslips}
                onClearCalculator={handleClearCalculator}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-32">
                <CalculatorHeader
                    calculationReady={calculationReady}
                    courtConfig={courtConfig}
                    state={effectiveState}
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
                        key={`global-settings-${formKey}`}
                        state={effectiveState}
                        update={update}
                        courtConfig={courtConfig}
                        styles={styles}
                        preserveRestoredGlobals={preserveRestoredGlobals}
                    />
                    <DynamicPayrollForm
                        key={`dynamic-payroll-form-${formKey}`}
                        inputState={state}
                        preserveRestoredGlobals={preserveRestoredGlobals}
                        state={effectiveState}
                        update={update}
                        updateSubstDays={updateSubstDays}
                        courtConfig={courtConfig}
                        addRubrica={addRubrica}
                        removeRubrica={removeRubrica}
                        updateRubrica={updateRubrica}
                        styles={styles}
                    />
                    <ObservationsSection
                        state={effectiveState}
                        update={update}
                        styles={styles}
                    />
                    {calculationReady ? <ResultsSummary
                        state={effectiveState}
                        resultRows={resultRows}
                    /> : <p role={calculationStatus === 'error' ? 'alert' : 'status'} aria-live="polite"
                        className="p-6 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200">
                        {calculationError || 'Calculando os valores do holerite...'}
                    </p>}
                </div>

                <ActionFooter
                    calculationReady={calculationReady}
                    resultMessage={calculationStatus === 'error' ? 'Cálculo indisponível' : 'Calculando...'}
                    state={effectiveState}
                    onExportPDF={initiateExportPDF}
                    onExportExcel={initiateExportExcel}
                    onSavePayslip={handleSavePayslip}
                    onOpenPayslips={openMyPayslips}
                    savingPayslip={savingPayslip}
                    onClearCalculator={handleClearCalculator}
                />

                <DonationModal
                    isOpen={donationModalOpen && calculationReady}
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


