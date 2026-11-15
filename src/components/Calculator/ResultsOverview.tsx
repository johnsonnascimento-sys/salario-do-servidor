import React from 'react';
import { Calculator, ArrowDown, MinusCircle, PlusCircle } from 'lucide-react';
import type { CalculatorState } from '../../types';
import type { PayslipResultRow } from '../../types/user';
import { formatCurrency } from '../../utils/calculations';
import { getPayrollPresentation } from '../../utils/payrollPresentation';

interface ResultsOverviewProps {
    state: CalculatorState;
    resultRows: PayslipResultRow[];
    dailiesResultRows?: PayslipResultRow[];
    calculationReady?: boolean;
    resultMessage?: string;
    detailHref?: string;
}

export const ResultsOverview: React.FC<ResultsOverviewProps> = ({
    state, resultRows, dailiesResultRows, calculationReady = true,
    resultMessage = 'Calculando os valores do holerite...', detailHref = '#detalhamento',
}) => {
    const summary = getPayrollPresentation(state, resultRows, dailiesResultRows);

    return (
        <section aria-labelledby="resultado-estimado-title" aria-busy={!calculationReady}
            className="rounded-2xl border border-primary-800 bg-primary-900 p-5 text-white shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Calculator className="mt-1 h-8 w-8 shrink-0 text-primary-200" aria-hidden="true" />
                    <div className="min-w-0">
                        <h2 id="resultado-estimado-title" className="text-body-lg font-semibold">Resultado estimado</h2>
                        <p className="mt-1 text-h2 font-bold tabular-nums break-words sm:text-h1" role="status">
                            {calculationReady ? formatCurrency(summary.payrollNet) : resultMessage}
                        </p>
                        <p className="mt-1 text-body text-primary-100">Líquido do holerite · {state.mesRef}/{state.anoRef}</p>
                    </div>
                </div>
                {calculationReady && <>
                    <dl className="space-y-3 border-t border-white/20 pt-4 lg:min-w-64 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                        <div className="flex items-center justify-between gap-6">
                            <dt className="flex items-center gap-2"><PlusCircle size={18} aria-hidden="true" />Créditos</dt>
                            <dd className="font-semibold tabular-nums">{formatCurrency(summary.payrollCredits)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                            <dt className="flex items-center gap-2"><MinusCircle size={18} aria-hidden="true" />Descontos</dt>
                            <dd className="font-semibold tabular-nums">{formatCurrency(summary.payrollDebits)}</dd>
                        </div>
                    </dl>
                    <a href={detailHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-primary-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                        Ver detalhamento <ArrowDown size={18} aria-hidden="true" />
                    </a>
                </>}
            </div>
            {calculationReady && summary.hasDailies && <dl className="mt-5 grid gap-3 border-t border-white/20 pt-4 sm:grid-cols-2">
                <div className="flex flex-wrap justify-between gap-2"><dt>Diárias líquidas</dt><dd className="font-semibold tabular-nums">{formatCurrency(summary.dailiesNet)}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt>Total estimado a receber</dt><dd className="font-bold tabular-nums">{formatCurrency(summary.totalNet)}</dd></div>
            </dl>}
        </section>
    );
};
