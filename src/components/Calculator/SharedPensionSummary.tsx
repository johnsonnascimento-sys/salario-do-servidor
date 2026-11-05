import React from 'react';
import type { PensionCalculationMemory, PensionMemory } from '../../types/pension';
import { formatCurrency } from '../../utils/calculations';

/** Informational breakdown only: the payroll engine already accounts for the deductions. */
export const SharedPensionSummary: React.FC<{ memory: PensionMemory }> = ({ memory }) => {
    const group = (item: PensionCalculationMemory) => {
        const facultativaFolha = Math.round((item.facultativa - item.facultativaExterna) * 100) / 100;
        const lines: Array<[string, number]> = [
            ['Contribuição normal', item.normal],
            ['Facultativa em folha', facultativaFolha],
            ['Aporte em folha', item.aporteFolha],
            ['Total descontado em folha', item.descontoFolha],
            ['Contrapartida patronal (informativa)', item.patrocinador],
            ['Facultativa externa (informativa)', item.facultativaExterna],
            ['Aporte externo (informativo)', item.aporteExterno],
        ];
        return <section className="mt-3" key={`${item.competencia}-${item.tipo}`}>
            <h5 className="font-semibold">{item.tipo === '13' ? '13º salário' : 'Folha mensal'} — {item.competencia}</h5>
            <dl className="mt-1 space-y-1">
                {lines.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2">
                    <dt>{label}</dt><dd className="font-mono">{formatCurrency(value)}</dd>
                </div>)}
            </dl>
        </section>;
    };

    return <section aria-label="Resumo compartilhado da Funpresp" className="mt-4 rounded-xl border border-neutral-200 p-4 text-body-xs dark:border-neutral-700">
        <h4 className="font-semibold">Resumo compartilhado da Funpresp</h4>
        <p className="mt-1">Os valores da folha mensal incluem todas as parcelas da base, não apenas as rubricas manuais. A contrapartida patronal e os pagamentos externos são informativos.</p>
        {group(memory.mensal)}
        {memory.thirteenth && group(memory.thirteenth)}
        {memory.retroativos.map(entry => <section key={entry.id} className="mt-3">
            <h5 className="font-semibold">Retroativo — {entry.competencia} — {entry.tipo === '13' ? '13º salário' : 'Mensal'}</h5>
            <dl className="mt-1"><div className="flex flex-wrap justify-between gap-2">
                <dt>Diferença Funpresp descontada em folha</dt><dd className="font-mono">{formatCurrency(entry.complementar)}</dd>
            </div></dl>
        </section>)}
    </section>;
};
