import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface MobileResultsBarProps {
    bruto: number;
    pss: number;
    irrf: number;
    liquido: number;
}

export const MobileResultsBar: React.FC<MobileResultsBarProps> = ({
    bruto,
    pss,
    irrf,
    liquido
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 shadow-lg">
            {/* Header - Always visible */}
            <div
                className="bg-gradient-to-r from-primary to-secondary px-4 py-3 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                            Líquido
                        </p>
                        <p className="text-2xl font-black text-white tracking-tight">
                            {formatCurrency(liquido || 0)}
                        </p>
                    </div>
                    <button
                        className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                        aria-label={isExpanded ? "Recolher" : "Expandir"}
                    >
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
                    <div className="space-y-2">
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
            )}
        </div>
    );
};
