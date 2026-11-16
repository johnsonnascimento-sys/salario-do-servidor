import React, { useLayoutEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency, getTablesForPeriod } from '../../../utils/calculations';

interface ThirteenthCardProps {
    state: CalculatorState;
    inputState?: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
    onEditingChange?: (editing: boolean) => void;
    overview?: React.ReactNode;
}

// Only these inputs may be committed; calculated outputs remain owned by the engine.
const editableFields = [
    'decimoIncideVencimento', 'decimoIncideGAJ', 'decimoIncideFuncao',
    'decimoIncideAQTitulo', 'decimoIncideAQTreino', 'decimoIncideVPNI',
    'decimoIncideATS', 'decimoIncideGrat', 'decimoIncideAbono',
    'decimoRubricasInclusas', 'decimoOutrasParcelas', 'manualAdiant13',
    'adiant13Venc', 'adiant13FC', 'segunda13Venc', 'segunda13FC'
] as const satisfies readonly (keyof CalculatorState)[];

type ThirteenthDraft = Pick<CalculatorState, typeof editableFields[number]>;
const pickInputs = (state: CalculatorState): ThirteenthDraft =>
    Object.fromEntries(editableFields.map(field => [field, state[field]])) as ThirteenthDraft;
const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const parseCurrencyInput = (value: string) => Number(value.replace(/\D/g, '')) / 100;
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 dark:border-neutral-600';

export const ThirteenthCard: React.FC<ThirteenthCardProps> = ({
    state: savedState, inputState, update: saveField, styles, courtConfig, onEditingChange, overview
}) => {
    const fieldId = React.useId();
    const [draft, setDraft] = useState<ThirteenthDraft | null>(null);
    const [customSecond, setCustomSecond] = useState({ segunda13Venc: false, segunda13FC: false });
    const initialDraft = useRef<ThirteenthDraft | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);
    const state = draft ? { ...savedState, ...draft } : savedState;
    const inputs = inputState ?? savedState;
    useLayoutEffect(() => {
        if (Boolean(draft) !== wasEditing.current) {
            const target = draft ? headingRef.current : buttonRef.current;
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            wasEditing.current = Boolean(draft);
        }
    }, [Boolean(draft)]);
    const update = (field: keyof CalculatorState, value: any) => {
        setDraft(current => current ? { ...current, [field]: value } : current);
    };
    const openEditor = () => {
        const next = pickInputs(inputs);
        setCustomSecond({ segunda13Venc: Boolean(inputs.manualAdiant13 && next.segunda13Venc > 1), segunda13FC: Boolean(inputs.manualAdiant13 && next.segunda13FC > 1) });
        initialDraft.current = next;
        setDraft(next);
        onEditingChange?.(true);
    };
    const closeEditor = (apply: boolean) => {
        if (apply && draft && initialDraft.current) {
            editableFields.forEach(field => {
                if (draft[field] !== initialDraft.current![field]) saveField(field, draft[field]);
            });
        }
        setDraft(null);
        initialDraft.current = null;
        onEditingChange?.(false);
    };

    const noFunctionCode = courtConfig?.careerCatalog?.noFunctionCode;
    const funcaoValorBruta = !state.funcao || state.funcao === noFunctionCode || !courtConfig
        ? 0 : (getTablesForPeriod(state.periodo, courtConfig).funcoes[state.funcao] || 0);
    const temAbonoAtivo = Boolean(state.recebeAbono);
    const valorAbono = temAbonoAtivo ? (Number(state.abonoPermanencia) || Number(state.pssMensal) || 0) : 0;
    const creditRubricas = (state.rubricasExtras || []).filter(r => r.tipo === 'C');
    const incideVenc = state.decimoIncideVencimento !== false;
    const incideGAJ = state.decimoIncideGAJ !== false;
    const incideFuncao = state.decimoIncideFuncao !== false;
    const incideAQTitulo = state.decimoIncideAQTitulo !== false;
    const incideAQTreino = state.decimoIncideAQTreino !== false;
    const incideVPNI = state.decimoIncideVPNI !== false;
    const incideATS = state.decimoIncideATS !== false;
    const incideGrat = state.decimoIncideGrat !== false;
    const incideAbono = state.decimoIncideAbono !== false;
    const funcaoValor = incideFuncao ? funcaoValorBruta : 0;
    // Preview of the editable composition, never a substitute for engine totals/taxes.
    const baseSemFC = roundCurrency(
        (incideVenc ? state.vencimento || 0 : 0) +
        (incideGAJ ? state.gaj || 0 : 0) +
        (incideAQTitulo ? state.aqTituloValor || 0 : 0) +
        (incideAQTreino ? state.aqTreinoValor || 0 : 0) +
        (incideGrat ? state.gratEspecificaValor || 0 : 0) +
        (incideVPNI ? (state.vpni_lei || 0) + (state.vpni_decisao || 0) : 0) +
        (incideATS ? state.ats || 0 : 0) + (incideAbono ? valorAbono : 0) +
        creditRubricas.filter(r => state.decimoRubricasInclusas?.[r.id]).reduce((sum, r) => sum + (r.valor || 0), 0) +
        (state.decimoOutrasParcelas || 0)
    );
    const totalBaseApurada = roundCurrency(baseSemFC + funcaoValor);
    const hasFunction = funcaoValorBruta > 0 && incideFuncao;
    const handleToggleManual = (enabled: boolean) => {
        setCustomSecond({ segunda13Venc: false, segunda13FC: false });
        setDraft(current => current ? {
            ...current, manualAdiant13: enabled,
            // Automatic amounts restored from snapshots are selections, not manual overrides.
            ...(enabled ? { segunda13Venc: current.segunda13Venc > 0 ? 1 : 0, segunda13FC: current.segunda13FC > 0 ? 1 : 0 } : {}),
            ...(enabled && current.adiant13Venc <= 1 ? { adiant13Venc: savedState.adiant13Venc > 1 ? savedState.adiant13Venc : roundCurrency(baseSemFC / 2) } : {}),
            ...(enabled && hasFunction && current.adiant13FC <= 1 ? { adiant13FC: savedState.adiant13FC > 1 ? savedState.adiant13FC : roundCurrency(funcaoValor / 2) } : {})
        } : current);
    };
    const renderAmount = (field: 'adiant13Venc' | 'adiant13FC' | 'segunda13Venc' | 'segunda13FC', label: string) => (
        <div className="space-y-1">
            <label htmlFor={`${fieldId}-${field}`} className={styles.label}>{label}</label>
            <input id={`${fieldId}-${field}`} type="text" inputMode="decimal" data-calculator="true" className={styles.input}
                value={state[field] ? state[field].toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                placeholder="0,00" onChange={event => update(field, parseCurrencyInput(event.target.value))} />
        </div>
    );
    const renderSecondAdjustment = (isFunction: boolean) => {
        const field = isFunction ? 'segunda13FC' : 'segunda13Venc';
        const advance = isFunction ? state.adiant13FC : state.adiant13Venc;
        const base = isFunction ? funcaoValor : baseSemFC;
        const label = isFunction ? '2ª parcela — FC/CJ' : '2ª parcela — Cargo efetivo';
        const selected = state.tipoCalculo === 'nov' || state[field] > 0;
        const custom = customSecond[field];
        return <div className="space-y-2">
            <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} checked={selected}
                    disabled={state.tipoCalculo === 'nov'} onChange={event => update(field, event.target.checked ? 1 : 0)} />
                {label}
            </label>
            {selected && <>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox} checked={custom}
                        onChange={event => {
                            setCustomSecond(current => ({ ...current, [field]: event.target.checked }));
                            update(field, event.target.checked ? roundCurrency(Math.max(0, base - advance)) : 1);
                        }} />
                    Informar valor da 2ª parcela ({isFunction ? 'FC/CJ' : 'cargo efetivo'})
                </label>
                {custom ? renderAmount(field, label) : <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Saldo automático após o abatimento do adiantamento.</p>}
            </>}
        </div>;
    };
    const toggleParcel = (second: boolean, isFunction: boolean, enabled: boolean) => {
        const firstField = isFunction ? 'adiant13FC' : 'adiant13Venc';
        const secondField = isFunction ? 'segunda13FC' : 'segunda13Venc';
        if (second) {
            if (enabled && savedState[firstField] <= 0) saveField(firstField, 1);
            saveField(secondField, enabled ? 1 : 0);
        } else {
            if (!enabled && savedState[secondField] > 0) saveField(secondField, 0);
            saveField(firstField, enabled ? 1 : 0);
        }
    };

    return <div className="space-y-4 text-neutral-700 dark:text-neutral-200">
        {!draft ? <>
            {!state.manualAdiant13 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[false, true].map(second => <fieldset key={String(second)} className="min-w-0 space-y-1">
                    <legend className="mb-1 text-body font-semibold">{second ? '2ª parcela' : '1ª parcela — Adiantamento'}</legend>
                    {[false, ...(hasFunction ? [true] : [])].map(isFunction => {
                        const field = second ? (isFunction ? 'segunda13FC' : 'segunda13Venc') : (isFunction ? 'adiant13FC' : 'adiant13Venc');
                        return <label key={field} className={styles.checkboxLabel}>
                            <input type="checkbox" className={styles.checkbox} checked={savedState[field] > 0}
                                onChange={event => toggleParcel(second, isFunction, event.target.checked)} />
                            {isFunction ? 'FC/CJ' : 'Cargo efetivo'}
                        </label>;
                    })}
                </fieldset>)}
            </div> : <div className="flex flex-wrap justify-between gap-2 text-body-xs text-neutral-600 dark:text-neutral-300">
                <span>Adiantamento informado</span>
                <span>{inputs.segunda13Venc > 1 || inputs.segunda13FC > 1 ? '2ª parcela personalizada' : 'Saldo automático'}</span>
            </div>}
            {overview}
            <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <button ref={buttonRef} type="button" className={actionClass} onClick={openEditor}>
                    <SlidersHorizontal size={16} aria-hidden="true" />Personalizar cálculo
                </button>
            </div>
        </> : <section aria-labelledby={`${fieldId}-title`} className="space-y-6">
            <h4 ref={headingRef} tabIndex={-1} id={`${fieldId}-title`} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2">Personalizar 13º salário</h4>
            <section aria-labelledby={`${fieldId}-composition`} className="space-y-3">
                <h5 id={`${fieldId}-composition`} className="text-body font-semibold">Composição da remuneração de referência (13º)</h5>
                <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Selecione as parcelas que integram o cálculo.</p>
                <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 [&>label]:py-3">
                    {/* Vencimento Básico */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideVenc}
                            onChange={e => update('decimoIncideVencimento', e.target.checked)}
                        />
                        <span className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Vencimento Básico</span>
                            <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.vencimento)}</span>
                        </span>
                    </label>

                    {/* GAJ */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideGAJ}
                            onChange={e => update('decimoIncideGAJ', e.target.checked)}
                        />
                        <span className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-body-xs text-neutral-700 dark:text-neutral-300">GAJ</span>
                            <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.gaj)}</span>
                        </span>
                    </label>

                    {/* FC / CJ */}
                    {funcaoValorBruta > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideFuncao}
                                onChange={e => update('decimoIncideFuncao', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">FC / CJ</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(funcaoValorBruta)}</span>
                            </span>
                        </label>
                    )}

                    {/* AQ Títulos */}
                    {(state.aqTituloValor || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideAQTitulo}
                                onChange={e => update('decimoIncideAQTitulo', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Títulos</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTituloValor || 0)}</span>
                            </span>
                        </label>
                    )}

                    {/* AQ Treinamento */}
                    {(state.aqTreinoValor || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideAQTreino}
                                onChange={e => update('decimoIncideAQTreino', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Treinamento</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTreinoValor || 0)}</span>
                            </span>
                        </label>
                    )}

                    {/* VPNI (Lei e Decisão Judicial) */}
                    {((state.vpni_lei || 0) > 0 || (state.vpni_decisao || 0) > 0) && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideVPNI}
                                onChange={e => update('decimoIncideVPNI', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">VPNI (Quintos/Graduação)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency((state.vpni_lei || 0) + (state.vpni_decisao || 0))}</span>
                            </span>
                        </label>
                    )}

                    {/* ATS (Anuênios) */}
                    {(state.ats || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideATS}
                                onChange={e => update('decimoIncideATS', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">ATS (Anuênios)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.ats)}</span>
                            </span>
                        </label>
                    )}

                    {/* Gratificação Específica (GAE / GAS) */}
                    {(state.gratEspecificaValor || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideGrat}
                                onChange={e => update('decimoIncideGrat', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Gratificação Específica (GAE/GAS)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.gratEspecificaValor)}</span>
                            </span>
                        </label>
                    )}

                    {/* Abono de Permanência */}
                    <label className={`${styles.checkboxLabel} ${!temAbonoAtivo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            disabled={!temAbonoAtivo}
                            checked={incideAbono}
                            onChange={e => update('decimoIncideAbono', e.target.checked)}
                        />
                        <span className="flex-1 flex flex-col">
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Abono de Permanência</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valorAbono)}</span>
                            </span>
                            {!temAbonoAtivo && (
                                <span className="text-body-xs text-neutral-400 dark:text-neutral-500 font-normal">
                                    (Requer módulo de abono de permanência ativo)
                                </span>
                            )}
                        </span>
                    </label>

                    {/* Rubricas Manuais de Crédito dinâmicas */}
                    {creditRubricas.map((rubrica, idx) => {
                        const isChecked = Boolean(state.decimoRubricasInclusas?.[rubrica.id]);
                        const label = rubrica.descricao.trim() || `Crédito Dinâmico #${idx + 1}`;
                        return (
                            <label key={rubrica.id} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={isChecked}
                                    onChange={e => {
                                        const current = state.decimoRubricasInclusas || {};
                                        update('decimoRubricasInclusas', {
                                            ...current,
                                            [rubrica.id]: e.target.checked
                                        });
                                    }}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300 min-w-0 break-words" title={label}>
                                        {label}
                                    </span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold shrink-0">
                                        {formatCurrency(rubrica.valor || 0)}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>

                {/* Outras parcelas / Ajustes na base */}
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label htmlFor={`${fieldId}-decimoOutrasParcelas`} className="text-body-xs text-neutral-600 dark:text-neutral-400">
                        Outras parcelas / Ajustes na base do 13º:
                    </label>
                    <div className="relative w-full sm:w-44">
                        <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                        <input id={`${fieldId}-decimoOutrasParcelas`} aria-label="Outras parcelas da base do 13º salário"
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                            value={state.decimoOutrasParcelas || ''}
                            onChange={e => update('decimoOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                {/* Subtotal da Base Apurada */}
                <div className={styles.internalTotalWrapper}>
                    <span className={styles.internalTotalLabel}>Base apurada da remuneração (13º)</span>
                    <span className={styles.internalTotalValue}>{formatCurrency(totalBaseApurada)}</span>
                </div>
            </section>
            <section aria-labelledby={`${fieldId}-adjustments`} className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <h5 id={`${fieldId}-adjustments`} className="text-body font-semibold">Ajustes das parcelas</h5>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox} checked={state.manualAdiant13}
                        onChange={event => handleToggleManual(event.target.checked)} />
                    Informar o adiantamento recebido
                </label>
                {state.manualAdiant13 && <>
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Informe os valores do adiantamento no contracheque. A 2ª parcela terá o saldo calculado automaticamente, salvo edição do valor.</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {renderAmount('adiant13Venc', 'Adiantamento recebido — Cargo efetivo')}
                        {hasFunction && renderAmount('adiant13FC', 'Adiantamento recebido — FC/CJ')}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {renderSecondAdjustment(false)}
                        {hasFunction && renderSecondAdjustment(true)}
                    </div>
                </>}
            </section>
            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <button type="button" className={actionClass} onClick={() => closeEditor(false)}>Cancelar</button>
                <button type="button" className={`${actionClass} bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900`} onClick={() => closeEditor(true)}>Aplicar ajustes</button>
            </div>
        </section>}
    </div>;
};
