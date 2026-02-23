import React from 'react';
import { formatCurrency } from '../../utils/calculations';

interface ResultsSidebarProps {
    bruto: number;
    pss: number;
    irrf: number;
}

export const ResultsSidebar: React.FC<ResultsSidebarProps> = ({
    bruto,
    pss,
    irrf
}) => {
    return (
        <div className="hidden lg:block lg:sticky lg:top-6">
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
        </div>
    );
};

