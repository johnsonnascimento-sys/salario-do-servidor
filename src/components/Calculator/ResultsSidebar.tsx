import React from 'react';
import { FileText, Table as TableIcon } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface ResultsSidebarProps {
    bruto: number;
    pss: number;
    irrf: number;
    liquido: number;
    onExportPDF: () => void;
    onExportExcel: () => void;
}

export const ResultsSidebar: React.FC<ResultsSidebarProps> = ({
    bruto,
    pss,
    irrf,
    liquido,
    onExportPDF,
    onExportExcel
}) => {
    return (
        <div className="lg:sticky lg:top-6 space-y-4">
            {/* Líquido Card */}
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl p-6 border border-primary/20">
                <p className="text-body-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                    Líquido
                </p>
                <p className="text-h1 font-black text-neutral-800 dark:text-white tracking-tight brand-gradient-text">
                    {formatCurrency(liquido || 0)}
                </p>
                <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    Estimativa mensal
                </p>
            </div>

            {/* Breakdown Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <h4 className="text-body font-bold text-neutral-700 dark:text-neutral-300 mb-4">
                    Detalhamento
                </h4>
                <div className="space-y-3">
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
            </div>

            {/* Export Buttons */}
            <div className="space-y-2">
                <button
                    onClick={onExportPDF}
                    className="w-full bg-error-500/10 hover:bg-error-500 hover:text-white text-error-600 dark:text-error-400 p-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-bold text-body uppercase tracking-wide border border-error-500/20"
                >
                    <FileText size={20} />
                    Exportar PDF
                </button>
                <button
                    onClick={onExportExcel}
                    className="w-full bg-success-500/10 hover:bg-success-500 hover:text-white text-success-600 dark:text-success-400 p-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-bold text-body uppercase tracking-wide border border-success-500/20"
                >
                    <TableIcon size={20} />
                    Exportar Excel
                </button>
            </div>
        </div>
    );
};
