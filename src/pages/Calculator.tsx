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

const createEntryId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const hydrateCalculatorState = (snapshot: unknown): CalculatorState => {
    if (!snapshot || typeof snapshot !== 'object') {
        return INITIAL_STATE;
    }

    const merged = {
        ...INITIAL_STATE,
        ...(snapshot as Partial<CalculatorState>),
    };

    return {
        ...merged,
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
    } = useCalculator();

    const location = useLocation();
    const restoreAppliedRef = useRef(false);
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        if (restoreAppliedRef.current) return;

        const restorePayload = (location.state as { restoreSnapshot?: { calculatorState?: unknown } } | null)?.restoreSnapshot;
        if (!restorePayload?.calculatorState) return;

        const hydrated = hydrateCalculatorState(restorePayload.calculatorState);
        setState(hydrated);
        setFormKey((prev) => prev + 1);
        restoreAppliedRef.current = true;
    }, [location.state, setState]);

    const handleSavePayslip = async () => {
        try {
            const result = await saveCurrentPayslip();
            if (result.success) {
                alert('Holerite salvo com sucesso na sua área.');
            } else if (result.reason === 'auth') {
                alert('Faça login para salvar holerites na sua área.');
            }
        } catch (error) {
            alert((error as Error).message || 'Falha ao salvar holerite.');
        }
    };

    const openMyPayslips = () => navigate('/minha-area/holerites');

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
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-32">
                <CalculatorHeader
                    courtConfig={courtConfig}
                    state={state}
                    update={update}
                    navigate={navigate}
                    styles={styles}
                    setState={setState}
                    agencyName={agencyName}
                    onSavePayslip={handleSavePayslip}
                    onOpenPayslips={openMyPayslips}
                    savingPayslip={savingPayslip}
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

