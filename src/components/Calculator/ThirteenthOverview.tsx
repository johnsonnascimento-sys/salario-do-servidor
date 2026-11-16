import React from 'react';
import { PresetGrossLine } from './dynamicPayrollForm.helpers';
import { formatCurrency } from '../../utils/calculations';

interface ThirteenthOverviewProps {
    lines: PresetGrossLine[];
    calculationReady: boolean;
}

/** Read the existing summary, so the overview and detail always share totals. */
export const ThirteenthOverview: React.FC<ThirteenthOverviewProps> = ({ lines, calculationReady }) => {
    if (!calculationReady || lines.length === 0) {
        return <p role="status" className="text-body-xs text-neutral-500 dark:text-neutral-400">Aguardando cálculo. Os totais serão exibidos após a conclusão da simulação e a resolução de eventuais pendências.</p>;
    }
    return <div className="divide-y divide-neutral-200 dark:divide-neutral-700" aria-label="Totais do 13º por parcela">
        {[1, 2].map(parcel => <div key={parcel} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
            <span className="text-body font-semibold">{parcel}ª parcela</span>
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-body-xs">
                {['Bruto', 'Líquido'].map(kind => {
                    const line = lines.find(item => item.label === `Total 13º salário ${kind} ${parcel}ª Parcela`);
                    return <div key={kind} className="flex flex-wrap items-baseline gap-2">
                        <dt className="text-neutral-500 dark:text-neutral-400">{kind}</dt>
                        <dd className="font-mono font-semibold text-neutral-800 dark:text-neutral-100">{line ? formatCurrency(line.value || 0) : '—'}</dd>
                    </div>;
                })}
            </dl>
        </div>)}
    </div>;
};
