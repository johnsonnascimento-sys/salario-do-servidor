import React from 'react';
import type { IrEaContext } from '../../types/irEa';

interface Props { value?: IrEaContext; onChange: (value: IrEaContext) => void; styles: any; error?: string | null; mesFolha?: string }

export const IrEaContextSection: React.FC<Props> = ({ value: providedValue, onChange, styles, error, mesFolha }: Props) => {
    const value: IrEaContext = providedValue ?? {};
    const patch = (change: Partial<IrEaContext>) => onChange({ ...value, ...change });
    const adjustments = value.ajustesBaseDocumentados ?? [];
    return <section className={`${styles.card} space-y-3`} aria-label="Apuração do IR-EA">
        <h3 className={styles.sectionTitle}>Apuração do IR-EA</h3>
        <p className="text-body-xs">O mês de pagamento acompanha automaticamente o mês e ano da folha no cabeçalho. Informe em cada parcela EA apenas as competências originais.</p>
        {error?.includes('IR-EA') && <p role="alert" className="text-body-xs text-warning-700 dark:text-warning-300">Há dados de IR-EA que precisam de revisão. Confira o pagamento, as competências e os documentos informados. {error}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={styles.label}>Mês do pagamento dos atrasados
                <input type="month" readOnly className={styles.input} value={mesFolha ?? ''} />
            </label>
            <label className={styles.label}>Número de meses (NM) do demonstrativo, se houver
                <input type="number" min="0.1" step="0.1" className={styles.input} value={value.mesesRraInformados ?? ''} onChange={event => patch({ mesesRraInformados: event.target.value === '' ? undefined : Math.max(0, Math.round(Number(event.target.value) * 10) / 10) })} />
            </label>
        </div>
        <p className="text-body-xs">Sem NM informado, o cálculo considera os meses distintos declarados nas parcelas. Use o NM do demonstrativo apenas com a respectiva referência documental.</p>
        {value.mesesRraInformados !== undefined && <label className={styles.label}>Referência do demonstrativo do NM
            <input type="text" required className={styles.input} value={value.referenciaMeses ?? ''} onChange={event => patch({ referenciaMeses: event.target.value })} />
        </label>}
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
    </section>;
};
