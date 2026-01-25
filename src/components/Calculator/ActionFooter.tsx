
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
        <div className="hidden lg:block fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-700 py-4 px-6 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                    <p className="text-label font-bold text-neutral-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Considerando todos os descontos legais e opcionais.</p>
                    <div className="mt-2">
                        <VersionBadge />
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onExportPDF}
                            className="bg-error-500/10 hover:bg-error-500 hover:text-white text-error-600 p-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-body-xs uppercase tracking-wide"
                            title="Exportar PDF/Holerite"
                        >
                            <FileText size={20} /> <span>PDF</span>
                        </button>
                        <button
                            onClick={onExportExcel}
                            className="bg-success-500/10 hover:bg-success-500 hover:text-white text-success-600 p-3 rounded-xl transition-all duration-200 flex items-center gap-2 font-bold text-body-xs uppercase tracking-wide"
                            title="Exportar Excel"
                        >
                            <TableIcon size={20} /> <span>Excel</span>
                        </button>
                    </div>

                    <div className="text-right">
                        <span className="text-h1 font-black text-neutral-800 dark:text-white tracking-tight brand-gradient-text">
                            {formatCurrency(state.liquido)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
