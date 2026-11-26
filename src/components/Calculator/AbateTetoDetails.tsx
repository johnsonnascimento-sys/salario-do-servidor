import type { AbateTetoMemory } from '../../types/constitutionalCeiling';
import { abateTetoAuditRows } from '../../utils/abateTetoPresentation';

export function AbateTetoDetails({ memory }: { memory?: AbateTetoMemory }) {
    if (!memory) return null;
    if (memory.status !== 'ready') {
        return <p role="status" className="rounded-lg bg-warning-50 p-4 text-body-sm text-warning-800 dark:bg-warning-900/30 dark:text-warning-200">
            <strong>Abate-teto não apurado.</strong> {memory.reason}
        </p>;
    }
    return <details className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <summary className="cursor-pointer font-semibold">Memória do abate-teto</summary>
        <dl className="mt-3 divide-y divide-neutral-200 text-body-sm dark:divide-neutral-700">
            {abateTetoAuditRows(memory).map(([label, value], index) => (
                <div key={label + index} className="flex flex-wrap justify-between gap-2 py-2">
                    <dt>{label}</dt>
                    <dd className="break-words text-right">
                        {value.startsWith('https://') ? <a className="underline" href={value} target="_blank" rel="noreferrer">Consultar fonte</a> : value}
                    </dd>
                </div>
            ))}
        </dl>
    </details>;
}
