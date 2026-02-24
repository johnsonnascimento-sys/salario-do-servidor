/**
 * Hook de Exportação - Calculadora
 * 
 * Responsável por:
 * - Modal de doação
 * - Exportação para PDF
 * - Exportação para Excel
 * - Gerenciamento de tipo de exportação pendente
 */

import { useState } from 'react';
import { CalculatorState, CourtConfig } from '../../types';

export const useCalculatorExport = () => {
    const [donationModalOpen, setDonationModalOpen] = useState(false);
    const [pendingExportType, setPendingExportType] = useState<'pdf' | 'excel'>('pdf');

    const initiateExportPDF = () => {
        setPendingExportType('pdf');
        setDonationModalOpen(true);
    };

    const initiateExportExcel = () => {
        setPendingExportType('excel');
        setDonationModalOpen(true);
    };

    const handleDonationComplete = async (
        state: CalculatorState,
        resultRows: Array<{ label: string; value: number; type: 'C' | 'D' }>,
        courtConfig: CourtConfig | null
    ) => {
        const { exportToPDF, exportToExcel } = await import('../../services/exportService');
        if (pendingExportType === 'pdf') {
            exportToPDF(state, resultRows, courtConfig);
        } else {
            exportToExcel(state, resultRows, courtConfig);
        }
    };

    return {
        donationModalOpen,
        setDonationModalOpen,
        pendingExportType,
        initiateExportPDF,
        initiateExportExcel,
        handleDonationComplete
    };
};
