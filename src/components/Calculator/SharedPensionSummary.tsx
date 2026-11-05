import React from 'react';
import type { PensionCalculationMemory, PensionMemory, PensionRubricAssessment } from '../../types/pension';
import type { Rubrica } from '../../types';
import { formatCurrency } from '../../utils/calculations';

/** Informational breakdown only: the payroll engine already accounts for the deductions. */
export const SharedPensionSummary: React.FC<{ memory: PensionMemory; rubricas?: Rubrica[] }> = ({ memory, rubricas = [] }) => {
    const assessments = (items: PensionRubricAssessment[] = []) => items.length > 0 && <details className="mt-2">
        <summary>Enquadramentos e fontes das rubricas</summary>
        {items.map(item => <div key={item.rubricaId} className="mt-2 break-words">
            <p>{rubricas.find(rubrica => rubrica.id === item.rubricaId)?.descricao || item.rubricaId} — {item.ruleId} ({item.classification}) — {item.competencia}</p>
            <p>Fonte: {item.source}</p>
            {item.optionDate && <p>Opção: {item.optionDate} — {item.optionReference}</p>}
            {item.optionAmountConfirmed && <p>Valor elegível desde a opção confirmado pelo usuário.</p>}
        </div>)}
    </details>;
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
            {assessments(item.enquadramentos)}
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
                <dt>Diferença RPPS descontada em folha</dt><dd className="font-mono">{formatCurrency(entry.rpps)}</dd>
            </div><div className="flex flex-wrap justify-between gap-2">
                <dt>Diferença Funpresp descontada em folha</dt><dd className="font-mono">{formatCurrency(entry.complementar)}</dd>
            </div></dl>
            {entry.entrada?.vinculos?.map((link, index) => <div className="flex flex-wrap justify-between gap-2" key={`${link.rubricaId}-${index}`}>
                <span>{rubricas.find(rubrica => rubrica.id === link.rubricaId)?.descricao.trim() || 'Rubrica vinculada'}</span>
                <span className="font-mono">{formatCurrency(link.valor)}</span>
            </div>)}
            {entry.fonteHistorica && <p>Fonte: {entry.fonteHistorica}</p>}
            {assessments(entry.enquadramentos)}
        </section>)}
    </section>;
};
