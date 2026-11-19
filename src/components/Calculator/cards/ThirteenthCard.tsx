import React, { useLayoutEffect, useRef, useState, useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency, getTablesForPeriod } from '../../../utils/calculations';
import { createThirteenthPayroll, thirteenthSelection, ParcelSelection } from '../../../utils/thirteenthPayroll';
import { useThirteenthPreview } from '../hooks/useThirteenthPreview';
import { ThirteenthPaymentsEditor } from './ThirteenthPaymentsEditor';

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
const editableFields = [
    'decimoIncideVencimento', 'decimoIncideGAJ', 'decimoIncideFuncao',
    'decimoIncideAQTitulo', 'decimoIncideAQTreino', 'decimoIncideVPNI',
    'decimoIncideATS', 'decimoIncideGrat', 'decimoIncideAbono',
    'decimoRubricasInclusas', 'decimoOutrasParcelas', 'thirteenthPayroll'
] as const satisfies readonly (keyof CalculatorState)[];
type ThirteenthDraft = Pick<CalculatorState, typeof editableFields[number]>;
const pickInputs = (state: CalculatorState): ThirteenthDraft =>
    Object.fromEntries(editableFields.map(field => [field, state[field]])) as ThirteenthDraft;
const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 dark:border-neutral-600';

const ParcelToggle: React.FC<{ value: ParcelSelection; disabled: boolean; label: string; styles: any; onChange: (checked: boolean) => void }> = ({ value, disabled, label, styles, onChange }) => {
    const ref = useRef<HTMLInputElement>(null);
    useLayoutEffect(() => { if (ref.current) ref.current.indeterminate = value === 'mixed'; }, [value]);
    return <label className={styles.checkboxLabel}>
        <input ref={ref} type="checkbox" className={styles.checkbox} checked={value === true}
            aria-checked={value === 'mixed' ? 'mixed' : value} disabled={disabled} onChange={event => onChange(event.target.checked)} />
        {label}
    </label>;
};

export const ThirteenthCard: React.FC<ThirteenthCardProps> = ({
    state: savedState, inputState, update: saveField, styles, courtConfig, onEditingChange, overview
}) => {
    const fieldId = React.useId();
    const [draft, setDraft] = useState<ThirteenthDraft | null>(null);
    const initialDraft = useRef<ThirteenthDraft | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);
    const inputs = inputState ?? savedState;
    const state = useMemo(() => draft ? { ...savedState, ...draft } : savedState, [savedState, draft]);
    const previewState = useMemo(() => ({ ...inputs, ...draft }), [inputs, draft]);
    const preview = useThirteenthPreview(previewState, courtConfig, Boolean(draft));
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
    const totalBaseApurada = preview.reference?.referenceTotal ?? roundCurrency(baseSemFC + funcaoValor);
    const hasFunction = funcaoValorBruta > 0 && incideFuncao;
    const selection = thirteenthSelection(inputs, hasFunction);
    const partial = selection.first === 'mixed' || selection.second === 'mixed';
    const openEditor = () => {
        const next = pickInputs(inputs);
        initialDraft.current = next;
        setDraft({ ...next, thirteenthPayroll: createThirteenthPayroll(inputs, savedState, hasFunction) });
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
    const toggleParcel = (second: boolean, enabled: boolean) => {
        const next = createThirteenthPayroll(inputs, savedState, hasFunction);
        if (second) { next.secondSelected = enabled; if (enabled) next.firstSelected = true; }
        else { next.firstSelected = enabled; if (!enabled) next.secondSelected = false; }
        saveField('thirteenthPayroll', next);
    };
    return <div className="space-y-4 text-neutral-700 dark:text-neutral-200">
        {!draft ? <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ParcelToggle value={selection.first} disabled={['jan', 'jun', 'nov'].includes(inputs.tipoCalculo)} label="Receber 1ª parcela" styles={styles} onChange={checked => toggleParcel(false, checked)} />
                <ParcelToggle value={selection.second} disabled={inputs.tipoCalculo === 'nov'} label="Receber 2ª parcela" styles={styles} onChange={checked => toggleParcel(true, checked)} />
            </div>
            {selection.second !== false && <p className="text-body-xs text-neutral-500 dark:text-neutral-400">O adiantamento será considerado e abatido no fechamento; não será pago novamente.</p>}
            {partial && <p role="status" className="text-body-xs text-warning-700 dark:text-warning-300">Seleção parcial de uma simulação anterior. Revise em Personalizar cálculo antes de confirmar o recebimento unificado.</p>}
            {inputs.thirteenthPayroll && <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Adiantamento: {inputs.thirteenthPayroll.firstMode === 'automatico' ? 'automático' : 'valores informados'}. Fechamento: {inputs.thirteenthPayroll.secondMode === 'automatico' ? 'automático' : 'valores manuais'}.</p>}
            {overview}
            <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <button ref={buttonRef} type="button" className={actionClass} onClick={openEditor}><SlidersHorizontal size={16} aria-hidden="true" />Personalizar cálculo</button>
            </div>
        </> : <section aria-labelledby={`${fieldId}-title`} className="space-y-6">
            <h4 ref={headingRef} tabIndex={-1} id={`${fieldId}-title`} className="text-h5 focus-visible:outline focus-visible:outline-2">Personalizar 13º salário</h4>
            {partial && <p className="text-body-xs text-warning-700 dark:text-warning-300">A configuração anterior seleciona componentes diferentes. Aplicar ajustes confirma o recebimento unificado das parcelas selecionadas, preservando os valores recuperados nas listas.</p>}
            <section aria-labelledby={`${fieldId}-composition`} className="space-y-3">
                <h5 id={`${fieldId}-composition`} className="text-body font-semibold">Composição da remuneração de referência</h5>
                <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Selecione as parcelas que integram o cálculo. O abono mensal desta composição é distinto do abono próprio do 13º apurado pelo motor.</p>
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

                {(state.decimoOutrasParcelas || 0) > 0 && <p className="text-body-xs text-warning-700 dark:text-warning-300">Para identificar as incidências deste ajuste, cadastre a verba em Créditos como rubrica avulsa, selecione-a na composição e substitua explicitamente este valor. O cálculo permanece pendente até a identificação.</p>}

                {/* Subtotal da Base Apurada */}
                <div className={styles.internalTotalWrapper}>
                    <span className={styles.internalTotalLabel}>Base de cálculo do 13º salário</span>
                    <span className={styles.internalTotalValue}>{formatCurrency(totalBaseApurada)}</span>
                </div>
            </section>
            {draft.thirteenthPayroll && <ThirteenthPaymentsEditor value={draft.thirteenthPayroll} onChange={next => update('thirteenthPayroll', next)} reference={preview.reference} memory={preview.memory} loading={preview.loading} error={preview.error} styles={styles} />}
            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <button type="button" className={actionClass} onClick={() => closeEditor(false)}>Cancelar</button>
                <button type="button" className={`${actionClass} bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900`} onClick={() => closeEditor(true)}>Aplicar ajustes</button>
            </div>
        </section>}
    </div>;
};
