import React from 'react';
import { PresetGrossLine } from './dynamicPayrollForm.helpers';
import { formatCurrency } from '../../utils/calculations';

export const VacationOverview: React.FC<{ lines: PresetGrossLine[]; calculationReady: boolean }> = ({ lines, calculationReady }) => {
    if (!calculationReady || lines.length === 0) return <p role="status" className="text-body-xs text-neutral-500 dark:text-neutral-400">Aguardando cálculo. Os totais serão exibidos após a conclusão da simulação e a resolução de eventuais pendências.</p>;
    return <div className="divide-y divide-neutral-200 dark:divide-neutral-700" aria-label="Totais do adicional de férias">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
            <span className="text-body font-semibold">Adicional de férias</span>
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-body-xs">
                {(['Bruto', 'Líquido'] as const).map(kind => {
                    const line = lines.find(item => item.label === `Adicional 1/3 férias ${kind === 'Líquido' ? 'Liquido' : kind}`);
                    return <div key={kind} className="flex flex-wrap items-baseline gap-2"><dt className="text-neutral-500 dark:text-neutral-400">{kind}</dt><dd className="font-mono font-semibold text-neutral-800 dark:text-neutral-100">{line ? formatCurrency(line.value || 0) : '—'}</dd></div>;
                })}
            </dl>
        </div>
    </div>;
};
