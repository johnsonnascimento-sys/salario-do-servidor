import React, { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ThirteenthPayrollInput, ThirteenthEntry, ThirteenthReference, ThirteenthCalculationMemory } from '../../../types/thirteenth';
import { formatCurrency } from '../../../utils/calculations';

interface Props {
    value: ThirteenthPayrollInput;
    onChange: (next: ThirteenthPayrollInput) => void;
    reference?: ThirteenthReference;
    memory?: ThirteenthCalculationMemory;
    loading: boolean;
    error?: string;
    styles: any;
}

export const ThirteenthPaymentsEditor: React.FC<Props> = ({ value, onChange, reference, memory, loading, error, styles }) => {
    const id = useId();
    const patch = (fields: Partial<ThirteenthPayrollInput>) => onChange({ ...value, ...fields });
    const options = [...(reference?.groups ?? []), ...(reference?.components ?? [])];
    const list = (field: 'advances' | 'secondEntries') => {
        const rows = value[field];
        const first = field === 'advances';
        const updateRow = (rowId: string, fields: Partial<ThirteenthEntry>) => patch({ [field]: rows.map(row => row.id === rowId ? { ...row, ...fields } : row) });
        return <div className="space-y-3">
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Escolha a verba ou o agrupamento conforme o contracheque. Um agrupamento já reúne suas verbas; não as acrescente novamente nesta lista.</p>
            {rows.map((row, index) => {
                const rowId = `${id}-${field}-${row.id}`;
                const unavailable = row.target && !options.some(option => option.id === row.target);
                return <div key={row.id} className="space-y-3 border-b border-neutral-200 pb-4 dark:border-neutral-700" aria-label={`${first ? 'Adiantamento' : 'Valor da segunda parcela'} ${index + 1}`}>
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                            <label htmlFor={`${rowId}-target`} className={styles.label}>Verba ou agrupamento</label>
                            <select id={`${rowId}-target`} className={styles.input} value={row.target} onChange={event => {
                                const target = event.target.value;
                                updateRow(row.id, { target, description: row.description || options.find(option => option.id === target)?.label || '' });
                            }}>
                                <option value="">Selecione uma verba</option>
                                {unavailable && <option value={row.target}>Vínculo anterior indisponível — revisar</option>}
                                {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                            </select>
                        </div>
                        <button type="button" className="mt-7 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-500 hover:text-error-600 focus-visible:outline focus-visible:outline-2" aria-label={`Remover ${first ? 'adiantamento' : 'valor da segunda parcela'} ${index + 1}`} onClick={() => patch({ [field]: rows.filter(item => item.id !== row.id) })}><Trash2 size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        <div className="space-y-1"><label htmlFor={`${rowId}-description`} className={styles.label}>Descrição no contracheque</label>
                            <input id={`${rowId}-description`} className={styles.input} value={row.description} onChange={event => updateRow(row.id, { description: event.target.value })} /></div>
                        <div className="space-y-1"><label htmlFor={`${rowId}-amount`} className={styles.label}>Valor bruto (R$)</label>
                            <input id={`${rowId}-amount`} inputMode="decimal" type="text" className={styles.input} data-calculator="true" value={row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} onChange={event => updateRow(row.id, { amount: Number(event.target.value.replace(/\D/g, '')) / 100 })} /></div>
                    </div>
                    {row.origin === 'legacy' && <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Lançamento recuperado da configuração anterior.</p>}
                </div>;
            })}
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-body font-semibold dark:border-neutral-600" onClick={() => patch({ [field]: [...rows, { id: crypto.randomUUID(), target: '', description: '', amount: 0 }] })}><Plus size={16} />{first ? 'Adicionar adiantamento' : 'Adicionar valor da 2ª parcela'}</button>
            <div className="flex flex-wrap justify-between gap-2 text-body font-semibold"><span>{first ? 'Total dos adiantamentos informados' : 'Total bruto informado da 2ª parcela'}</span><span className="font-mono">{formatCurrency(rows.reduce((sum, row) => sum + row.amount, 0))}</span></div>
            {first && <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Registrar um adiantamento não acrescenta a verba à composição nem aos créditos mensais.</p>}
        </div>;
    };
    const modes = (first: boolean) => <fieldset className="space-y-2">
        <legend className="sr-only">{first ? 'Modo do adiantamento' : 'Modo da segunda parcela'}</legend>
        {(first ? [['automatico', 'Calcular automaticamente'], ['informado', 'Informar valores já recebidos']] : [['automatico', 'Calcular automaticamente'], ['manual', 'Informar valores manuais']]).map(([mode, label]) => <label key={mode} className={styles.checkboxLabel}>
            <input type="radio" className={styles.checkbox} name={`${id}-${first ? 'first' : 'second'}-mode`} value={mode} checked={(first ? value.firstMode : value.secondMode) === mode} onChange={() => patch(first ? { firstMode: mode as ThirteenthPayrollInput['firstMode'] } : { secondMode: mode as ThirteenthPayrollInput['secondMode'] })} />{label}
        </label>)}
    </fieldset>;
    return <div className="space-y-6">
        <section aria-labelledby={`${id}-first`} className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <h5 id={`${id}-first`} className="text-body font-semibold">Primeira parcela — Adiantamento</h5>
            {!value.firstSelected && !value.secondSelected && <p className="text-body-xs text-neutral-500">O recebimento da 1ª parcela não está selecionado no card.</p>}
            {modes(true)}
            {value.firstMode === 'informado' ? list('advances') : <p className="flex flex-wrap justify-between gap-2 text-body-xs"><span>Adiantamento calculado automaticamente</span><strong className="font-mono">{!loading && memory ? formatCurrency(memory.firstTotal) : '—'}</strong></p>}
        </section>
        <section aria-labelledby={`${id}-second`} className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <h5 id={`${id}-second`} className="text-body font-semibold">Segunda parcela — Fechamento</h5>
            {!value.secondSelected && <p className="text-body-xs text-neutral-500">O recebimento da 2ª parcela não está selecionado no card.</p>}
            {modes(false)}
            {value.secondMode === 'manual' ? list('secondEntries') : <div className="space-y-2 text-body-xs">
                <p className="flex flex-wrap justify-between gap-2"><span>Remuneração de referência</span><strong className="font-mono">{reference ? formatCurrency(reference.referenceTotal) : '—'}</strong></p>
                <p className="flex flex-wrap justify-between gap-2"><span>Adiantamento a abater</span><strong className="font-mono">{!loading && memory ? formatCurrency(memory.firstTotal) : '—'}</strong></p>
                <p className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-2 font-semibold dark:border-neutral-700"><span>Saldo bruto calculado da 2ª parcela</span><span className="font-mono">{!loading && memory ? formatCurrency(memory.secondTotal) : '—'}</span></p>
            </div>}
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Os valores desta seção são brutos. IR, previdência e eventual abono do próprio 13º aparecem no detalhamento após aplicar os ajustes.</p>
        </section>
        {loading && <p role="status" className="text-body-xs text-neutral-500">Calculando prévia…</p>}
        {error && <p role="alert" className="text-body-xs text-error-700 dark:text-error-300">{error}</p>}
    </div>;
};
