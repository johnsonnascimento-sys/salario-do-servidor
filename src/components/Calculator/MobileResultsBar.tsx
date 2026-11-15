import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, RotateCcw, Save, Table as TableIcon, User } from 'lucide-react';
import { VersionBadge } from '../ui/VersionBadge';
import { formatCurrency } from '../../utils/calculations';

interface MobileResultsBarProps {
    liquido: number;
    onExportPDF: () => void;
    onExportExcel: () => void;
    onSavePayslip?: () => void;
    onOpenPayslips?: () => void;
    onClearCalculator?: () => void;
    calculationReady?: boolean;
    resultMessage?: string;
    resultLabel?: string;
    savingPayslip?: boolean;
}

export const MobileResultsBar: React.FC<MobileResultsBarProps> = ({
    liquido, onExportPDF, onExportExcel, onSavePayslip, onOpenPayslips, onClearCalculator,
    calculationReady = true, resultMessage = 'Calculando...', resultLabel = 'Líquido do holerite', savingPayslip = false,
}) => {
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);
    const panelId = useId();
    const actionClass = 'flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary-800 px-3 py-3 text-body font-semibold text-white hover:bg-secondary-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

    return (
        <div data-calculator-results-bar className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-secondary-950 text-white shadow-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="border-t border-secondary-800 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0" aria-live="polite" aria-atomic="true">
                        <p className="text-body text-secondary-100">{resultLabel}</p>
                        <p className={calculationReady ? 'text-h4 font-bold tabular-nums break-words' : 'text-body font-semibold break-words'}>
                            {calculationReady ? formatCurrency(liquido) : resultMessage}
                        </p>
                    </div>
                    <button type="button" onClick={() => setIsAccordionOpen(previous => !previous)}
                        aria-expanded={isAccordionOpen} aria-controls={panelId}
                        className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-white px-3 py-2 text-body font-semibold text-primary-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        Exportar {isAccordionOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                    </button>
                </div>
                <div id={panelId} hidden={!isAccordionOpen} className="mt-3 max-h-[45dvh] overflow-y-auto space-y-3 border-t border-secondary-800 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={onClearCalculator} className={actionClass}><RotateCcw size={18} aria-hidden="true" />Limpar</button>
                        <button type="button" onClick={onOpenPayslips} className={actionClass}><User size={18} aria-hidden="true" />Holerites</button>
                        <button type="button" onClick={onSavePayslip} disabled={!calculationReady || savingPayslip} className={actionClass}><Save size={18} aria-hidden="true" />{savingPayslip ? 'Salvando...' : 'Salvar'}</button>
                        <button type="button" onClick={onExportPDF} disabled={!calculationReady} className={actionClass}><FileText size={18} aria-hidden="true" />PDF</button>
                        <button type="button" onClick={onExportExcel} disabled={!calculationReady} className={actionClass}><TableIcon size={18} aria-hidden="true" />Excel</button>
                    </div>
                    <div className="flex justify-center border-t border-secondary-800 pt-2"><VersionBadge /></div>
                </div>
            </div>
        </div>
    );
};
