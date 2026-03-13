import React, { useState } from 'react';
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
}

export const MobileResultsBar: React.FC<MobileResultsBarProps> = ({
    liquido,
    onExportPDF,
    onExportExcel,
    onSavePayslip,
    onOpenPayslips,
    onClearCalculator,
}) => {
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-label font-bold text-neutral-400 uppercase tracking-widest">Resultado Líquido</p>
                        <p className="text-h3 font-black text-neutral-800 dark:text-white tracking-tight brand-gradient-text">
                            {formatCurrency(liquido)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAccordionOpen((prev) => !prev)}
                        aria-expanded={isAccordionOpen}
                        className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-body-xs font-semibold text-neutral-600 dark:text-neutral-300"
                    >
                        <span>Exportar</span>
                        {isAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {isAccordionOpen && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={onClearCalculator}
                                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-100 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-body"
                            >
                                <RotateCcw size={18} />
                                <span>Limpar</span>
                            </button>
                            <button
                                onClick={onOpenPayslips}
                                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-100 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-body"
                            >
                                <User size={18} />
                                <span>Holerites</span>
                            </button>
                            <button
                                onClick={onSavePayslip}
                                className="bg-secondary-500/10 hover:bg-secondary-500 hover:text-white text-secondary-600 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-body"
                            >
                                <Save size={18} />
                                <span>Salvar</span>
                            </button>
                            <button
                                onClick={onExportPDF}
                                className="bg-error-500/10 hover:bg-error-500 hover:text-white text-error-600 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-body"
                            >
                                <FileText size={18} />
                                <span>PDF</span>
                            </button>
                            <button
                                onClick={onExportExcel}
                                className="bg-success-500/10 hover:bg-success-500 hover:text-white text-success-600 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-body"
                            >
                                <TableIcon size={18} />
                                <span>Excel</span>
                            </button>
                        </div>

                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-center">
                            <VersionBadge />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
