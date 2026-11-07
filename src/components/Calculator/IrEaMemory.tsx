import React from 'react';
import type { IrEaMemory as Memory } from '../../types/irEa';
import { buildIrEaAuditRows } from '../../utils/irEaExport';

export const IrEaMemory: React.FC<{ memory?: Memory }> = ({ memory }) => {
    const rows = buildIrEaAuditRows(memory);
    if (rows.length === 0) return null;
    return <details className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <summary className="cursor-pointer text-body-xs font-semibold">Memória do IR-EA</summary>
        <dl className="mt-3 space-y-2 text-body-xs">{rows.map(([label, value], index) => <div key={index} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-semibold break-words">{value}</dd></div>)}</dl>
    </details>;
};
