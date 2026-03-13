import React from 'react';
import { Receipt } from 'lucide-react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface ResultsSummaryProps {
    state: CalculatorState;
    resultRows: Array<{ label: string; value: number; type: 'C' | 'D' }>;
}

interface SummarySectionProps {
    title: string;
    rows: Array<{ label: string; value: number; type: 'C' | 'D' }>;
    totals: Array<{ label: string; value: number; tone?: 'default' | 'error' | 'success' }>;
}

const toneClasses = {
    default: 'text-neutral-800 dark:text-neutral-100',
    error: 'text-error-600 dark:text-error-400',
    success: 'text-success-700 dark:text-success-400',
};

const labelToneClasses = (type: 'C' | 'D') => (
    type === 'C'
        ? 'text-success-600 dark:text-success-400'
        : 'text-error-500 dark:text-error-400'
);

const MobileSummarySection: React.FC<SummarySectionProps> = ({ title, rows, totals }) => (
    <section className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-body-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {title}
            </p>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {rows.map((row, idx) => (
                <div key={`${row.type}-${row.label}-${idx}`} className="px-4 py-3">
                    <p className={`text-body-xs font-bold leading-snug break-words ${labelToneClasses(row.type)}`}>
                        {row.label}
                    </p>
                    <p className="mt-1 text-right font-mono text-body font-semibold text-neutral-700 dark:text-neutral-200 break-all">
                        {formatCurrency(row.value)}
                    </p>
                </div>
            ))}
            {totals.map((total, idx) => (
                <div key={`${total.label}-${idx}`} className="px-4 py-4 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <p className={`text-body-xs font-bold uppercase tracking-wide break-words ${toneClasses[total.tone || 'default']}`}>
                        {total.label}
                    </p>
                    <p className={`mt-1 text-right font-mono font-bold break-all ${toneClasses[total.tone || 'default']}`}>
                        {formatCurrency(total.value)}
                    </p>
                </div>
            ))}
        </div>
    </section>
);

const DesktopSummarySection: React.FC<SummarySectionProps> = ({ title, rows, totals }) => (
    <section className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
        <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-body-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {title}
            </p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full table-auto text-body">
                <thead className="bg-white dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-left font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Rubrica</th>
                        <th scope="col" className="px-6 py-4 text-right font-bold text-neutral-500 uppercase text-body-xs tracking-wider">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {rows.map((row, idx) => (
                        <tr key={`${row.type}-${row.label}-${idx}`} className="hover:bg-neutral-50 dark:bg-transparent dark:hover:bg-neutral-700/30 transition">
                            <td className={`px-6 py-4 font-medium break-words ${labelToneClasses(row.type)}`}>
                                {row.label}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                                {formatCurrency(row.value)}
                            </td>
                        </tr>
                    ))}
                    {totals.map((total, idx) => (
                        <tr key={`${total.label}-${idx}`} className="bg-neutral-50/50 dark:bg-neutral-900/50">
                            <td className={`px-6 py-5 font-bold uppercase tracking-wide ${toneClasses[total.tone || 'default']}`}>
                                {total.label}
                            </td>
                            <td className={`px-6 py-5 text-right font-bold font-mono whitespace-nowrap ${toneClasses[total.tone || 'default']}`}>
                                {formatCurrency(total.value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </section>
);

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

    const payrollRows = resultRows.filter((row) => !isDailiesRow(row.label));
    const dailiesRows = resultRows.filter((row) => isDailiesRow(row.label));

    const payrollCredits = payrollRows
        .filter((row) => row.type === 'C')
        .reduce((acc, row) => acc + row.value, 0);
    const payrollDebits = payrollRows
        .filter((row) => row.type === 'D')
        .reduce((acc, row) => acc + row.value, 0);

    const dailiesCredits = dailiesRows
        .filter((row) => row.type === 'C')
        .reduce((acc, row) => acc + row.value, 0);
    const dailiesDebits = dailiesRows
        .filter((row) => row.type === 'D')
        .reduce((acc, row) => acc + row.value, 0);

    const dailiesNet = dailiesRows.length > 0 ? state.diariasValorTotal : 0;

    const payrollTotals = [
        { label: 'Total Créditos (Holerite)', value: payrollCredits },
        { label: 'Total Débitos (Holerite)', value: payrollDebits, tone: 'error' as const },
        { label: 'Total Líquido (Holerite)', value: payrollCredits - payrollDebits },
    ];

    const dailiesTotals = [
        { label: 'Total Diárias Bruto', value: dailiesCredits },
        { label: 'Total Débitos (Diárias)', value: dailiesDebits, tone: 'error' as const },
        { label: 'Diárias Líquidas', value: dailiesNet, tone: 'success' as const },
    ];

    return (
        <div className="mt-8 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden mb-24">
            <div className="bg-neutral-800 p-6 flex justify-between items-center">
                <h3 className="text-white font-bold text-body-xl uppercase tracking-wider flex items-center gap-3">
                    <Receipt className="w-5 h-5" /> Detalhamento
                </h3>
                <span className="bg-white/10 dark:bg-neutral-900/40 text-white px-3 py-1 rounded-full text-body-xs font-mono border border-white/20">
                    Ref: {state.mesRef}/{state.anoRef}
                </span>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                <div className="sm:hidden">
                    <MobileSummarySection
                        title="Holerite (sem diárias)"
                        rows={payrollRows}
                        totals={payrollTotals}
                    />
                </div>
                <div className="hidden sm:block">
                    <DesktopSummarySection
                        title="Holerite (sem diárias)"
                        rows={payrollRows}
                        totals={payrollTotals}
                    />
                </div>

                {dailiesRows.length > 0 && (
                    <>
                        <div className="sm:hidden">
                            <MobileSummarySection
                                title="Diárias (pagamento separado)"
                                rows={dailiesRows}
                                totals={dailiesTotals}
                            />
                        </div>
                        <div className="hidden sm:block">
                            <DesktopSummarySection
                                title="Diárias (pagamento separado)"
                                rows={dailiesRows}
                                totals={dailiesTotals}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
