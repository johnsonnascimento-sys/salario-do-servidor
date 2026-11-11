import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    savingPayslip?: boolean;
}

export const MobileResultsBar: React.FC<MobileResultsBarProps> = ({
    liquido,
    onExportPDF,
    onExportExcel,
    onSavePayslip,
    onOpenPayslips,
    onClearCalculator,
    calculationReady = true,
    resultMessage = 'Calculando...',
    savingPayslip = false,
}) => {
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);
    const [viewport, setViewport] = useState<{ left: number; top: number; width: number } | null>(null);

    useEffect(() => {
        const visualViewport = window.visualViewport;
        if (!visualViewport) return;

        const updateViewport = () => setViewport({
            left: visualViewport.offsetLeft,
            top: visualViewport.offsetTop + visualViewport.height,
            width: visualViewport.width,
        });
        updateViewport();
        visualViewport.addEventListener('resize', updateViewport);
        visualViewport.addEventListener('scroll', updateViewport);
        return () => {
            visualViewport.removeEventListener('resize', updateViewport);
            visualViewport.removeEventListener('scroll', updateViewport);
        };
    }, []);

    return createPortal(
        <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 w-auto max-w-none overflow-x-clip shadow-[0_-4px_10px_rgba(0,0,0,0.12)]"
            style={viewport ? { left: viewport.left, top: viewport.top, width: viewport.width, right: 'auto', bottom: 'auto', transform: 'translateY(-100%)' } : undefined}
        >
            <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-label font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                            Resultado Líquido
                        </p>
                        <p
                            className="text-h3 font-black text-neutral-800 dark:text-white tracking-tight brand-gradient-text truncate"
                            aria-live="polite"
                        >
                            {calculationReady ? formatCurrency(liquido) : resultMessage}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAccordionOpen((prev) => !prev)}
                        aria-expanded={isAccordionOpen}
                        className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3.5 py-2 text-body-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shadow-sm shrink-0 touch-manipulation active:scale-95"
                    >
                        <span>Exportar</span>
                        {isAccordionOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>

                {isAccordionOpen && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={onClearCalculator}
                                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-100 px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 font-semibold text-body active:scale-95 touch-manipulation"
                            >
                                <RotateCcw size={18} />
                                <span>Limpar</span>
                            </button>
                            <button
                                type="button"
                                onClick={onOpenPayslips}
                                className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-100 px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 font-semibold text-body active:scale-95 touch-manipulation"
                            >
                                <User size={18} />
                                <span>Holerites</span>
                            </button>
                            <button
                                type="button"
                                onClick={onExportPDF}
                                disabled={!calculationReady}
                                className="bg-error-500/10 hover:bg-error-500 hover:text-white text-error-600 dark:text-error-400 px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 font-semibold text-body active:scale-95 touch-manipulation"
                            >
                                <FileText size={18} />
                                <span>PDF</span>
                            </button>
                            <button
                                type="button"
                                onClick={onExportExcel}
                                disabled={!calculationReady}
                                className="bg-success-500/10 hover:bg-success-500 hover:text-white text-success-600 dark:text-success-400 px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 font-semibold text-body active:scale-95 touch-manipulation"
                            >
                                <TableIcon size={18} />
                                <span>Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={onSavePayslip}
                                disabled={!calculationReady || savingPayslip}
                                className="col-span-2 bg-secondary-500/10 hover:bg-secondary-500 hover:text-white text-secondary-600 dark:text-secondary-400 px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 font-semibold text-body active:scale-95 touch-manipulation"
                            >
                                <Save size={18} />
                                <span>{savingPayslip ? 'Salvando...' : 'Salvar'}</span>
                            </button>
                        </div>

                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-center">
                            <VersionBadge />
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};
