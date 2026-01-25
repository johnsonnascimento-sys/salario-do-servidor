
import React from 'react';
import { FileText, Table as TableIcon } from 'lucide-react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { VersionBadge } from '../ui/VersionBadge';

interface ActionFooterProps {
    state: CalculatorState;
    onExportPDF: () => void;
    onExportExcel: () => void;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({ state, onExportPDF, onExportExcel }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 py-3 md:py-4 px-4 md:px-6 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="hidden md:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Considerando todos os descontos legais e opcionais.</p>
                    <div className="mt-2">
                        <VersionBadge />
                    </div>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    {/* Version Badge - Mobile */}
                    <div className="md:hidden">
                        <VersionBadge />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onExportPDF}
                            className="bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-600 p-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-xs uppercase tracking-wide min-w-[44px] min-h-[44px]"
                            title="Exportar PDF/Holerite"
                        >
                            <FileText size={20} /> <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button
                            onClick={onExportExcel}
                            className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-600 p-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-xs uppercase tracking-wide min-w-[44px] min-h-[44px]"
                            title="Exportar Excel"
                        >
                            <TableIcon size={20} /> <span className="hidden sm:inline">Excel</span>
                        </button>
                    </div>

                    {/* Líquido - Apenas Desktop */}
                    <div className="text-right hidden md:block">
                        <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight brand-gradient-text">
                            {formatCurrency(state.liquido)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
