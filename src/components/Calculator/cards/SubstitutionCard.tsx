import { IrEaCompetencias, getDefaultEaCompetencia } from '../IrEaCompetencias';
import React from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { SubstitutionEntry } from '../../../types';
import type { SubstitutionFunctionDetail } from '../../../types/irEa';

interface SubstitutionCardProps {
    entry: SubstitutionEntry;
    updateEntry: (id: string, patch: Partial<SubstitutionEntry>) => void;
    functionKeys: string[];
    eligibleFunctionKeys?: string[];
    functionDetails?: SubstitutionFunctionDetail[];
    calculationReady?: boolean;
    competenciaReferencia: string;
    styles: any;
}

export const SubstitutionCard: React.FC<SubstitutionCardProps> = ({
    entry, updateEntry, functionKeys, eligibleFunctionKeys = [], functionDetails = [],
    calculationReady = true, competenciaReferencia, styles
}) => {
    const fieldId = React.useId();
    const [taxOpen, setTaxOpen] = React.useState(Boolean(entry.isEA || entry.excluirIR || entry.pssIsEA || entry.valorBrutoManual !== undefined));
    const [functionToAdd, setFunctionToAdd] = React.useState('');
    const selectRef = React.useRef<HTMLSelectElement>(null);
    const daysRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
    const addedFunctionRef = React.useRef<string | null>(null);
    const focusSelectRef = React.useRef(false);
    const selectedFunctions = Object.keys(entry.dias || {});
    const availableFunctions = functionKeys.filter(key => !selectedFunctions.includes(key));
    const canAdd = calculationReady && availableFunctions.some(key => eligibleFunctionKeys.includes(key));
    const hasManualGross = entry.valorBrutoManual !== undefined;
    React.useLayoutEffect(() => {
        if (focusSelectRef.current && canAdd) {
            selectRef.current?.focus();
            focusSelectRef.current = false;
        }
    }, [canAdd, entry.dias]);
    React.useLayoutEffect(() => {
        const key = addedFunctionRef.current;
        if (key && daysRefs.current[key] && !daysRefs.current[key]?.disabled) {
            daysRefs.current[key]?.focus();
            addedFunctionRef.current = null;
        }
    }, [entry.dias, calculationReady]);
    const addFunction = () => {
        if (!canAdd || !availableFunctions.includes(functionToAdd) || !eligibleFunctionKeys.includes(functionToAdd)) return;
        addedFunctionRef.current = functionToAdd;
        focusSelectRef.current = false;
        updateEntry(entry.id, { dias: { ...entry.dias, [functionToAdd]: 0 } });
        setFunctionToAdd('');
    };
    const removeFunction = (key: string) => {
        const next = { ...entry.dias };
        delete next[key];
        focusSelectRef.current = true;
        updateEntry(entry.id, { dias: next });
    };

    return (
        <div className="space-y-4">
            <div>
                <div className="py-3 space-y-2 border-y border-neutral-200 dark:border-neutral-700">
                    <label htmlFor={`${fieldId}-function-select`} className={styles.label}>Selecione a função substituída</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select id={`${fieldId}-function-select`} ref={selectRef} className={`${styles.input} min-w-0 flex-1`}
                            value={availableFunctions.includes(functionToAdd) ? functionToAdd : ''} disabled={!canAdd}
                            onChange={event => setFunctionToAdd(event.target.value)}>
                            <option value="">Selecione uma função</option>
                            {availableFunctions.map(key => <option key={key} value={key} disabled={!eligibleFunctionKeys.includes(key)}>
                                {key.toUpperCase()}{!eligibleFunctionKeys.includes(key) ? ' — Sem diferença de substituição' : ''}
                            </option>)}
                        </select>
                        <button type="button" onClick={addFunction}
                            disabled={!canAdd || !availableFunctions.includes(functionToAdd) || !eligibleFunctionKeys.includes(functionToAdd)}
                            className="min-h-11 shrink-0 rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed dark:bg-neutral-200 dark:text-neutral-900">
                            Adicionar função
                        </button>
                    </div>
                    <p role="status" className="text-body-xs text-neutral-500 dark:text-neutral-400">
                        {!calculationReady ? 'Atualizando cálculo e funções elegíveis…'
                            : functionKeys.length === 0 ? 'Catálogo de funções indisponível para esta simulação.'
                            : !eligibleFunctionKeys.length ? 'Nenhuma função gera diferença de substituição nesta simulação.'
                            : !canAdd ? 'Todas as funções elegíveis já foram adicionadas.'
                            : selectedFunctions.length === 0 ? 'Adicione uma função para informar os dias de substituição.' : 'Você pode adicionar outra função, se necessário.'}
                    </p>
                    {hasManualGross && <p className="text-body-xs text-warning-700 dark:text-warning-300">
                        O valor bruto documentado substitui o cálculo por dias. Os subtotais por função são apenas referência e não são somados ao valor documentado. Para usar o cálculo por dias, limpe o valor documentado em Tributação.
                    </p>}
                </div>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700" aria-busy={!calculationReady}>
                    {selectedFunctions.map(key => {
                        const inCatalog = functionKeys.includes(key);
                        const eligible = eligibleFunctionKeys.includes(key);
                        const detail = functionDetails.find(item => item.funcao === key);
                        return <div key={key} className="border-b border-neutral-200 dark:border-neutral-700 py-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 text-body-xs font-semibold text-neutral-700 dark:text-neutral-300 break-words">
                                    {key.toUpperCase()}
                                    {!inCatalog && <span className="block font-normal text-warning-700 dark:text-warning-300">Função indisponível no catálogo. Revise este lançamento.</span>}
                                    {inCatalog && calculationReady && !eligible && <span className="block font-normal text-neutral-500 dark:text-neutral-400">Sem diferença de substituição. Dias preservados, sem valor pelo cálculo por dias.</span>}
                                </div>
                                <button type="button" aria-label={`Remover ${key.toUpperCase()}`} onClick={() => removeFunction(key)}
                                    className="min-h-11 shrink-0 rounded-lg px-3 text-body-xs font-semibold text-error-700 hover:bg-error-50 dark:text-error-300 dark:hover:bg-error-950/30">Remover</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:items-end">
                                <div className="min-w-0">
                                    <label htmlFor={`${fieldId}-${key}-dias`} className={styles.label}>Dias de substituição</label>
                                    <input id={`${fieldId}-${key}-dias`} ref={node => { daysRefs.current[key] = node; }} type="number" min="0" step="any"
                                        className={styles.input} value={entry.dias[key] || ''} placeholder="0"
                                        aria-label={`${key.toUpperCase()} — Dias de substituição`}
                                        disabled={!inCatalog || (calculationReady && !eligible)} readOnly={!calculationReady}
                                        onChange={event => {
                                            const value = Number(event.target.value);
                                            updateEntry(entry.id, { dias: { ...entry.dias, [key]: Number.isFinite(value) ? Math.max(0, value) : 0 } });
                                        }} />
                                </div>
                                <div className="min-w-0 text-body-xs text-neutral-600 dark:text-neutral-400">
                                    <span className="block">{hasManualGross ? 'Subtotal por dias (referência)' : 'Subtotal bruto'}</span>
                                    <output aria-label={`${key.toUpperCase()} — Subtotal bruto`} className="block py-3 font-mono font-semibold text-neutral-800 dark:text-neutral-200 break-words">
                                        {!calculationReady ? 'Atualizando…' : detail
                                            ? detail.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Aguardando cálculo…'}
                                    </output>
                                </div>
                            </div>
                        </div>;
                    })}
                </div>
            </div>
            <details className="group/tax pt-1" open={taxOpen} onToggle={event => setTaxOpen(event.currentTarget.open)}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded py-2 text-body text-neutral-700 dark:text-neutral-300 [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700">
                    <span className="inline-flex items-center gap-2 font-semibold"><SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />Tributação</span>
                    <span className="ml-auto text-right text-body-xs font-normal text-neutral-500 dark:text-neutral-400">
                        {entry.excluirIR ? 'Sem incidência de IR' : entry.isEA ? 'Exercícios anteriores (RRA)' : 'IR mensal'}{entry.pssIsEA ? ' · PSS de exercícios anteriores' : ''}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 group-open/tax:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-4 pt-2">
                    <fieldset className="flex flex-col gap-x-6 sm:flex-row sm:flex-wrap">
                        <legend className="sr-only">Regime de tributação da substituição</legend>
                        {[
                            { value: 'mensal', label: 'IR mensal' },
                            { value: 'rra', label: 'Exercícios anteriores (RRA)' },
                            { value: 'excluir', label: 'Excluir do IR' }
                        ].map(option => <label key={option.value} className={`${styles.checkboxLabel} min-h-11 py-2`}>
                            <input type="radio" name={`${fieldId}-tributacao`} value={option.value} className="h-4 w-4 shrink-0 accent-secondary-800"
                                checked={option.value === (entry.excluirIR ? 'excluir' : entry.isEA ? 'rra' : 'mensal')}
                                onChange={() => {
                                    setTaxOpen(true);
                                    updateEntry(entry.id, {
                                        isEA: option.value === 'rra', excluirIR: option.value === 'excluir',
                                        competenciasEA: option.value === 'rra' && !entry.competenciasEA?.length
                                            ? [getDefaultEaCompetencia(competenciaReferencia)] : entry.competenciasEA
                                    });
                                }} />
                            <span>{option.label}</span>
                        </label>)}
                    </fieldset>
                    {entry.isEA && !entry.excluirIR ? <IrEaCompetencias compact tipo="substituicao" value={entry.competenciasEA}
                        onChange={competenciasEA => updateEntry(entry.id, { competenciasEA })} styles={styles} competenciaReferencia={competenciaReferencia} />
                        : <p className="text-body-xs text-neutral-500 dark:text-neutral-400">{entry.excluirIR ? 'O valor desta verba fica excluído da base do Imposto de Renda.' : 'O valor compõe a base do IR da folha mensal.'}</p>}
                    <label className={styles.checkboxLabel}>
                        <input type="checkbox" className={styles.checkbox} checked={entry.pssIsEA}
                            onChange={event => updateEntry(entry.id, { pssIsEA: event.target.checked })} />
                        <span>Incluir na base do PSS (Exercício Anterior - EA)</span>
                    </label>
                    {(entry.isEA || hasManualGross) && <div className="space-y-2">
                        <label htmlFor={`${fieldId}-manual-gross`} className={styles.label}>Valor bruto documentado da substituição (R$, opcional)</label>
                        <input id={`${fieldId}-manual-gross`} type="number" min="0" step="0.01" className={styles.input}
                            value={entry.valorBrutoManual ?? ''} placeholder="0,00" onChange={event => updateEntry(entry.id, {
                                valorBrutoManual: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0)
                            })} />
                        {hasManualGross && <button type="button" className="min-h-11 text-body-xs font-semibold text-secondary-800 hover:underline dark:text-secondary-300"
                            onClick={() => updateEntry(entry.id, { valorBrutoManual: undefined })}>Usar cálculo por dias</button>}
                    </div>}
                </div>
            </details>
        </div>
    );
};
