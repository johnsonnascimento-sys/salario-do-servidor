import React from 'react';
import type { IrEaContext } from '../../types/irEa';

interface Props {
    value?: IrEaContext;
    onChange: (value: IrEaContext) => void;
    styles: any;
    error?: string | null;
    mesFolha?: string;
    dependentes?: number;
    deducaoDependente?: number;
}

export const IrEaContextSection: React.FC<Props> = ({ value: providedValue, onChange, styles, error, mesFolha, dependentes = 0, deducaoDependente = 189.59 }: Props) => {
    const value: IrEaContext = providedValue ?? {};
    const patch = (change: Partial<IrEaContext>) => onChange({ ...value, ...change });
    const adjustments = value.ajustesBaseDocumentados ?? [];
    const isDeduzirDeps = value.deduzirDependentes ?? true;
    const valorTotalDeps = dependentes * deducaoDependente;
    const hasOverrides = value.mesesRraInformados !== undefined || adjustments.length > 0 || value.deduzirDependentes === false;
    const isOpen = hasOverrides || Boolean(error?.includes('IR-EA'));

    return <section id="apuracao-ir-ea" className={`${styles.card || ''} space-y-3 scroll-mt-20`} aria-label="Apuração do IR-EA">
        <details className="space-y-3" open={isOpen || undefined}>
            <summary className="cursor-pointer text-body-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none flex items-center justify-between py-1">
                <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                        Ajustes Avançados do IR-EA
                    </span>
                    <span className="text-body-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded">
                        Lei 7.713/88, art. 12-A • RRA
                    </span>
                </span>
                {hasOverrides && (
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        Ajuste manual ativo
                    </span>
                )}
            </summary>

            <p className="text-body-xs text-neutral-600 dark:text-neutral-400">
                O cálculo do RRA e a contagem de meses são realizados automaticamente pelas competências informadas nos cards. Utilize os campos abaixo apenas caso possua processo administrativo oficial com número de meses (NM) divergente ou deduções específicas de passivo.
            </p>

            {error?.includes('IR-EA') && (
                <p role="alert" className="text-body-xs text-warning-700 dark:text-warning-300 p-2.5 rounded-xl bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800">
                    Há dados de IR-EA que precisam de revisão. Confira o pagamento, as competências e os documentos informados. {error}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <label className={styles.label}>Mês do pagamento dos atrasados
                    <input type="month" readOnly className={styles.input} value={mesFolha ?? ''} />
                </label>
                <label className={styles.label}>Número de meses (NM) do demonstrativo, se houver
                    <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        className={styles.input}
                        value={value.mesesRraInformados ?? ''}
                        placeholder="Deixe em branco p/ contagem automática"
                        onChange={event => patch({ mesesRraInformados: event.target.value === '' ? undefined : Math.max(0, Math.round(Number(event.target.value) * 10) / 10) })}
                    />
                </label>
            </div>

            {value.mesesRraInformados !== undefined && (
                <div className="space-y-2 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-body-xs font-semibold text-amber-900 dark:text-amber-200">
                            NM Manual Informado: {value.mesesRraInformados} meses
                        </span>
                        <button
                            type="button"
                            onClick={() => patch({ mesesRraInformados: undefined, referenciaMeses: undefined })}
                            className="text-body-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                        >
                            ↺ Voltar para contagem automática
                        </button>
                    </div>
                    <label className={styles.label}>Referência do demonstrativo do NM
                        <input
                            type="text"
                            required
                            placeholder="Ex: Processo SEI nº 12345/2026"
                            className={styles.input}
                            value={value.referenciaMeses ?? ''}
                            onChange={event => patch({ referenciaMeses: event.target.value })}
                        />
                    </label>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        A Receita Federal exige comprovação documental quando o NM é alterado manualmente em relação ao calendário fiscal.
                    </p>
                </div>
            )}

            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                Sem NM informado, o cálculo considera os meses distintos declarados nas parcelas. Use o NM do demonstrativo apenas com a respectiva referência documental.
            </p>

            {dependentes > 0 && (
                <div className="p-3 bg-neutral-50 dark:bg-dark-surface rounded-xl border border-neutral-200 dark:border-dark-border space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer text-body-xs font-semibold">
                        <input
                            type="checkbox"
                            checked={isDeduzirDeps}
                            onChange={event => patch({ deduzirDependentes: event.target.checked })}
                            className="rounded border-neutral-300 dark:border-dark-border h-4 w-4 text-primary-600 focus:ring-primary-500"
                        />
                        Deduzir dependentes na base do IR-EA ({dependentes} {dependentes === 1 ? 'dependente' : 'dependentes'} = {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalDeps)})
                    </label>
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400 pl-6">
                        Aplica automaticamente a dedução dos dependentes informados no cabeçalho na base de cálculo dos atrasados (RRA). Desmarque caso o órgão pagador não tenha abatido dependentes na competência de origem.
                    </p>
                </div>
            )}

            <details className="space-y-3" open={adjustments.length > 0 || undefined}>
                <summary className="cursor-pointer text-body-xs font-semibold">Deduções documentadas da base do IR-EA</summary>
                <p className="text-body-xs">Inclua apenas deduções admitidas para estes atrasados, identificadas no documento de origem.</p>
                {adjustments.map((item, index) => {
                    const update = (change: Partial<typeof item>) => patch({ ajustesBaseDocumentados: adjustments.map((current, i) => i === index ? { ...current, ...change } : current) });
                    return <fieldset key={index} className="space-y-2 border rounded-xl p-3">
                        <legend className={styles.label}>Dedução documentada {index + 1}</legend>
                        <label className={styles.label}>Valor (R$)<input type="number" min="0.01" step="0.01" required className={styles.input} value={item.valor || ''} onChange={event => update({ valor: Math.max(0, Number(event.target.value) || 0) })} /></label>
                        <label className={styles.label}>Descrição<input required className={styles.input} value={item.descricao} onChange={event => update({ descricao: event.target.value })} /></label>
                        <label className={styles.label}>Fundamento e referência documental<input required className={styles.input} value={item.fundamento} onChange={event => update({ fundamento: event.target.value })} /></label>
                        <button type="button" className="text-body-xs underline" onClick={() => patch({ ajustesBaseDocumentados: adjustments.filter((_, i) => i !== index) })}>Remover dedução {index + 1}</button>
                    </fieldset>;
                })}
                <button type="button" className="text-body-xs font-semibold underline" onClick={() => patch({ ajustesBaseDocumentados: [...adjustments, { valor: 0, descricao: '', fundamento: '' }] })}>Adicionar dedução documentada</button>
            </details>
        </details>
    </section>;
};
