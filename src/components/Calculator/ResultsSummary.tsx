
import React from 'react';
import { Receipt } from 'lucide-react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface ResultsSummaryProps {
    state: CalculatorState;
    resultRows: Array<{ label: string; value: number; type: 'C' | 'D' }>;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ state, resultRows }) => {
    return (
        <div className="mt-8 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden mb-24">
            <div className="bg-neutral-800 p-6 flex justify-between items-center">
                <h3 className="text-white font-bold text-body-xl uppercase tracking-wider flex items-center gap-3">
                    <Receipt className="w-5 h-5" /> Detalhamento
                </h3>
                <span className="bg-white/10 dark:bg-neutral-900/40 text-white px-3 py-1 rounded-full text-body-xs font-mono border border-white/20">Ref: {state.mesRef}/{state.anoRef}</span>
            </div>

            <div className="p-0">
                <table className="w-full text-body">
                    <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-700">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Rubrica</th>
                            <th scope="col" className="px-6 py-4 text-right font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {resultRows.map((row, idx) => (
                            <tr key={`${row.type}-${row.label}-${idx}`} className="hover:bg-neutral-50 dark:bg-transparent dark:hover:bg-neutral-700/30 transition">
                                <td className={`px-6 py-4 font-medium ${row.type === 'C' ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}>
                                    {row.label}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-neutral-700 dark:text-neutral-200">{formatCurrency(row.value)}</td>
                            </tr>
                        ))}
                        <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                            <td className="px-6 py-5 font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide">Total Bruto</td>
                            <td className="px-6 py-5 text-right font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(state.totalBruto)}</td>
                        </tr>
                        <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                            <td className="px-6 py-5 font-bold text-error-600 dark:text-error-400 uppercase tracking-wide">Total Descontos</td>
                            <td className="px-6 py-5 text-right font-bold text-error-600 dark:text-error-400 font-mono">{formatCurrency(state.totalDescontos)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
