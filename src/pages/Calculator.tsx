
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
import { ResultsSidebar } from '../components/Calculator/ResultsSidebar';
import DonationModal from '../components/DonationModal';
import { SeasonalIncomeSection } from '../components/Calculator/SeasonalIncomeSection';
import { IndemnitySection } from '../components/Calculator/IndemnitySection';

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

            {/* Main Layout: 2 Columns (Inputs | Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">


                {/* Left Column: All Inputs */}
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
                    <SeasonalIncomeSection
                        state={state}
                        update={update}
                        styles={styles}
                    />
                    <DeductionsSection
                        state={state}
                        update={update}
                        styles={styles}
                    />
                    <IndemnitySection
                        state={state}
                        update={update}
                        styles={styles}
                    />
                    <BenefitsSection
                        state={state}
                        update={update}
                        styles={styles}
                    />
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

                {/* Right Column: Sidebar (Desktop sticky) */}
                <div className="hidden lg:block">
                    <ResultsSidebar
                        bruto={state.bruto}
                        pss={state.totalPss}
                        irrf={state.totalIrrf}
                        liquido={state.liquido}
                        onExportPDF={initiateExportPDF}
                        onExportExcel={initiateExportExcel}
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
