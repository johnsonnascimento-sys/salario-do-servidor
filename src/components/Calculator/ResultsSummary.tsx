
import React from 'react';
import { Receipt } from 'lucide-react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface ResultsSummaryProps {
    state: CalculatorState;
    resultRows: Array<{ label: string; value: number; type: 'C' | 'D' }>;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ state, resultRows }) => {
    const normalizeLabel = (label: string) =>
        label
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase();

    const isDailiesRow = (label: string) => {
        const normalized = normalizeLabel(label);
        return normalized.includes('DIARIA') || normalized.includes('ABATIMENTO BENEF. EXTERNO');
    };

    const payrollRows = resultRows.filter(row => !isDailiesRow(row.label));
    const dailiesRows = resultRows.filter(row => isDailiesRow(row.label));

    const payrollCredits = payrollRows
        .filter(row => row.type === 'C')
        .reduce((acc, row) => acc + row.value, 0);
    const payrollDebits = payrollRows
        .filter(row => row.type === 'D')
        .reduce((acc, row) => acc + row.value, 0);

    const dailiesCredits = dailiesRows
        .filter(row => row.type === 'C')
        .reduce((acc, row) => acc + row.value, 0);
    const dailiesDebits = dailiesRows
        .filter(row => row.type === 'D')
        .reduce((acc, row) => acc + row.value, 0);

    const dailiesNet = dailiesRows.length > 0
        ? state.diariasValorTotal
        : 0;

    return (
        <div className="mt-8 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden mb-24">
            <div className="bg-neutral-800 p-6 flex justify-between items-center">
                <h3 className="text-white font-bold text-body-xl uppercase tracking-wider flex items-center gap-3">
                    <Receipt className="w-5 h-5" /> Detalhamento
                </h3>
                <span className="bg-white/10 dark:bg-neutral-900/40 text-white px-3 py-1 rounded-full text-body-xs font-mono border border-white/20">Ref: {state.mesRef}/{state.anoRef}</span>
            </div>

            <div className="p-6 space-y-6">
                <section className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                        <p className="text-body-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                            Holerite (sem diárias)
                        </p>
                    </div>
                    <table className="w-full text-body">
                        <thead className="bg-white dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Rubrica</th>
                                <th scope="col" className="px-6 py-4 text-right font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {payrollRows.map((row, idx) => (
                                <tr key={`${row.type}-${row.label}-${idx}`} className="hover:bg-neutral-50 dark:bg-transparent dark:hover:bg-neutral-700/30 transition">
                                    <td className={`px-6 py-4 font-medium ${row.type === 'C' ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}>
                                        {row.label}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-neutral-700 dark:text-neutral-200">{formatCurrency(row.value)}</td>
                                </tr>
                            ))}
                            <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                                <td className="px-6 py-5 font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide">Total Créditos (Holerite)</td>
                                <td className="px-6 py-5 text-right font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(payrollCredits)}</td>
                            </tr>
                            <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                                <td className="px-6 py-5 font-bold text-error-600 dark:text-error-400 uppercase tracking-wide">Total Débitos (Holerite)</td>
                                <td className="px-6 py-5 text-right font-bold text-error-600 dark:text-error-400 font-mono">{formatCurrency(payrollDebits)}</td>
                            </tr>
                            <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                                <td className="px-6 py-5 font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide">Total Líquido (Holerite)</td>
                                <td className="px-6 py-5 text-right font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(payrollCredits - payrollDebits)}</td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                {dailiesRows.length > 0 && (
                    <section className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                            <p className="text-body-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                                Diárias (pagamento separado)
                            </p>
                        </div>
                        <table className="w-full text-body">
                            <thead className="bg-white dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Rubrica</th>
                                    <th scope="col" className="px-6 py-4 text-right font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {dailiesRows.map((row, idx) => (
                                    <tr key={`diarias-${row.type}-${row.label}-${idx}`} className="hover:bg-neutral-50 dark:bg-transparent dark:hover:bg-neutral-700/30 transition">
                                        <td className={`px-6 py-4 font-medium ${row.type === 'C' ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}>
                                            {row.label}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-neutral-700 dark:text-neutral-200">{formatCurrency(row.value)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                                    <td className="px-6 py-5 font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wide">Total Diárias Bruto</td>
                                    <td className="px-6 py-5 text-right font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(dailiesCredits)}</td>
                                </tr>
                                <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                                    <td className="px-6 py-5 font-bold text-error-600 dark:text-error-400 uppercase tracking-wide">Total Débitos (Diárias)</td>
                                    <td className="px-6 py-5 text-right font-bold text-error-600 dark:text-error-400 font-mono">{formatCurrency(dailiesDebits)}</td>
                                </tr>
                                <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
                                    <td className="px-6 py-5 font-bold text-success-700 dark:text-success-400 uppercase tracking-wide">Diárias Líquidas</td>
                                    <td className="px-6 py-5 text-right font-bold text-success-700 dark:text-success-400 font-mono">{formatCurrency(dailiesNet)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                )}
            </div>
        </div>
    );
};
