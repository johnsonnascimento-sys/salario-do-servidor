import React from 'react';
import { useCalculator } from '../hooks/useCalculator';
import { styles } from '../components/Calculator/styles';
import { GlobalSettings } from '../components/Calculator/GlobalSettings';
import { CalculatorHeader } from '../components/Calculator/CalculatorHeader';
import { DynamicPayrollForm } from '../components/Calculator/DynamicPayrollForm';
import { ObservationsSection } from '../components/Calculator/ObservationsSection';
import { ResultsSummary } from '../components/Calculator/ResultsSummary';
import { ActionFooter } from '../components/Calculator/ActionFooter';
import { MobileResultsBar } from '../components/Calculator/MobileResultsBar';
import DonationModal from '../components/DonationModal';

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
        configError
    } = useCalculator();

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
            {/* Mobile Bottom Bar - Fixed */}
            <MobileResultsBar
                bruto={state.totalBruto}
                pss={state.pssMensal + (state.pss13 || 0)}
                irrf={state.irMensal + state.irEA + state.irFerias + (state.ir13 || 0)}
                liquido={state.liquido}
                onExportPDF={initiateExportPDF}
                onExportExcel={initiateExportExcel}
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
                />

                <GlobalSettings
                    state={state}
                    update={update}
                    styles={styles}
                />

                <div className="space-y-8 max-w-5xl mx-auto">
                    <DynamicPayrollForm
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
                </div>

                <ResultsSummary
                    state={state}
                    resultRows={resultRows}
                />

                <ActionFooter
                    state={state}
                    onExportPDF={initiateExportPDF}
                    onExportExcel={initiateExportExcel}
                />

                <DonationModal
                    isOpen={donationModalOpen}
                    onClose={() => setDonationModalOpen(false)}
                    onDownloadReady={handleDonationComplete}
                    exportType={pendingExportType}
                    countdownSeconds={10}
                />
            </div>
        </>
    );
}
