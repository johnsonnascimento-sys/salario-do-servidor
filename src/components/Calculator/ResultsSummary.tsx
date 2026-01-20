
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
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden mb-24">
            <div className="bg-slate-800 p-6 flex justify-between items-center">
                <h3 className="text-white font-bold text-lg uppercase tracking-wider flex items-center gap-3">
                    <Receipt className="w-5 h-5" /> Detalhamento
                </h3>
                <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-mono border border-white/20">Ref: {state.mesRef}/{state.anoRef}</span>
            </div>

            <div className="p-0">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-xs tracking-wider">Rubrica</th>
                            <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-xs tracking-wider">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {resultRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                                <td className={`px-6 py-4 font-medium ${row.type === 'C' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                    {row.label}
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-200">{formatCurrency(row.value)}</td>
                            </tr>
                        ))}
                        <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                            <td className="px-6 py-5 font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Total Bruto</td>
                            <td className="px-6 py-5 text-right font-bold text-slate-800 dark:text-slate-100 font-mono">{formatCurrency(state.totalBruto)}</td>
                        </tr>
                        <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                            <td className="px-6 py-5 font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Total Descontos</td>
                            <td className="px-6 py-5 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(state.totalDescontos)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
