import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CalculatorCardHeading } from '../CalculatorCardHeading';
import { RubricCardHeading } from '../RubricCardHeading';
import type { AbateTetoMemory } from '../../../types/constitutionalCeiling';

interface AbateTetoCardProps {
    memory?: AbateTetoMemory;
    composicao?: Record<string, boolean>;
    onChangeComposicao: (next: Record<string, boolean> | undefined) => void;
    styles: any;
    calculationReady: boolean;
}

const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const AbateTetoCard: React.FC<AbateTetoCardProps> = ({
    memory,
    composicao,
    onChangeComposicao,
    styles,
    calculationReady,
}) => {
    const [expanded, setExpanded] = React.useState(false);
    const [draft, setDraft] = React.useState<Record<string, boolean> | null>(null);

    if (!memory) return null;

    const items = memory.composicaoBase ?? [];
    const canCustomize = items.length > 0 && memory.status !== 'out_of_scope';
    const help = {
        label: 'Informações legais e constitucionais sobre o abate-teto',
        content: (
            <div className="space-y-2">
                <p>
                    <strong>Fundamento constitucional:</strong> O{' '}
                    <a className="underline" href="https://www4.planalto.gov.br/legislacao/legis-federal/constituicao" target="_blank" rel="noreferrer">
                        art. 37, XI, da Constituição Federal
                    </a>{' '}
                    usa o subsídio mensal dos Ministros do STF como teto remuneratório, com as exclusões indenizatórias do § 11 (
                    <a className="underline" href="https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc135.htm" target="_blank" rel="noreferrer">
                        EC nº 135/2024
                    </a>
                    ).
                </p>
                <p>
                    <strong>Enquadramento das parcelas:</strong> Segue os arts. 1º a 4º da{' '}
                    <a className="underline" href="https://atos.cnj.jus.br/atos/detalhar/178" target="_blank" rel="noreferrer">
                        Resolução CNJ nº 14/2006
                    </a>{' '}
                    (base mensal, parcelas excluídas e verbas de apuração separada).
                </p>
                <p>
                    <strong>Ordem das retenções:</strong> Conforme o{' '}
                    <a className="underline" href="https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=639" target="_blank" rel="noreferrer">
                        Tema 639 do STF
                    </a>
                    , o excesso acima do teto é deduzido das bases de RPPS e IRRF antes da apuração dos tributos quando todas as parcelas atingidas integram essas duas bases.
                </p>
            </div>
        ),
    };

    const openDraft = () => {
        const initial: Record<string, boolean> = {};
        for (const item of items) {
            initial[item.code] = composicao?.[item.code] ?? item.selected;
        }
        setDraft(initial);
    };

    const restoreDefault = () => {
        const defaults: Record<string, boolean> = {};
        for (const item of items) {
            defaults[item.code] = item.defaultSelected;
        }
        setDraft(defaults);
    };

    const applyDraft = () => {
        if (!draft) return;
        const overrides: Record<string, boolean> = {};
        for (const item of items) {
            const selected = draft[item.code] ?? item.defaultSelected;
            if (selected !== item.defaultSelected) {
                overrides[item.code] = selected;
            }
        }
        onChangeComposicao(Object.keys(overrides).length > 0 ? overrides : undefined);
        setDraft(null);
    };

    if (!expanded) {
        return (
            <div
                id="abate-teto-card"
                tabIndex={-1}
                className="scroll-mt-24 border-b border-neutral-200 py-3 dark:border-neutral-700"
            >
                <RubricCardHeading
                    title="Abate-teto constitucional"
                    presetId="pensao"
                    discount
                    amount={{ value: memory.amount, kind: 'discount' }}
                    notice={memory.status === 'pending' ? 'Apuração pendente' : memory.isCustomized ? 'Personalizado' : undefined}
                    help={help}
                    panelId="abate-teto-panel"
                    onEdit={() => setExpanded(true)}
                />
            </div>
        );
    }

    return (
        <div
            id="abate-teto-card"
            tabIndex={-1}
            className="mb-4 scroll-mt-24 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 sm:p-5"
        >
            <div className="mb-3">
                <CalculatorCardHeading help={help}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">
                                Abate-teto constitucional
                            </h3>
                            {memory.isCustomized && (
                                <span className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-label font-semibold text-secondary-800 dark:bg-secondary-900/40 dark:text-secondary-200">
                                    Personalizado
                                </span>
                            )}
                            {memory.status === 'pending' && (
                                <span className="rounded-full bg-warning-100 px-2.5 py-0.5 text-label font-semibold text-warning-800 dark:bg-warning-900/40 dark:text-warning-200">
                                    Pendente
                                </span>
                            )}
                        </div>
                        {memory.limit !== undefined && (
                            <span className="text-body-xs text-neutral-500 dark:text-neutral-400">
                                Teto: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{formatBRL(memory.limit)}</strong>
                            </span>
                        )}
                    </div>
                </CalculatorCardHeading>
            </div>

            {!draft && (
                <div className="space-y-4">
                    {memory.status === 'out_of_scope' && (
                        <p className="rounded-lg bg-neutral-50 p-3 text-body-xs text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-300">
                            Apuração fora do piloto mensal: {memory.reason}
                        </p>
                    )}

                    {memory.status === 'pending' && (
                        <div role="status" className="space-y-1.5 rounded-lg bg-warning-50 p-3 text-body-xs text-warning-800 dark:bg-warning-900/30 dark:text-warning-200">
                            <p><strong>Apuração pendente.</strong> {memory.reason}</p>
                            {canCustomize && (
                                <p>
                                    Parcelas sem incidência de RPPS (como <em>AQ de treinamento</em> ou <em>Substituição de função</em>) impedem a conclusão quando há excesso acima do teto. Clique em <strong>Personalizar cálculo</strong> abaixo para ajustar quais verbas entram na base do teto.
                                </p>
                            )}
                        </div>
                    )}

                    {memory.status === 'ready' && (
                        <div className="grid grid-cols-1 gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/50 sm:grid-cols-3">
                            <div>
                                <span className="block text-body-xs text-neutral-500 dark:text-neutral-400">Base no teto</span>
                                <span className="font-mono text-body font-semibold text-neutral-900 dark:text-neutral-100">
                                    {formatBRL(memory.monthlyGross ?? 0)}
                                </span>
                            </div>
                            <div>
                                <span className="block text-body-xs text-neutral-500 dark:text-neutral-400">Teto da competência</span>
                                <span className="font-mono text-body font-semibold text-neutral-900 dark:text-neutral-100">
                                    {formatBRL(memory.limit ?? 0)}
                                </span>
                            </div>
                            <div>
                                <span className="block text-body-xs text-neutral-500 dark:text-neutral-400">Abate-teto apurado</span>
                                <span className="font-mono text-body font-semibold text-error-700 dark:text-error-300">
                                    {formatBRL(memory.amount)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                        <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="min-h-11 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold dark:border-neutral-600"
                        >
                            Recolher
                        </button>
                        {canCustomize && (
                            <button
                                type="button"
                                disabled={!calculationReady && memory.status !== 'pending'}
                                onClick={openDraft}
                                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold disabled:opacity-50 dark:border-neutral-600"
                            >
                                <SlidersHorizontal size={16} aria-hidden="true" />
                                Personalizar cálculo
                            </button>
                        )}
                    </div>
                </div>
            )}

            {draft && (
                <section className="space-y-4" aria-label="Personalizar cálculo do Abate-teto constitucional">
                    <div className="space-y-1">
                        <h4 className="text-h5 text-neutral-900 dark:text-neutral-100">Personalizar base do abate-teto</h4>
                        <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                            Selecione as parcelas que entram na base mensal sujeita ao teto constitucional nesta simulação:
                        </p>
                    </div>

                    <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 [&>label]:py-3">
                        {items.map(item => (
                            <label key={item.code} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={draft[item.code] ?? item.defaultSelected}
                                    aria-label={`Incluir ${item.label} na base do abate-teto`}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        setDraft(current => current ? { ...current, [item.code]: checked } : current);
                                    }}
                                />
                                <span className="flex flex-1 items-center justify-between gap-2 text-body-xs">
                                    <span>
                                        <span className="font-medium text-neutral-900 dark:text-neutral-100">{item.label}</span>
                                        <span className="ml-2 text-label text-neutral-500 dark:text-neutral-400">
                                            ({item.defaultSelected ? 'Base mensal' : 'Exclusão'} · {item.provision})
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                                        {formatBRL(item.amount)}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>

                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                        Pela Resolução CNJ nº 14/2006, parcelas de base mensal iniciam marcadas e parcelas indenizatórias/excluídas iniciam desmarcadas. Caso a seleção inclua parcelas sem incidência simultânea de IRRF e RPPS e haja excesso, a apuração permanecerá pendente.
                    </p>

                    <div className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                        <button
                            type="button"
                            onClick={restoreDefault}
                            className="min-h-11 rounded-lg border border-neutral-300 px-3 py-2 text-body-xs font-semibold text-neutral-700 dark:border-neutral-600 dark:text-neutral-200"
                        >
                            Restaurar padrão
                        </button>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="min-h-11 rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-600"
                                onClick={() => setDraft(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="min-h-11 rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white dark:bg-neutral-200 dark:text-neutral-900"
                                onClick={applyDraft}
                            >
                                Aplicar ajustes
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};
