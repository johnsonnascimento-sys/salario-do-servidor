import { CalculatorCardHeading } from '../CalculatorCardHeading';
import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import type { CalculatorState, CourtConfig } from '../../../types';
import type { LicencaBaseComponent } from '../../../types/licenca';
import { resolveGaactaRule } from '../../../services/agency/engine/modules/gaactaCalculations';
import { formatCurrency } from '../../../utils/calculations';
import { PresetGrossSummary } from '../PresetGrossSummary';
import { toReferenceMonthIndex } from '../referenceDateUtils';

type Mode = 'none' | 'gaacta' | 'licenca';

interface Props {
    state: CalculatorState;
    updateMany: (patch: Partial<CalculatorState>) => void;
    courtConfig: CourtConfig;
    calculationReady: boolean;
    functionValues: Record<string, number>;
    styles: Record<string, string>;
}

const options = [
    { value: 'none', label: 'Nenhuma' },
    { value: 'gaacta', label: 'GAACTA' },
    { value: 'licenca', label: 'Licença Compensatória' }
] as const;

const baseOptions = [
    { license: 'vencimento', gaacta: 'gaactaIncideVencimento', label: 'Vencimento básico' },
    { license: 'gaj', gaacta: 'gaactaIncideGAJ', label: 'Gratificação de Atividade Judiciária (GAJ)' },
    { license: 'funcao', gaacta: 'gaactaIncideFuncao', label: 'Cargo em comissão ou função' },
    { license: 'aqTitulo', gaacta: 'gaactaIncideAQTitulo', label: 'AQ Títulos' },
    { license: 'aqTreino', gaacta: 'gaactaIncideAQTreino', label: 'AQ Treinamento' },
    { license: 'gratificacao', gaacta: 'gaactaIncideGrat', label: 'Gratificação específica (GAE / GAS)' },
    { license: 'vpni', gaacta: null, label: 'VPNI' },
    { license: 'ats', gaacta: null, label: 'Adicional por tempo de serviço (ATS)' }
] as const;

const nonNegative = (value: string) => Math.max(0, Number(value) || 0);
const formatGaactaPercentage = (percentage: number) =>
    percentage.toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 2 });

const jmuLicenseStart = '2025-07';
const jmuGaactaStart = '2026-06';

export function GaactaCompensatoryLeaveCard({ state, updateMany, courtConfig, calculationReady, functionValues, styles }: Props) {
    const id = useId();
    const [licenseSelected, setLicenseSelected] = useState(false);
    const previousDays = useRef(0);
    const [draft, setDraft] = useState<Partial<CalculatorState> | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const customizeRef = useRef<HTMLButtonElement>(null);
    const restoreFocus = useRef(false);
    const editing = draft !== null;

    useLayoutEffect(() => {
        if (editing) headingRef.current?.focus();
        else if (restoreFocus.current) {
            restoreFocus.current = false;
            customizeRef.current?.focus();
        }
    }, [editing]);

    const org = (courtConfig.orgSlug || '').toLowerCase();
    const isJmu = org === 'jmu' || org === 'stm';
    const isCjf = org === 'cjf';
    const gaactaAvailable = Boolean(state.gaactaAtivo || courtConfig.gaactaRules?.enabled || isJmu || org === 'cjf' || org.startsWith('trf'));
    const bothSelected = state.gaactaAtivo && state.licencaDias > 0;
    const mode = bothSelected ? null : state.gaactaAtivo ? 'gaacta' : state.licencaDias > 0 || licenseSelected ? 'licenca' : 'none';
    const month = toReferenceMonthIndex(state.mesRef);
    const competence = month ? `${state.anoRef}-${String(month).padStart(2, '0')}` : '';
    const rule = resolveGaactaRule(courtConfig, competence);
    const licenseDivisor = courtConfig.payrollRules?.monthDayDivisor;
    let validityWarning = '';
    if (competence && mode === 'licenca' && isJmu) {
        if (competence < jmuLicenseStart) {
            validityWarning = 'A Licença Compensatória da Resolução STM nº 376/2025 tem efeitos a partir de julho de 2025.';
        } else if (competence >= jmuGaactaStart) {
            validityWarning = 'Esta competência é posterior ao período da Licença Compensatória na JMU. A GAACTA tem efeitos financeiros a partir de junho de 2026.';
        }
    }
    if (competence && mode === 'gaacta' && !rule) {
        validityWarning = isJmu && competence < jmuGaactaStart
            ? 'A GAACTA tem efeitos financeiros na JMU a partir de junho de 2026.'
            : 'Não há regra de GAACTA cadastrada e vigente para esta competência no órgão selecionado.';
    }
    const licenseDays = state.licencaDias || 0;
    const setLicenseDays = (days: number) => updateMany({ licencaDias: Math.max(0, Math.floor(days)) });
    const hasOvertime = state.heTotal > 0 || state.heQtd50 > 0 || state.heQtd100 > 0 ||
        state.overtimeEntries.some(entry => entry.qtd50 > 0 || entry.qtd100 > 0 || Number(entry.valorBrutoManual) > 0);

    const selectMode = (nextMode: Mode) => {
        if (mode === 'licenca' || bothSelected) previousDays.current = state.licencaDias;
        setLicenseSelected(nextMode === 'licenca');
        updateMany({ gaactaAtivo: nextMode === 'gaacta', licencaDias: nextMode === 'licenca' ? previousDays.current : 0 });
    };

    const form = { ...state, ...draft };
    const edit = (patch: Partial<CalculatorState>) => setDraft(current => ({ ...current, ...patch }));
    const setLicensePart = (key: LicencaBaseComponent, checked: boolean) => edit({
        licencaComposicaoBase: {
            ...form.licencaComposicaoBase,
            parcelas: { ...form.licencaComposicaoBase?.parcelas, [key]: checked }
        }
    });
    const closeEditor = (apply: boolean) => {
        if (apply && draft) updateMany(draft);
        restoreFocus.current = true;
        setDraft(null);
    };
    const creditOptions = state.rubricasExtras.filter(rubrica => rubrica.tipo === 'C');
    const lines = calculationReady ? [
        ...(state.gaactaAtivo ? [
            { label: 'Base apurada da GAACTA', value: state.gaactaBaseCalculo },
            ...(rule ? [{ label: 'Percentual da GAACTA', value: 0, displayValue: formatGaactaPercentage(state.gaactaPercentual || rule.percentage) }] : []),
            { label: 'Total da GAACTA', value: state.gaactaValor }
        ] : []),
        ...(mode === 'licenca' || bothSelected ? [
            { label: 'Dias a indenizar', value: 0, displayValue: String(state.licencaDias) },
            { label: 'Divisor mensal', value: 0, displayValue: String(licenseDivisor ?? '—') },
            { label: 'Abono estimado na base', value: 0, displayValue: state.incluirAbonoLicenca ? 'Incluído' : 'Excluído' },
            { label: 'Total da licença', value: state.licencaValor }
        ] : [])
    ] : [];
    const inputLabel = 'text-body-xs text-neutral-600 dark:text-neutral-300';
    const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 dark:border-neutral-600';

    const baseFunction = mode === 'licenca' && form.baseLicenca !== 'auto' ? form.baseLicenca : state.funcao;
    const baseValues: Partial<Record<LicencaBaseComponent, number>> = calculationReady ? {
        vencimento: state.vencimento,
        gaj: state.gaj,
        funcao: functionValues[baseFunction] ?? 0,
        aqTitulo: state.aqTituloValor,
        aqTreino: state.aqTreinoValor,
        vpni: (state.vpni_lei || 0) + (state.vpni_decisao || 0),
        ats: state.ats
    } : {};
    const modeLabel = mode === 'licenca' ? 'Licença Compensatória' : 'GAACTA';
    const check = (label: string, checked: boolean, onChange: (checked: boolean) => void, value?: number, key = label) => (
        <label key={key} className={styles.checkboxLabel}>
            <input type="checkbox" className={styles.checkbox} checked={checked} onChange={event => onChange(event.target.checked)} />
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="min-w-0 break-words text-body-xs text-neutral-700 dark:text-neutral-300">{label}</span>
                {value !== undefined && <span className="shrink-0 font-mono text-body-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    {formatCurrency(value)}
                </span>}
            </span>
        </label>
    );

    return (
        <section className={`${styles.formSection} space-y-4`} aria-labelledby={`${id}-title`}>
            <CalculatorCardHeading help={{ label: "Cálculo, normas e vigência de GAACTA e Licença Compensatória", content: <>
                <p className="font-semibold">Cálculo, normas e vigência</p>
                <p><strong>GAACTA.</strong> Gratificação por Atuação de Alta Complexidade, Técnica e Administrativa para ocupantes de cargos em comissão nas condições da norma aplicável. {rule
                    ? <>Na competência selecionada, o percentual é de <strong>{formatGaactaPercentage(rule.percentage)} sobre a remuneração</strong>.</>
                    : 'Não há percentual de GAACTA cadastrado e vigente para este órgão na competência selecionada.'}</p>
                <p>Em <strong>Personalizar cálculo</strong>, você pode conferir as parcelas da base da simulação, como vencimento básico, GAJ, cargo em comissão e adicional de qualificação, ou informar uma base manual.</p>
                <p><strong>Licença Compensatória.</strong> A indenização é proporcional aos dias informados. A simulação usa <strong>base selecionada ÷ divisor mensal{licenseDivisor ? ` (${licenseDivisor})` : ''} × dias a indenizar</strong>. A base é composta pelas parcelas marcadas em <strong>Personalizar cálculo</strong>, com abono de permanência estimado se essa opção estiver marcada.</p>
                {isJmu ? <>
                    <p>A Resolução STM nº 376, de 6 de agosto de 2025, produziu efeitos a partir de 1º de julho de 2025.</p>
                    <p>A Resolução STM nº 397, de 19 de junho de 2026, revogou a Resolução STM nº 376/2025 e instituiu a GAACTA, com efeitos financeiros a partir de 1º de junho de 2026.</p>
                </> : isCjf ? <>
                    <p>A <a className="underline" href="https://www.cjf.jus.br/publico/biblioteca/Res_986-2026.pdf" target="_blank" rel="noopener noreferrer">Resolução CJF nº 986/2026</a> instituiu a GAACTA nas estruturas do Conselho da Justiça Federal, com efeitos financeiros desde 1º de junho de 2026 (art. 7º).</p>
                    <p>O art. 6º revogou a <a className="underline" href="https://www.cjf.jus.br/publico/biblioteca/Res_965-2025.pdf" target="_blank" rel="noopener noreferrer">Resolução CJF nº 965/2025</a>, que disciplinava as funções relevantes singulares e fundamentava a licença compensatória para ocupantes de CJ-2 a CJ-4 no Conselho.</p>
                </> : <p>{rule?.reference || 'A vigência da GAACTA segue a regra cadastrada para o órgão e a competência selecionados.'}</p>}
            </> }}>
                <h4 id={`${id}-title`} className={`${styles.innerBoxTitle} !mb-0`}>GAACTA / Licença Compensatória</h4>
            </CalculatorCardHeading>
            {validityWarning && <div role="status" className="flex items-start gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-body-xs text-warning-800 dark:border-warning-800 dark:bg-warning-950/30 dark:text-warning-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{validityWarning}</p>
            </div>}

            {!editing ? <>
                <fieldset>
                    <legend className="sr-only">Escolha entre GAACTA e Licença Compensatória</legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {options.filter(option => option.value !== 'gaacta' || gaactaAvailable).map(option => (
                            <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-body font-medium ${mode === option.value ? 'border-neutral-600 bg-neutral-100 text-neutral-900 dark:border-neutral-400 dark:bg-neutral-700 dark:text-neutral-100' : 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200'}`}>
                                <input type="radio" name={`${id}-modalidade`} value={option.value} checked={mode === option.value}
                                    className="accent-neutral-700 dark:accent-neutral-300" onChange={() => selectMode(option.value)} />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                {bothSelected && <p className={inputLabel}>Esta simulação salva contém as duas rubricas. Selecione a que deseja manter.</p>}
                {mode === 'licenca' && <div className="max-w-xs">
                    <label htmlFor={`${id}-dias`} className={styles.label}>Dias a indenizar</label>
                    <div className="flex items-center gap-2">
                        <button type="button" aria-label="Diminuir dias a indenizar" disabled={licenseDays <= 0}
                            className={`${button} w-11 shrink-0 px-0 disabled:opacity-40`} onClick={() => setLicenseDays(licenseDays - 1)}>
                            <Minus size={16} aria-hidden="true" />
                        </button>
                        <input id={`${id}-dias`} type="number" min="0" step="1" inputMode="numeric" value={licenseDays || ''} placeholder="0"
                            className={`${styles.input} min-w-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                            onChange={event => setLicenseDays(nonNegative(event.target.value))} />
                        <button type="button" aria-label="Aumentar dias a indenizar"
                            className={`${button} w-11 shrink-0 px-0`} onClick={() => setLicenseDays(licenseDays + 1)}>
                            <Plus size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>}
                {mode === 'gaacta' && hasOvertime && !state.gaactaRecesso && <p role="status" className="text-body-xs font-semibold text-error-700 dark:text-error-300">
                    A GAACTA e as horas extras só podem ser acumuladas no recesso judiciário.
                </p>}
                {mode && mode !== 'none' && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                    <p className="text-body font-semibold">{calculationReady ? formatCurrency(mode === 'gaacta' ? state.gaactaValor : state.licencaValor) : 'Total aguardando cálculo'}</p>
                    <button type="button" ref={customizeRef} className={button} onClick={() => setDraft({})}>
                        <SlidersHorizontal size={16} aria-hidden="true" /> Personalizar cálculo
                    </button>
                </div>}
                <PresetGrossSummary compact lines={lines}>
                    {mode === 'licenca' && <p className={inputLabel}>
                        O cálculo divide a base selecionada pelo divisor mensal e multiplica o resultado pelos dias a indenizar.
                    </p>}
                </PresetGrossSummary>
            </> : <section className="space-y-6" aria-labelledby={`${id}-customize`}>
                <h5 id={`${id}-customize`} ref={headingRef} tabIndex={-1} className="text-lg font-semibold focus-visible:outline focus-visible:outline-2">
                    Personalizar {modeLabel}
                </h5>
                <section className="space-y-3" aria-labelledby={`${id}-composition`}>
                    <h6 id={`${id}-composition`} className="text-body font-semibold">Composição da base ({modeLabel})</h6>
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">A base é dinâmica. Os créditos que você adicionar em outras páginas podem influenciar o cálculo conforme as parcelas selecionadas aqui.</p>
                    {mode === 'licenca' && <p className="text-body-xs text-neutral-500 dark:text-neutral-400">Marque os créditos avulsos que deseja incluir na base da licença para esta simulação.</p>}
                    {mode === 'gaacta' && check('Informar valor fixo para a base', form.gaactaManualBase, checked => edit({ gaactaManualBase: checked }))}
                    {mode === 'gaacta' && form.gaactaManualBase ? <div>
                        <label htmlFor={`${id}-base-manual`} className={styles.label}>Base manual (R$)</label>
                        <input id={`${id}-base-manual`} type="number" min="0" step="0.01" className={styles.input}
                            value={form.gaactaBaseManualValor || ''} onChange={event => edit({ gaactaBaseManualValor: nonNegative(event.target.value) })} />
                    </div> : <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 [&>label]:py-3">
                        {baseOptions.map(({ license, gaacta, label }) => {
                            if (mode === 'licenca') return check(label, form.licencaComposicaoBase?.parcelas?.[license] !== false,
                                checked => setLicensePart(license, checked), baseValues[license], license);
                            if (!gaacta) return null;
                            const checked = gaacta === 'gaactaIncideGrat' ? form[gaacta] === true : form[gaacta] !== false;
                            return check(label, checked, value => edit({ [gaacta]: value }), baseValues[license], license);
                        })}
                        {mode === 'licenca' ? check('Incluir abono estimado', form.incluirAbonoLicenca, checked => edit({ incluirAbonoLicenca: checked }))
                            : check('Abono de permanência, quando ativo', form.gaactaIncideAbono, checked => edit({ gaactaIncideAbono: checked }),
                                calculationReady && state.recebeAbono ? state.abonoPermanencia : undefined)}
                        {creditOptions.map((rubrica, index) => {
                            const selected = mode === 'licenca' ? form.licencaComposicaoBase?.rubricas?.[rubrica.id] === true
                                : form.gaactaRubricasInclusas?.[rubrica.id] !== false;
                            return check(rubrica.descricao.trim() || `Crédito avulso ${index + 1}`, selected, checked => {
                                if (mode === 'licenca') edit({ licencaComposicaoBase: {
                                    ...form.licencaComposicaoBase,
                                    rubricas: { ...form.licencaComposicaoBase?.rubricas, [rubrica.id]: checked }
                                } });
                                else edit({ gaactaRubricasInclusas: { ...form.gaactaRubricasInclusas, [rubrica.id]: checked } });
                            }, rubrica.valor, `credit-${rubrica.id}`);
                        })}
                    </div>}
                    {mode === 'licenca' && form.licencaComposicaoBase?.parcelas?.funcao !== false && <div>
                        <label htmlFor={`${id}-funcao`} className={styles.label}>Função usada na base</label>
                        <select id={`${id}-funcao`} className={styles.input} value={form.baseLicenca}
                            onChange={event => edit({ baseLicenca: event.target.value })}>
                            <option value="auto">Função dos dados principais</option>
                            {Object.keys(functionValues).map(key => <option key={key} value={key}>{key.toUpperCase()}</option>)}
                        </select>
                    </div>}
                    {mode === 'gaacta' && !form.gaactaManualBase && <div className="flex flex-col justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700 sm:flex-row sm:items-center">
                        <label htmlFor={`${id}-ajustes`} className={inputLabel}>Outras parcelas da base</label>
                        <div className="relative w-full sm:w-44">
                            <span className="absolute left-3 top-2.5 font-mono text-body-xs text-neutral-500" aria-hidden="true">R$</span>
                            <input id={`${id}-ajustes`} type="number" min="0" step="0.01"
                                className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`} placeholder="0,00"
                                value={form.gaactaOutrasParcelas || ''} onChange={event => edit({ gaactaOutrasParcelas: nonNegative(event.target.value) })} />
                        </div>
                    </div>}
                </section>
                {mode === 'gaacta' && (hasOvertime || form.gaactaRecesso) && <div className="space-y-2">
                    <p className={inputLabel}>A GAACTA e as horas extras só podem ser acumuladas no recesso judiciário.</p>
                    {check('Período de recesso judiciário', form.gaactaRecesso, checked => edit({ gaactaRecesso: checked }))}
                </div>}
                <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                    <button type="button" className={button} onClick={() => closeEditor(false)}>Cancelar</button>
                    <button type="button" className={`${button} bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900`}
                        onClick={() => closeEditor(true)}>Aplicar ajustes</button>
                </div>
            </section>}
        </section>
    );
}
