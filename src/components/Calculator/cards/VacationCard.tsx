import { SlidersHorizontal } from 'lucide-react';
import { useVacationPreview } from '../hooks/useVacationPreview';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency, getTablesForPeriod } from '../../../utils/calculations';

interface VacationCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
    inputState?: CalculatorState;
    onEditingChange?: (editing: boolean) => void;
    calculationReady?: boolean;
    overview?: React.ReactNode;
}

const parseCurrencyInput = (value: string) => {
    const raw = value.replace(/\D/g, '');
    return Number(raw) / 100;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const editableFields = [
    'feriasIncideVencimento', 'feriasIncideGAJ', 'feriasIncideFuncao',
    'feriasIncideAQTitulo', 'feriasIncideAQTreino', 'feriasIncideVPNI',
    'feriasIncideATS', 'feriasIncideGrat', 'feriasIncideAbono',
    'feriasRubricasInclusas', 'feriasOutrasParcelas', 'manualFerias',
    'ferias1_3', 'feriasAntecipadas', 'feriasDescManual', 'feriasDesc'
] as const satisfies readonly (keyof CalculatorState)[];
type VacationDraft = Pick<CalculatorState, typeof editableFields[number]>;
const pickInputs = (state: CalculatorState): VacationDraft =>
    Object.fromEntries(editableFields.map(field => [field, state[field]])) as VacationDraft;
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 dark:border-neutral-600';

export const VacationCard: React.FC<VacationCardProps> = ({ state: savedState, inputState, update: saveField, styles, courtConfig, onEditingChange, calculationReady = false, overview }) => {
    const fieldId = React.useId();
    const inputs = inputState ?? savedState;
    const [draft, setDraft] = useState<VacationDraft | null>(null);
    const initialDraft = useRef<VacationDraft | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);
    const previewInput = useMemo(() => ({ ...inputs, ...draft }), [inputs, draft]);
    const preview = useVacationPreview(previewInput, courtConfig, Boolean(draft));
    const state = { ...savedState, ...preview.values, ...draft };
    useLayoutEffect(() => {
        if (Boolean(draft) !== wasEditing.current) {
            (draft ? headingRef.current : buttonRef.current)?.focus({ preventScroll: true });
            wasEditing.current = Boolean(draft);
        }
    }, [Boolean(draft)]);
    const update = (field: keyof CalculatorState, value: any) => {
        setDraft(current => current ? { ...current, [field]: value } : current);
    };
    const openEditor = () => {
        const next = pickInputs(inputs);
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
    const funcaoValorBruta = useMemo(() => {
        if (!state.funcao || state.funcao === noFunctionCode || !courtConfig?.bases?.funcoes) {
            return 0;
        }
        return getTablesForPeriod(state.periodo, courtConfig).funcoes[state.funcao] || 0;
    }, [state.funcao, state.periodo, noFunctionCode, courtConfig]);

    const temAbonoAtivo = Boolean(state.recebeAbono);
    const valorAbono = temAbonoAtivo
        ? (Number(state.abonoPermanencia) || Number(state.pssMensal) || 0)
        : 0;

    const creditRubricas = useMemo(() => {
        return (state.rubricasExtras || []).filter(r => r.tipo === 'C');
    }, [state.rubricasExtras]);

    // Incidências das parcelas padrão e dinâmicas
    const incideVenc = state.feriasIncideVencimento !== false;
    const incideGAJ = state.feriasIncideGAJ !== false;
    const incideFuncao = state.feriasIncideFuncao !== false;
    const incideAQTitulo = state.feriasIncideAQTitulo !== false;
    const incideAQTreino = state.feriasIncideAQTreino !== false;
    const incideVPNI = state.feriasIncideVPNI !== false;
    const incideATS = state.feriasIncideATS !== false;
    const incideGrat = state.feriasIncideGrat !== false;
    const incideAbono = state.feriasIncideAbono !== false;

    // Base apurada da remuneração de férias com as seleções dinâmicas
    const totalBaseApurada = useMemo(() => {
        let total = 0;
        if (incideVenc) total += (state.vencimento || 0);
        if (incideGAJ) total += (state.gaj || 0);
        if (incideFuncao) total += funcaoValorBruta;
        if (incideAQTitulo) total += (state.aqTituloValor || 0);
        if (incideAQTreino) total += (state.aqTreinoValor || 0);
        if (incideGrat) total += (state.gratEspecificaValor || 0);
        if (incideVPNI) total += (state.vpni_lei || 0) + (state.vpni_decisao || 0);
        if (incideATS) total += (state.ats || 0);
        if (incideAbono && temAbonoAtivo) total += valorAbono;

        if (state.feriasRubricasInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'C' && state.feriasRubricasInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.feriasOutrasParcelas && state.feriasOutrasParcelas > 0) {
            total += state.feriasOutrasParcelas;
        }

        return roundCurrency(total);
    }, [
        incideVenc,
        incideGAJ,
        incideFuncao,
        funcaoValorBruta,
        incideAQTitulo,
        incideAQTreino,
        incideGrat,
        incideVPNI,
        incideATS,
        incideAbono,
        temAbonoAtivo,
        valorAbono,
        state.vencimento,
        state.gaj,
        state.aqTituloValor,
        state.aqTreinoValor,
        state.gratEspecificaValor,
        state.vpni_lei,
        state.vpni_decisao,
        state.ats,
        state.feriasRubricasInclusas,
        state.rubricasExtras,
        state.feriasOutrasParcelas
    ]);

    const tercoCalculado = useMemo(() => {
        return roundCurrency(totalBaseApurada / 3);
    }, [totalBaseApurada]);

    const handleFeriasAntecipadasChange = (checked: boolean) => {
        update('feriasAntecipadas', checked);

        if (!checked) {
            update('feriasDescManual', false);
            update('feriasDesc', 0);
            return;
        }

        if (!state.feriasDescManual) {
            update('feriasDesc', Math.round((preview.result?.value ?? savedState.ferias1_3 ?? 0) * 100) / 100);
        }
    };

    const handleFeriasDescManualChange = (checked: boolean) => {
        update('feriasDescManual', checked);

        if (!checked) {
            update('feriasDesc', Math.round((preview.result?.value ?? savedState.ferias1_3 ?? 0) * 100) / 100);
        } else if ((state.feriasDesc || 0) <= 0) {
            update('feriasDesc', Math.round((preview.result?.value ?? savedState.ferias1_3 ?? 0) * 100) / 100);
        }
    };

    return (
        <div className="space-y-4 text-neutral-700 dark:text-neutral-200">
            {!draft ? <>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox}
                        checked={inputs.ferias1_3 > 0 || (!inputs.manualFerias && inputs.tipoCalculo === 'jan')}
                        disabled={!inputs.manualFerias && inputs.tipoCalculo === 'jan'}
                        onChange={e => {
                            if (e.target.checked && inputs.manualFerias) openEditor();
                            else saveField('ferias1_3', e.target.checked ? 1 : 0);
                        }} />
                    Receber adicional no mês
                </label>
                <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                    {inputs.manualFerias ? 'Valor manual' : 'Cálculo automático'}
                </p>
                {inputs.feriasAntecipadas && <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Recebimento anterior informado · desconto {inputs.feriasDescManual ? 'personalizado' : 'automático'}.</p>}
                {overview}
                <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <button ref={buttonRef} type="button" className={actionClass} onClick={openEditor}><SlidersHorizontal size={16} aria-hidden="true" />Personalizar cálculo</button>
                </div>
            </> : <section aria-labelledby={`${fieldId}-title`} className="space-y-6">
                <h4 ref={headingRef} tabIndex={-1} id={`${fieldId}-title`} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2">Personalizar férias</h4>
            <section aria-labelledby={`${fieldId}-composition`} className="space-y-3">
                <h5 id={`${fieldId}-composition`} className="text-body font-semibold">Composição da remuneração de referência (Férias)</h5>
                <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Selecione as parcelas que integram o cálculo de 1/3.</p>
                <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 [&>label]:py-3">
                    {/* Vencimento Básico */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideVenc}
                            onChange={e => update('feriasIncideVencimento', e.target.checked)}
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
                            onChange={e => update('feriasIncideGAJ', e.target.checked)}
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
                                onChange={e => update('feriasIncideFuncao', e.target.checked)}
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
                                onChange={e => update('feriasIncideAQTitulo', e.target.checked)}
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
                                onChange={e => update('feriasIncideAQTreino', e.target.checked)}
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
                                onChange={e => update('feriasIncideVPNI', e.target.checked)}
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
                                onChange={e => update('feriasIncideATS', e.target.checked)}
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
                                onChange={e => update('feriasIncideGrat', e.target.checked)}
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
                            onChange={e => update('feriasIncideAbono', e.target.checked)}
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
                        const isChecked = Boolean(state.feriasRubricasInclusas?.[rubrica.id]);
                        const label = rubrica.descricao.trim() || `Crédito Dinâmico #${idx + 1}`;
                        return (
                            <label key={rubrica.id} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={isChecked}
                                    onChange={e => {
                                        const current = state.feriasRubricasInclusas || {};
                                        update('feriasRubricasInclusas', {
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
                    <label htmlFor={`${fieldId}-feriasOutrasParcelas`} className="text-body-xs text-neutral-600 dark:text-neutral-400">
                        Outras parcelas / Ajustes na base de férias:
                    </label>
                    <div className="relative w-full sm:w-44">
                        <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                        <input id={`${fieldId}-feriasOutrasParcelas`} aria-label="Outras parcelas da base de férias"
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                            value={state.feriasOutrasParcelas || ''}
                            onChange={e => update('feriasOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                {/* Subtotal da Base Apurada e Adicional Correspondente */}
                <div hidden={preview.loading || Boolean(preview.error)} className="pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-body-xs text-neutral-600 dark:text-neutral-400">Base apurada da remuneração (Férias)</span>
                        <span className="font-mono text-body-xs text-neutral-800 dark:text-neutral-200 font-bold">{formatCurrency(totalBaseApurada)}</span>
                    </div>
                    <div className={styles.internalTotalWrapper}>
                        <span className={styles.internalTotalLabel}>1/3 Constitucional correspondente</span>
                        <span className={styles.internalTotalValue}>{formatCurrency(tercoCalculado)}</span>
                    </div>
                </div>
            </section>
            <section className="space-y-3" aria-labelledby={`${fieldId}-manual-title`}>
                <h5 id={`${fieldId}-manual-title`} className="text-body font-semibold">Valor do adicional</h5>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkbox} checked={state.manualFerias} disabled={!state.manualFerias && (preview.loading || Boolean(preview.error))}
                        onChange={e => setDraft(current => current ? { ...current, manualFerias: e.target.checked,
                            ferias1_3: e.target.checked ? (preview.result?.value ?? savedState.ferias1_3) : (current.ferias1_3 > 0 ? 1 : 0) } : current)} />
                    Informar valor manual do adicional
                </label>
                {state.manualFerias && <>
                    <label htmlFor={`${fieldId}-adicional`} className={styles.label}>Valor manual do adicional de férias</label>
                    <input type="text" id={`${fieldId}-adicional`} aria-label="Valor manual do adicional de férias" className={styles.input} data-calculator="true"
                        value={state.ferias1_3 ? state.ferias1_3.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                        onChange={e => update('ferias1_3', parseCurrencyInput(e.target.value))} placeholder="0,00" />
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">O valor manual prevalece sobre a composição, que será preservada para o cálculo automático.</p>
                </>}
            </section>
            {/* Seção de férias recebidas anteriormente */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={state.feriasAntecipadas}
                        onChange={e => handleFeriasAntecipadasChange(e.target.checked)}
                        className={styles.checkbox}
                    />
                    Recebido 1/3 de férias em um mês anterior
                </label>
                <p className="text-label text-neutral-400 mt-1 ml-6">
                    Marque se recebeu o pagamento no contracheque anterior.
                </p>

                {state.feriasAntecipadas && (
                    <div className="mt-3 ml-6 space-y-2">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.feriasDescManual}
                                onChange={e => handleFeriasDescManualChange(e.target.checked)}
                                className={styles.checkbox}
                            />
                            Alterar valor do desconto manualmente
                        </label>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-label text-neutral-500 dark:text-neutral-400">
                                Desconto aplicado
                            </span>
                            <span className={styles.valueDisplay}>
                                {state.feriasDescManual ? formatCurrency(state.feriasDesc) : preview.loading ? 'Calculando…' : preview.error ? 'Indisponível' : formatCurrency(preview.result?.value ?? 0)}
                            </span>
                        </div>
                        {state.feriasDescManual && (
                            <input
                                type="text"
                                id={`${fieldId}-desconto`}
                                aria-label="Valor manual do desconto de férias antecipadas"
                                className={styles.input}
                                data-calculator="true"
                                value={state.feriasDesc ? state.feriasDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => update('feriasDesc', parseCurrencyInput(e.target.value))}
                                placeholder="0,00"
                            />
                        )}
                    </div>
                )}
            </div>

            <div role="status" className="text-body-xs text-neutral-600 dark:text-neutral-300">
                {preview.loading ? 'Calculando prévia…' : preview.error ? preview.error : preview.result && <>
                    <p>Adicional: {formatCurrency(preview.result.value)}</p>
                    <p>IR: {formatCurrency(preview.result.irFerias)}</p>
                    <p>Desconto por recebimento anterior: {formatCurrency(preview.result.descontoAntecipacao)}</p>
                </>}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <button type="button" className={actionClass} onClick={() => closeEditor(false)}>Cancelar</button>
                <button type="button" className={`${actionClass} bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900`} onClick={() => closeEditor(true)}>Aplicar ajustes</button>
            </div>
            </section>}
        </div>
    );
};
