
import React from 'react';
import { useCalculator } from '../hooks/useCalculator';
import { styles } from '../components/Calculator/styles';
import { GlobalSettings } from '../components/Calculator/GlobalSettings';
import { CalculatorHeader } from '../components/Calculator/CalculatorHeader';
import { IncomeSection } from '../components/Calculator/IncomeSection';
import { VariableIncomeSection } from '../components/Calculator/VariableIncomeSection';
import { BenefitsSection } from '../components/Calculator/BenefitsSection';
import { DeductionsSection } from '../components/Calculator/DeductionsSection';
import { ObservationsSection } from '../components/Calculator/ObservationsSection';
import { ExtraRubrics } from '../components/Calculator/ExtraRubrics';
import { ResultsSummary } from '../components/Calculator/ResultsSummary';
import { ActionFooter } from '../components/Calculator/ActionFooter';
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
        handleTipoCalculoChange,
        navigate,
        pendingExportType,
        addRubrica,
        removeRubrica,
        updateRubrica,
        setState,
        agencyName,
        loadingAgency
    } = useCalculator();

    const isNovoAQ = state.periodo >= 1;

    if (loadingConfig) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 animate-pulse">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
            <CalculatorHeader
                courtConfig={courtConfig}
                state={state}
                update={update}
                navigate={navigate}
                styles={styles}
                setState={setState}
                agencyName={agencyName} // Passed agencyName to CalculatorHeader
            />

            <GlobalSettings
                state={state}
                update={update}
                handleTipoCalculoChange={handleTipoCalculoChange}
                styles={styles}
            />

            {/* Main Grid: Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Column 1: Income (Fixed & Variable) */}
                <div className="space-y-8">
                    <IncomeSection
                        state={state}
                        update={update}
                        courtConfig={courtConfig}
                        styles={styles}
                        isNovoAQ={isNovoAQ}
                    />
                    <VariableIncomeSection
                        state={state}
                        update={update}
                        updateSubstDays={updateSubstDays}
                        styles={styles}
                    />
                </div>

                {/* Column 2: Benefits & Deductions */}
                <div className="space-y-8">
                    <DeductionsSection
                        state={state}
                        update={update}
                        styles={styles}
                    />
                    <BenefitsSection
                        state={state}
                        update={update}
                        styles={styles}
                    />
                </div>

                {/* Column 3: Extras & Observations */}
                <div className="space-y-6">
                    <ExtraRubrics
                        state={state}
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
    );
}
