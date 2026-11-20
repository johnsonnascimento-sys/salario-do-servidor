import React, { useMemo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface PensaoAlimenticiaCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    courtConfig?: CourtConfig;
    competenciaReferencia?: string;
    calculationReady: boolean;
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100;
const pensionCompositionFields = [
    'pensaoIncideVencimento', 'pensaoIncideGAJ', 'pensaoIncideFuncao', 'pensaoIncideAQTitulo',
    'pensaoIncideAQTreino', 'pensaoIncideGrat', 'pensaoIncideGAACTA', 'pensaoGAACTAEscolhaExplicita',
    'pensaoIncideVPNI', 'pensaoIncideATS', 'pensaoIncideAbono', 'pensaoIncide13', 'pensaoIncideFerias',
    'pensaoIncideHoraExtra', 'pensaoIncideSubstituicao', 'pensaoRubricasCreditoInclusas',
    'pensaoOutrasParcelas', 'pensaoDeduzirIRRF', 'pensaoDeduzirPSS', 'pensaoDeduzirFunpresp',
    'pensaoRubricasDescontoInclusas', 'pensaoOutrosDescontosDedutiveis'
] as const satisfies readonly (keyof CalculatorState)[];
type CompositionField = typeof pensionCompositionFields[number];
type CompositionDraft = Partial<Pick<CalculatorState, CompositionField>>;
type ManualSelection = 'pensaoRubricasCreditoInclusas' | 'pensaoRubricasDescontoInclusas';
type ManualAmount = 'pensaoOutrasParcelas' | 'pensaoOutrosDescontosDedutiveis';
type IncidenceField = Exclude<CompositionField, ManualSelection | ManualAmount>;

const amountModes = [
    { value: 'percentual', label: 'Percentual' },
    { value: 'fixo', label: 'Valor fixo' }
] as const;
const percentageShortcuts = [15, 20, 25, 30, 33.33, 50];
const secondaryButton = 'min-h-11 rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-600';
const checkboxList = 'flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 [&>label]:py-3';
const sectionHeading = 'mb-1 text-body font-semibold text-neutral-900 dark:text-neutral-100';
const hint = 'text-body-xs text-neutral-500 dark:text-neutral-400';

export const PensaoAlimenticiaCard: React.FC<PensaoAlimenticiaCardProps> = ({
    state,
    update: saveField,
    styles,
    courtConfig,
    calculationReady
}) => {
    const fieldId = React.useId();
    const [draft, setDraft] = useState<CompositionDraft | null>(null);
    const editorButtonRef = useRef<HTMLButtonElement>(null);
    const editorHeadingRef = useRef<HTMLHeadingElement>(null);
    const restoreFocus = useRef(false);
    const isEditing = draft !== null;

    const closeEditor = (apply: boolean) => {
        if (apply && draft) {
            pensionCompositionFields.forEach(field => {
                if (draft[field] !== undefined && draft[field] !== state[field]) saveField(field, draft[field]);
            });
        }
        restoreFocus.current = true;
        setDraft(null);
    };
    useLayoutEffect(() => {
        if (isEditing) {
            editorHeadingRef.current?.focus({ preventScroll: true });
            editorHeadingRef.current?.scrollIntoView({ block: 'nearest' });
        } else if (restoreFocus.current) {
            restoreFocus.current = false;
            editorButtonRef.current?.focus();
        }
    }, [isEditing]);
    const noFunctionCode = courtConfig?.careerCatalog?.noFunctionCode;
    const funcaoValorBruta = useMemo(() => {
        if (!state.funcao || state.funcao === noFunctionCode || !courtConfig?.bases?.funcoes) {
            return 0;
        }
        return courtConfig.bases.funcoes[state.funcao] || 0;
    }, [state.funcao, noFunctionCode, courtConfig]);

    const temAbonoAtivo = Boolean(state.recebeAbono);
    const valorAbono = temAbonoAtivo
        ? (Number(state.abonoPermanencia) || Number(state.pssMensal) || 0)
        : 0;

    const valor13 = Math.max(
        0,
        Number(state.gratNatalinaTotal) ||
            (Number(state.adiant13Venc || 0) +
                Number(state.adiant13FC || 0) +
                Number(state.segunda13Venc || 0) +
                Number(state.segunda13FC || 0))
    );
    const valorFerias = Math.max(0, Number(state.ferias1_3) || 0);
    const valorHoraExtra = Math.max(0, Number(state.heTotal) || 0);
    const valorSubstituicao = Math.max(0, Number(state.substTotal) || 0);
    const valorGAACTA = state.gaactaAtivo ? Math.max(0, Number(state.gaactaValor) || 0) : 0;

    const creditRubricas = useMemo(() => {
        return (state.rubricasExtras || []).filter(r => r.tipo === 'C');
    }, [state.rubricasExtras]);

    const debitRubricas = useMemo(() => {
        return (state.rubricasExtras || []).filter(r => r.tipo === 'D');
    }, [state.rubricasExtras]);

    // Deduções oficiais da folha
    const valorIRRF = Number(state.irMensal) || 0;
    const valorPSS = Number(state.pssMensal) || 0;
    const valorFunpresp = Number(state.valFunpresp) || 0;

    // Modo de cálculo: percentual ou fixo
    const tipo = state.pensaoTipo || 'percentual';
    const percentual = state.pensaoPercentual ?? 30;

    // Incidências de Crédito (default true)
    const incideVenc = state.pensaoIncideVencimento !== false;
    const incideGAJ = state.pensaoIncideGAJ !== false;
    const incideFuncao = state.pensaoIncideFuncao !== false;
    const incideAQTitulo = state.pensaoIncideAQTitulo !== false;
    const incideAQTreino = state.pensaoIncideAQTreino !== false;
    const incideGrat = state.pensaoIncideGrat !== false;
    const incideGAACTA = state.pensaoGAACTAEscolhaExplicita === true && state.pensaoIncideGAACTA === true;
    const incideVPNI = state.pensaoIncideVPNI !== false;
    const incideATS = state.pensaoIncideATS !== false;
    const incideAbono = state.pensaoIncideAbono !== false;
    const incide13 = state.pensaoIncide13 !== false;
    const incideFerias = state.pensaoIncideFerias !== false;
    const incideHoraExtra = state.pensaoIncideHoraExtra !== false;
    const incideSubstituicao = state.pensaoIncideSubstituicao !== false;

    // Deduções da Base (default true para IR e PSS)
    const deduzirIRRF = state.pensaoDeduzirIRRF !== false;
    const deduzirPSS = state.pensaoDeduzirPSS !== false;
    const deduzirFunpresp = Boolean(state.pensaoDeduzirFunpresp);

    // Cálculo da Base Bruta
    const totalBaseBruta = useMemo(() => {
        let total = 0;
        if (incideVenc) total += (state.vencimento || 0);
        if (incideGAJ) total += (state.gaj || 0);
        if (incideFuncao) total += funcaoValorBruta;
        if (incideAQTitulo) total += (state.aqTituloValor || 0);
        if (incideAQTreino) total += (state.aqTreinoValor || 0);
        if (incideGrat) total += (state.gratEspecificaValor || 0);
        if (incideGAACTA && valorGAACTA > 0) total += valorGAACTA;
        if (incideVPNI) total += (state.vpni_lei || 0) + (state.vpni_decisao || 0);
        if (incideATS) total += (state.ats || 0);
        if (incideAbono && temAbonoAtivo) total += valorAbono;
        if (incide13 && valor13 > 0) total += valor13;
        if (incideFerias && valorFerias > 0) total += valorFerias;
        if (incideHoraExtra && valorHoraExtra > 0) total += valorHoraExtra;
        if (incideSubstituicao && valorSubstituicao > 0) total += valorSubstituicao;

        if (state.pensaoRubricasCreditoInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'C' && state.pensaoRubricasCreditoInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.pensaoOutrasParcelas && state.pensaoOutrasParcelas > 0) {
            total += state.pensaoOutrasParcelas;
        }

        return roundCurrency(total);
    }, [
        incideVenc, incideGAJ, incideFuncao, funcaoValorBruta, incideAQTitulo, incideAQTreino,
        incideGrat, incideGAACTA, valorGAACTA, incideVPNI, incideATS, incideAbono, temAbonoAtivo,
        valorAbono, incide13, valor13, incideFerias, valorFerias, incideHoraExtra, valorHoraExtra,
        incideSubstituicao, valorSubstituicao, state.vencimento, state.gaj, state.aqTituloValor,
        state.aqTreinoValor, state.gratEspecificaValor, state.vpni_lei, state.vpni_decisao,
        state.ats, state.pensaoRubricasCreditoInclusas, state.rubricasExtras, state.pensaoOutrasParcelas
    ]);

    // Cálculo das Deduções da Base (Abatimentos da base para cálculo sobre o valor líquido)
    const totalDeducoes = useMemo(() => {
        let total = 0;
        if (deduzirIRRF) total += valorIRRF;
        if (deduzirPSS) total += valorPSS;
        if (deduzirFunpresp) total += valorFunpresp;

        if (state.pensaoRubricasDescontoInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'D' && state.pensaoRubricasDescontoInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.pensaoOutrosDescontosDedutiveis && state.pensaoOutrosDescontosDedutiveis > 0) {
            total += state.pensaoOutrosDescontosDedutiveis;
        }

        return roundCurrency(total);
    }, [
        deduzirIRRF, valorIRRF, deduzirPSS, valorPSS, deduzirFunpresp, valorFunpresp,
        state.pensaoRubricasDescontoInclusas, state.rubricasExtras, state.pensaoOutrosDescontosDedutiveis
    ]);

    const baseLiquida = Math.max(0, roundCurrency(totalBaseBruta - totalDeducoes));

    const valorCalculado = useMemo(() => {
        if (tipo === 'fixo') {
            return Math.max(0, Number(state.pensaoValorFixo) || 0);
        }
        return roundCurrency(baseLiquida * (percentual / 100));
    }, [tipo, state.pensaoValorFixo, baseLiquida, percentual]);

    // Sincroniza os totais e o valor de pensão no estado da calculadora
    useEffect(() => {
        if (!calculationReady) return;
        if (state.pensao !== valorCalculado) {
            saveField('pensao', valorCalculado);
        }
        if (state.pensaoBaseBruta !== totalBaseBruta) {
            saveField('pensaoBaseBruta', totalBaseBruta);
        }
        if (state.pensaoTotalDeducoes !== totalDeducoes) {
            saveField('pensaoTotalDeducoes', totalDeducoes);
        }
        if (state.pensaoBaseCalculo !== baseLiquida) {
            saveField('pensaoBaseCalculo', baseLiquida);
        }
    }, [calculationReady, valorCalculado, totalBaseBruta, totalDeducoes, baseLiquida, state.pensao, state.pensaoBaseBruta, state.pensaoTotalDeducoes, state.pensaoBaseCalculo, saveField]);

    const checkboxRow = (
        key: string,
        label: string,
        value: number,
        checked: boolean,
        setChecked: (checked: boolean) => void
    ) => (
        <label key={key} className={styles.checkboxLabel}>
            <input
                type="checkbox"
                className={styles.checkbox}
                checked={checked}
                onChange={event => setChecked(event.target.checked)}
            />
            <span className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-3 gap-y-1 text-body-xs">
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{label}</span>
                <span className="ml-auto shrink-0 text-right font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                    {calculationReady ? formatCurrency(value) : '—'}
                </span>
            </span>
        </label>
    );

    const incidenceRow = (field: IncidenceField, label: string, value: number, applied: boolean) =>
        checkboxRow(field, label, value, draft?.[field] ?? applied, checked => {
            setDraft(current => current && {
                ...current,
                ...(field === 'pensaoIncideGAACTA' ? { pensaoGAACTAEscolhaExplicita: true } : {}),
                [field]: checked
            });
        });

    const manualRows = (rubricas: typeof creditRubricas, field: ManualSelection, fallbackLabel: string) =>
        rubricas.map((rubrica, index) => {
            const label = rubrica.descricao.trim() || `${fallbackLabel} #${index + 1}`;
            const selectedRubrics = draft?.[field] ?? state[field];
            return checkboxRow(`rubrica-${rubrica.id}`, label, rubrica.valor || 0, Boolean(selectedRubrics?.[rubrica.id]), checked => {
                setDraft(current => current && {
                    ...current,
                    [field]: { ...(current[field] ?? state[field]), [rubrica.id]: checked }
                });
            });
        });

    const manualAmount = (field: ManualAmount, label: string) => (
        <div className="pt-3">
            <label htmlFor={`${fieldId}-${field}`} className={styles.label}>{label}</label>
            <input
                id={`${fieldId}-${field}`}
                type="number"
                min="0"
                step="0.01"
                className={`${styles.input} max-w-xs`}
                value={(draft?.[field] ?? state[field]) || ''}
                onChange={event => {
                    const amount = Math.max(0, parseFloat(event.target.value) || 0);
                    setDraft(current => current && { ...current, [field]: amount });
                }}
                placeholder="0,00"
            />
        </div>
    );

    return (
        <div className="space-y-4">
            {!calculationReady && <p role="status" className={hint}>Atualizando…</p>}
            {isEditing ? (
                <section className="space-y-4" aria-labelledby={`${fieldId}-composition-title`}>
                    <h4
                        ref={editorHeadingRef}
                        tabIndex={-1}
                        id={`${fieldId}-composition-title`}
                        className="text-h5 text-neutral-900 focus-visible:outline focus-visible:outline-2 dark:text-neutral-100"
                    >
                        Composição da base da pensão
                    </h4>

                    <fieldset className="min-w-0">
                        <legend className={sectionHeading}>Créditos</legend>
                        <p className={hint}>Selecione as parcelas incluídas na base conforme a decisão ou o acordo.</p>
                        <div className={checkboxList}>
                            {incidenceRow('pensaoIncideVencimento', 'Vencimento Básico', state.vencimento, incideVenc)}
                            {incidenceRow('pensaoIncideGAJ', 'GAJ (Grat. Atividade Judiciária)', state.gaj, incideGAJ)}
                            {funcaoValorBruta > 0 && incidenceRow('pensaoIncideFuncao', 'Função / Cargo (FC/CJ)', funcaoValorBruta, incideFuncao)}
                            {state.aqTituloValor > 0 && incidenceRow('pensaoIncideAQTitulo', 'AQ Título', state.aqTituloValor, incideAQTitulo)}
                            {state.aqTreinoValor > 0 && incidenceRow('pensaoIncideAQTreino', 'AQ Treinamento', state.aqTreinoValor, incideAQTreino)}
                            {state.gratEspecificaValor > 0 && incidenceRow('pensaoIncideGrat', 'Gratificação Específica (GAE/GAS)', state.gratEspecificaValor, incideGrat)}
                            {valorGAACTA > 0 && incidenceRow('pensaoIncideGAACTA', 'GAACTA (Alta Complexidade)', valorGAACTA, incideGAACTA)}
                            {(state.vpni_lei > 0 || state.vpni_decisao > 0) && incidenceRow('pensaoIncideVPNI', 'VPNI (Quintos/Incorporação)', (state.vpni_lei || 0) + (state.vpni_decisao || 0), incideVPNI)}
                            {state.ats > 0 && incidenceRow('pensaoIncideATS', 'ATS (Anuênios)', state.ats, incideATS)}
                            {temAbonoAtivo && incidenceRow('pensaoIncideAbono', 'Abono de Permanência', valorAbono, incideAbono)}
                            {valorHoraExtra > 0 && incidenceRow('pensaoIncideHoraExtra', 'Horas Extras', valorHoraExtra, incideHoraExtra)}
                            {valorSubstituicao > 0 && incidenceRow('pensaoIncideSubstituicao', 'Substituição de Função', valorSubstituicao, incideSubstituicao)}
                            {manualRows(creditRubricas, 'pensaoRubricasCreditoInclusas', 'Crédito avulso')}
                        </div>
                        {manualAmount('pensaoOutrasParcelas', 'Outras parcelas da base (R$)')}
                    </fieldset>

                    {(valor13 > 0 || valorFerias > 0) && (
                        <fieldset className="min-w-0">
                            <legend className={sectionHeading}>Incidência nas folhas adicionais</legend>
                            <div className={checkboxList}>
                                {valor13 > 0 && incidenceRow('pensaoIncide13', 'Gratificação Natalina (13º)', valor13, incide13)}
                                {valorFerias > 0 && incidenceRow('pensaoIncideFerias', 'Férias (1/3 constitucional)', valorFerias, incideFerias)}
                            </div>
                        </fieldset>
                    )}

                    <fieldset className="min-w-0">
                        <legend className={sectionHeading}>Abatimentos</legend>
                        <p className={hint}>
                            Descontos avulsos adicionados na etapa Descontos, como Plano de Saúde, aparecem aqui.
                            Marque os que devem ser abatidos da base da pensão.
                        </p>
                        <div className={checkboxList}>
                            {incidenceRow('pensaoDeduzirIRRF', 'Imposto de Renda (IRRF Mensal)', valorIRRF, deduzirIRRF)}
                            {incidenceRow('pensaoDeduzirPSS', 'Previdência Oficial (PSS Mensal)', valorPSS, deduzirPSS)}
                            {valorFunpresp > 0 && incidenceRow('pensaoDeduzirFunpresp', 'Previdência Complementar (Funpresp)', valorFunpresp, deduzirFunpresp)}
                            {manualRows(debitRubricas, 'pensaoRubricasDescontoInclusas', 'Desconto avulso')}
                        </div>
                        {manualAmount('pensaoOutrosDescontosDedutiveis', 'Outros abatimentos da base (R$)')}
                    </fieldset>

                    <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                        <button type="button" className={secondaryButton} onClick={() => closeEditor(false)}>Cancelar</button>
                        <button
                            type="button"
                            className="min-h-11 rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white dark:bg-neutral-200 dark:text-neutral-900"
                            onClick={() => closeEditor(true)}
                        >
                            Aplicar ajustes
                        </button>
                    </div>
                </section>
            ) : (
                <>
                    <fieldset className="min-w-0">
                        <legend className={styles.label}>Modalidade da pensão</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {amountModes.map(option => (
                                <label
                                    key={option.value}
                                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-body-xs font-medium text-neutral-700 has-[:checked]:border-neutral-500 has-[:checked]:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:has-[:checked]:border-neutral-400 dark:has-[:checked]:bg-neutral-800"
                                >
                                    <input
                                        type="radio"
                                        name={`${fieldId}-modalidade`}
                                        value={option.value}
                                        checked={tipo === option.value}
                                        onChange={() => saveField('pensaoTipo', option.value)}
                                        className="h-4 w-4 shrink-0 accent-neutral-700 dark:accent-neutral-300"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {tipo === 'percentual' ? (
                        <>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor={`${fieldId}-pensaoPercentual`} className={styles.label}>Percentual da pensão alimentícia (%)</label>
                                    <input
                                        id={`${fieldId}-pensaoPercentual`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        className={`${styles.input} max-w-xs`}
                                        value={percentual}
                                        onChange={event => saveField('pensaoPercentual', Math.max(0, parseFloat(event.target.value) || 0))}
                                        placeholder="30,00"
                                    />
                                </div>
                                <div role="group" aria-label="Atalhos de percentual" className="flex flex-wrap gap-2">
                                    {percentageShortcuts.map(shortcut => (
                                        <button
                                            key={shortcut}
                                            type="button"
                                            aria-pressed={percentual === shortcut}
                                            className="min-h-11 rounded-lg border border-neutral-200 px-3 text-body-xs font-semibold text-neutral-700 hover:bg-neutral-50 aria-pressed:border-neutral-500 aria-pressed:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900 dark:aria-pressed:border-neutral-400 dark:aria-pressed:bg-neutral-800"
                                            onClick={() => saveField('pensaoPercentual', shortcut)}
                                        >
                                            {shortcut.toLocaleString('pt-BR')}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700">
                                <button
                                    ref={editorButtonRef}
                                    type="button"
                                    className={`${secondaryButton} inline-flex items-center gap-2 text-body font-semibold`}
                                    onClick={() => setDraft({})}
                                >
                                    <SlidersHorizontal size={16} aria-hidden="true" />
                                    Personalizar cálculo
                                </button>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label htmlFor={`${fieldId}-pensaoValorFixo`} className={styles.label}>Valor mensal fixo da pensão alimentícia (R$)</label>
                            <input
                                id={`${fieldId}-pensaoValorFixo`}
                                type="number"
                                step="0.01"
                                min="0"
                                className={`${styles.input} max-w-xs`}
                                value={state.pensaoValorFixo || ''}
                                onChange={event => saveField('pensaoValorFixo', Math.max(0, parseFloat(event.target.value) || 0))}
                                placeholder="0,00"
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
