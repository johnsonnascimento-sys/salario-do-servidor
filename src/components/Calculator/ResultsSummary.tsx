import { IrEaMemory } from './IrEaMemory';
import { IrEaContextSection } from './IrEaContextSection';
import { toReferenceMonthIndex } from './referenceDateUtils';
import { PensionMemory } from './PensionMemory';
import React from 'react';
import { Receipt } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { PayslipDisplayRow } from '../../utils/payslipRows';
import { getPayrollPresentation } from '../../utils/payrollPresentation';
import type { PayslipResultRow } from '../../types/user';

interface ResultsSummaryProps {
    state: CalculatorState;
    resultRows: PayslipResultRow[];
    dailiesResultRows?: PayslipResultRow[];
    update?: (key: keyof CalculatorState, value: any) => void;
    calculationError?: string | null;
    courtConfig?: CourtConfig;
    styles?: any;
}

interface SummarySectionProps {
    title: string;
    rows: PayslipDisplayRow[];
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
            <p className="text-body font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {title}
            </p>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {rows.map((row, idx) => (
                <div key={`${row.type}-${row.label}-${idx}`} className="px-4 py-3">
                    {row.details && row.details.length > 0 ? (
                        <details className="group">
                            <summary className="list-none cursor-pointer">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <p className={`text-body font-bold leading-snug break-words ${labelToneClasses(row.type)}`}>
                                        {row.label}
                                    </p>
                                    <p className="text-right font-mono text-body font-semibold text-neutral-700 dark:text-neutral-200 break-all">
                                        {formatCurrency(row.value)}
                                    </p>
                                </div>
                                <p className="mt-1 text-body text-neutral-500 group-open:hidden">
                                    Ver detalhamento
                                </p>
                            </summary>
                            <div className="mt-3 space-y-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/50">
                                {row.details.map((detail, detailIndex) => (
                                    <div key={`${detail.label}-${detailIndex}`} className="flex flex-wrap items-start justify-between gap-3">
                                        <p className="text-body text-neutral-600 dark:text-neutral-300">{detail.label}</p>
                                        <p className="text-body font-semibold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">
                                            {formatCurrency(detail.value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </details>
                    ) : (
                        <>
                            <p className={`text-body font-bold leading-snug break-words ${labelToneClasses(row.type)}`}>
                                {row.label}
                            </p>
                            <p className="mt-1 text-right font-mono text-body font-semibold text-neutral-700 dark:text-neutral-200 break-all">
                                {formatCurrency(row.value)}
                            </p>
                        </>
                    )}
                </div>
            ))}
            {totals.map((total, idx) => (
                <div key={`${total.label}-${idx}`} className="px-4 py-4 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <p className={`text-body font-bold uppercase tracking-wide break-words ${toneClasses[total.tone || 'default']}`}>
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
            <p className="text-body font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {title}
            </p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full table-auto text-body">
                <thead className="bg-white dark:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-700">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-left font-bold text-neutral-500 uppercase text-body tracking-wider">Rubrica</th>
                        <th scope="col" className="px-6 py-4 text-right font-bold text-neutral-500 uppercase text-body tracking-wider">Valor</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {rows.map((row, idx) => (
                        <tr key={`${row.type}-${row.label}-${idx}`} className="hover:bg-neutral-50 dark:bg-transparent dark:hover:bg-neutral-700/30 transition">
                            <td className={`px-6 py-4 font-medium break-words ${labelToneClasses(row.type)}`}>
                                <div>{row.label}</div>
                                {row.details && row.details.length > 0 && (
                                    <details className="mt-2 rounded-lg bg-neutral-50 p-3 text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-300">
                                        <summary className="min-h-11 cursor-pointer text-body font-semibold text-neutral-500 dark:text-neutral-400">
                                            Ver detalhamento
                                        </summary>
                                        <div className="mt-3 space-y-2">
                                            {row.details.map((detail, detailIndex) => (
                                                <div key={`${detail.label}-${detailIndex}`} className="flex flex-wrap items-start justify-between gap-3">
                                                    <span className="text-body">{detail.label}</span>
                                                    <span className="text-body font-semibold whitespace-nowrap">
                                                        {formatCurrency(detail.value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
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

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ state, resultRows, dailiesResultRows, update, calculationError, courtConfig, styles }) => {
    const { payrollRows, dailiesRows, payrollCredits, payrollDebits, payrollNet,
        dailiesCredits, dailiesDebits, dailiesNet } = getPayrollPresentation(state, resultRows, dailiesResultRows);

    const payrollTotals = [
        { label: 'Total Créditos (Holerite)', value: payrollCredits },
        { label: 'Total Débitos (Holerite)', value: payrollDebits, tone: 'error' as const },
        { label: 'Total Líquido (Holerite)', value: payrollNet },
    ];

    const dailiesTotals = [
        { label: 'Total Diárias Bruto', value: dailiesCredits },
        { label: 'Total Débitos (Diárias)', value: dailiesDebits, tone: 'error' as const },
        { label: 'Diárias Líquidas', value: dailiesNet, tone: 'success' as const },
    ];

    return (
        <div id="detalhamento" tabIndex={-1} className="scroll-mt-24 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="bg-neutral-800 p-6 flex flex-wrap justify-between items-center gap-3">
                <h3 className="text-white font-bold text-body-xl flex items-center gap-3">
                    <Receipt className="w-5 h-5" /> Detalhamento
                </h3>
                <span className="bg-white/10 dark:bg-neutral-900/40 text-white px-3 py-1 rounded-full text-body font-mono border border-white/20">
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

                {(state.pensionMemory || (state.irEaMemory && state.irEaMemory.status === 'ready')) && (
                    <div className="pt-6 border-t border-neutral-200 dark:border-neutral-700 space-y-4">
                        <h4 className="text-body font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                            Auditoria e Memória de Cálculo
                        </h4>
                        <div className="space-y-3">
                            {state.pensionMemory && <PensionMemory memory={state.pensionMemory} />}
                            {state.irEaMemory && (
                                <div className="space-y-3">
                                    <IrEaMemory memory={state.irEaMemory} />
                                    {update && (
                                        <IrEaContextSection
                                            value={state.irEaContext}
                                            onChange={context => update('irEaContext', context)}
                                            styles={styles || {}}
                                            error={calculationError}
                                            mesFolha={toReferenceMonthIndex(state.mesRef) ? `${state.anoRef}-${String(toReferenceMonthIndex(state.mesRef)).padStart(2, '0')}` : undefined}
                                            dependentes={Number(state.dependentes) || 0}
                                            deducaoDependente={courtConfig?.values?.deducao_dep || 189.59}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
