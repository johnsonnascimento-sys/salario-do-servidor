import React from 'react';
import type { IrEaMemory as Memory } from '../../types/irEa';
import { buildIrEaAuditRows } from '../../utils/irEaExport';

export const IrEaMemory: React.FC<{ memory?: Memory }> = ({ memory }) => {
    const rows = buildIrEaAuditRows(memory);
    if (rows.length === 0) return null;
    return (
        <details id="memoria-ir-ea" className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 space-y-3 scroll-mt-20">
            <summary className="cursor-pointer text-body-xs font-semibold text-neutral-800 dark:text-neutral-200 select-none">
                Memória do IR-EA: apuração progressiva e deduções de RRA
            </summary>
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                Detalhamento da base tributável de RRA, escalonamento por competências e aplicação oficial da redução do imposto.
            </p>
            <dl className="mt-2 grid grid-cols-1 gap-1 text-body-xs">
                {rows.map(([label, value], index) => (
                    <div
                        key={index}
                        className="flex flex-wrap justify-between items-baseline gap-2 py-0.5 border-b border-neutral-100 dark:border-neutral-700/40 last:border-0"
                    >
                        <dt className="text-neutral-600 dark:text-neutral-400">{label}</dt>
                        <dd className="font-mono font-medium tabular-nums text-neutral-900 dark:text-neutral-100 text-right break-words">
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
        </details>
    );
};
