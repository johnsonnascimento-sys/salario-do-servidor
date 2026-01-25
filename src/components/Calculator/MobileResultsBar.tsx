import React, { useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Table as TableIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';
import { VersionBadge } from '../ui/VersionBadge';

interface MobileResultsBarProps {
    bruto: number;
    pss: number;
    irrf: number;
    liquido: number;
    onExportPDF: () => void;
    onExportExcel: () => void;
}

export const MobileResultsBar: React.FC<MobileResultsBarProps> = ({
    bruto,
    pss,
    irrf,
    liquido,
    onExportPDF,
    onExportExcel
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {/* Header - Always visible */}
            <div
                className="bg-gradient-to-r from-primary to-secondary px-4 py-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-body-xs font-semibold text-white/80 uppercase tracking-wider">
                            Líquido
                        </p>
                        <p className="text-h3 font-black text-white tracking-tight">
                            {formatCurrency(liquido || 0)}
                        </p>
                    </div>
                    <button
                        className="text-white p-2 hover:bg-white/10 dark:bg-transparent dark:hover:bg-neutral-900/40 rounded-full transition-colors"
                        aria-label={isExpanded ? "Recolher" : "Expandir"}
                    >
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 px-4 py-3">
                    <div className="space-y-3">
                        {/* Detalhes do Cálculo */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-body text-neutral-600 dark:text-neutral-400">Bruto</span>
                                <span className="text-body font-semibold text-neutral-800 dark:text-white">
                                    {formatCurrency(bruto || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-body text-neutral-600 dark:text-neutral-400">PSS</span>
                                <span className="text-body font-semibold text-error-600 dark:text-error-400">
                                    - {formatCurrency(pss || 0)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-body text-neutral-600 dark:text-neutral-400">IRRF</span>
                                <span className="text-body font-semibold text-error-600 dark:text-error-400">
                                    - {formatCurrency(irrf || 0)}
                                </span>
                            </div>
                        </div>

                        {/* Botões de Exportação */}
                        <div className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                            <button
                                onClick={onExportPDF}
                                className="flex-1 bg-error-500/10 hover:bg-error-500 hover:text-white text-error-600 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-body"
                            >
                                <FileText size={18} />
                                <span>PDF</span>
                            </button>
                            <button
                                onClick={onExportExcel}
                                className="flex-1 bg-success-500/10 hover:bg-success-500 hover:text-white text-success-600 px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-body"
                            >
                                <TableIcon size={18} />
                                <span>Excel</span>
                            </button>
                        </div>

                        {/* Version Badge (discreto) */}
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-center">
                            <VersionBadge />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
