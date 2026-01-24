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
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Líquido
                </p>
                <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tight brand-gradient-text">
                    {formatCurrency(liquido || 0)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Estimativa mensal
                </p>
            </div>

            {/* Breakdown Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                    Detalhamento
                </h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Bruto</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-white">
                            {formatCurrency(bruto || 0)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">PSS</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            - {formatCurrency(pss || 0)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">IRRF</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            - {formatCurrency(irrf || 0)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Export Buttons */}
            <div className="space-y-2">
                <button
                    onClick={onExportPDF}
                    className="w-full bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 p-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide border border-rose-500/20"
                >
                    <FileText size={20} />
                    Exportar PDF
                </button>
                <button
                    onClick={onExportExcel}
                    className="w-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 p-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wide border border-emerald-500/20"
                >
                    <TableIcon size={20} />
                    Exportar Excel
                </button>
            </div>
        </div>
    );
};
