import React from 'react';
import { useCalculator } from '../hooks/useCalculator';
import { styles } from '../components/Calculator/styles';
import { GlobalSettings } from '../components/Calculator/GlobalSettings';
import { CalculatorHeader } from '../components/Calculator/CalculatorHeader';
import { IncomeSection } from '../components/Calculator/IncomeSection';
import { DeductionsSection } from '../components/Calculator/DeductionsSection';
import { ObservationsSection } from '../components/Calculator/ObservationsSection';
import { ExtraRubrics } from '../components/Calculator/ExtraRubrics';
import { ResultsSummary } from '../components/Calculator/ResultsSummary';
import { ActionFooter } from '../components/Calculator/ActionFooter';
import { MobileResultsBar } from '../components/Calculator/MobileResultsBar';
import DonationModal from '../components/DonationModal';
import { FoodAllowanceCard } from '../components/Calculator/cards/FoodAllowanceCard';
import { VacationCard } from '../components/Calculator/cards/VacationCard';
import { ThirteenthCard } from '../components/Calculator/cards/ThirteenthCard';
import { SubstitutionCard } from '../components/Calculator/cards/SubstitutionCard';
import { LicenseCard } from '../components/Calculator/cards/LicenseCard';
import { OvertimeCard } from '../components/Calculator/cards/OvertimeCard';
import { DailiesCard } from '../components/Calculator/cards/DailiesCard';
import { PreschoolCard } from '../components/Calculator/cards/PreschoolCard';

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

    const isNovoAQ = state.periodo >= 1;

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
                bruto={state.bruto}
                pss={state.totalPss}
                irrf={state.totalIrrf}
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

                {/* Main Layout: 3 Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="space-y-8">
                        <IncomeSection
                            state={state}
                            update={update}
                            courtConfig={courtConfig}
                            styles={styles}
                            isNovoAQ={isNovoAQ}
                        />
                        <FoodAllowanceCard value={state.auxAlimentacao} styles={styles} />
                    </div>

                    {/* Center Column */}
                    <div className="space-y-8">
                        <VacationCard
                            state={state}
                            update={update}
                            styles={styles}
                        />
                        <ThirteenthCard
                            state={state}
                            update={update}
                            styles={styles}
                        />
                        <SubstitutionCard
                            state={state}
                            update={update}
                            updateSubstDays={updateSubstDays}
                            styles={styles}
                        />
                        <LicenseCard
                            state={state}
                            update={update}
                            styles={styles}
                        />
                        <OvertimeCard
                            state={state}
                            update={update}
                            styles={styles}
                        />
                        <DailiesCard
                            state={state}
                            update={update}
                            styles={styles}
                        />
                        <PreschoolCard
                            state={state}
                            update={update}
                            styles={styles}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-8">
                        <DeductionsSection
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
