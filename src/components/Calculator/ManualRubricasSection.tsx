import React, { useEffect, useId, useRef, useState } from 'react';
import { Trash2, Plus, SlidersHorizontal, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Rubrica, RubricaTaxDetail, PrevidenciaComplementarConfig } from '../../types';
import { PresetGrossSummary } from './PresetGrossSummary';
import { PresetGrossLine } from './dynamicPayrollForm.helpers';
import { formatCurrency } from '../../utils/calculations';
import type { PensionMemory, PensionParticipation, PensionRetroEntry } from '../../types/pension';
import { getPensionRubricDistribution } from '../../services/agency/engine/modules/pensionPending';
import { SharedPensionSummary } from './SharedPensionSummary';
import { PensionRubricFields } from './PensionRubricFields';
import { resolvePensionRubricRule } from '../../services/agency/engine/modules/pensionCatalog';
import { IrEaCompetencias, getDefaultEaCompetencia } from './IrEaCompetencias';

const VPNI_DESCRIPTIONS = ['VPNI — Lei nº 9.527/1997', 'VPNI — decisão judicial'];

const IR_OPTIONS = [
    { value: 'mensal', label: 'Mensal' },
    { value: 'rra', label: 'Exercícios anteriores (RRA)' },
    { value: 'excluir', label: 'Sem incidência' }
];

const PSS_OPTIONS = [
    { value: 'mensal', label: 'Mensal' },
    { value: 'original', label: 'Competência original' },
    { value: 'excluir', label: 'Sem incidência' }
];

const revisitHistoricalPension = () => {
    if (window.location.hash === '#pension-retro-form') {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
};

function TaxChoices({ title, name, value, options, onChange }: {
    title: string;
    name: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <fieldset className="min-w-0">
            <legend className="mb-2 text-body-xs font-semibold text-neutral-800 dark:text-neutral-200">{title}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {options.map(option => (
                    <label key={option.value}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-body-xs text-neutral-700 has-[:checked]:border-secondary-600 has-[:checked]:bg-secondary-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:has-[:checked]:border-secondary-400 dark:has-[:checked]:bg-secondary-900/40">
                        <input type="radio" name={name} value={option.value} checked={value === option.value}
                            className="h-4 w-4 shrink-0 accent-secondary-800 dark:accent-secondary-400"
                            onChange={() => onChange(option.value)} />
                        {option.label}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

interface ManualRubricasSectionProps {
    mode?: 'C' | 'D';
    rubricas: Rubrica[];
    fixedTitles?: ReadonlyMap<string, string>;
    addVpni?: () => void;
    summaryRubrics?: Rubrica[];
    styles: any;
    rubricasTax?: Record<string, RubricaTaxDetail>;
    calculationReady: boolean;
    funprespParticipacao: PensionParticipation;
    pensionRetroEntries?: PensionRetroEntry[];
    pensionConfig?: PrevidenciaComplementarConfig;
    pensionMemory?: PensionMemory;
    competencia?: string;
    irEaEntryTax?: Record<string, number>;
    irEaCurrentYearKeys?: string[];
    competenciaReferencia?: string;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    toPositiveNumber: (value: string) => number;
}

export const ManualRubricasSection: React.FC<ManualRubricasSectionProps> = ({
    mode = 'C',
    rubricas,
    fixedTitles,
    addVpni,
    summaryRubrics = rubricas,
    styles,
    rubricasTax,
    irEaEntryTax,
    irEaCurrentYearKeys,
    competenciaReferencia,
    calculationReady,
    funprespParticipacao,
    pensionRetroEntries = [],
    pensionConfig,
    pensionMemory,
    competencia = '',
    removeRubrica,
    updateRubrica,
    toPositiveNumber
}) => {
    const vpniId = useId();
    const [expandedEaCards, setExpandedEaCards] = useState<Record<string, boolean>>({});

    const toggleEaCard = (id: string, currentlyExpanded: boolean) => {
        setExpandedEaCards(prev => ({ ...prev, [id]: !currentlyExpanded }));
    };

    const distributed = getPensionRubricDistribution({ pensionRetroEntries });
    const classifications = Object.fromEntries(rubricas.map(rubrica => {
        try {
            return [rubrica.id, resolvePensionRubricRule(pensionConfig, rubrica.pensionRubricId, competencia).classification];
        } catch {
            return [rubrica.id, undefined];
        }
    }));
    const pendingSections = rubricas.flatMap(rubrica => {
        const reasons: string[] = [];
        const historical = Boolean(rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada));
        const needsClassification = rubrica.tipo === 'C' && rubrica.valor > 0 &&
            (funprespParticipacao !== 'nao' || historical || rubrica.incideFunpresp);
        if (needsClassification && (!classifications[rubrica.id] || classifications[rubrica.id] === 'pendente')) reasons.push('natureza');
        if (rubrica.incideFunpresp && (historical || classifications[rubrica.id] === 'facultativa') &&
            (!rubrica.pensionOptionDate || !rubrica.pensionOptionReference || !rubrica.pensionOptionAmountConfirmed)) reasons.push('opcao');
        if (historical && Math.abs((distributed[rubrica.id] ?? 0) - Number(rubrica.valor || 0)) > 0.005) reasons.push('historico');
        if (rubrica.isEA && ((!rubrica.competenciasEA?.length) || (rubrica.tipo === 'D' && !rubrica.fundamentoDeducaoEA?.trim()))) reasons.push('exercicios-anteriores');
        return reasons.map(reason => `${rubrica.id}:${reason}`);
    });
    const pendingSignature = JSON.stringify(pendingSections);
    const previousPendingSections = useRef(new Set<string>());
    useEffect(() => {
        const pending: string[] = JSON.parse(pendingSignature);
        const newlyPending = pending.filter(key => !previousPendingSections.current.has(key));
        previousPendingSections.current = new Set(pending);
        if (newlyPending.length === 0) return;
        const ids = new Set(newlyPending.map(key => key.slice(0, key.lastIndexOf(':'))));
        setExpandedEaCards(previous => ({ ...previous, ...Object.fromEntries([...ids].map(id => [id, true])) }));
    }, [pendingSignature]);


    const getRubricaLines = (rubrica: Rubrica, index: number): PresetGrossLine[] => {
        const valor = Number(rubrica.valor) || 0;
        const fallbackLabel = `${rubrica.tipo === 'C' ? 'Crédito' : 'Desconto'} #${index + 1}`;
        const label = (rubrica.descricao || '').trim() || fallbackLabel;

        if (rubrica.tipo === 'D') {
            return [
                { label: `${label} (Desconto)`, value: valor, isDiscount: true },
                { label: 'Total Desconto', value: valor, isDiscount: true }
            ];
        }

        const tax = calculationReady ? rubricasTax?.[rubrica.id] : undefined;
        const sharedPension = Boolean(
            rubrica.incideFunpresp &&
            (rubrica.funprespCompetenciaSeparada || funprespParticipacao !== 'nao')
        );
        const sharedHistoricalPss = Boolean(rubrica.pssCompetenciaSeparada);
        const lines: PresetGrossLine[] = [
            { label: `${label} Bruto`, value: valor }
        ];

        if (tax) {
            const isRra = rubrica.isEA && !irEaCurrentYearKeys?.includes(`rubrica:${rubrica.id}`);
            const ir = isRra ? (irEaEntryTax?.[`rubrica:${rubrica.id}`] ?? 0) : tax.ir;
            if (ir > 0) {
                const irLabel = isRra ? `Desconto IR-EA (${label})` : `Desconto IR (${label})`;
                lines.push({ label: irLabel, value: ir, isDiscount: true });
                if (!isRra && tax.irMarginal !== undefined && Math.abs(tax.irMarginal - ir) > 0.001) {
                    lines.push({ label: `Acréscimo efetivo no IR da folha (${label})`, value: tax.irMarginal, isDiscount: false });
                }
            }
            if (tax.pss > 0 && !sharedHistoricalPss) {
                lines.push({ label: `Desconto PSS (${label})`, value: tax.pss, isDiscount: true });
            }
            if (!sharedPension && !sharedHistoricalPss && !(tax.funpresp > 0)) {
                lines.push({ label: `${label} Líquido`, value: tax.liquido });
            }
        } else if (calculationReady) {
            lines.push({ label: `${label} Líquido`, value: valor });
        }

        return lines;
    };

    const filteredRubricas = rubricas.filter(rubrica => rubrica.tipo === mode);

    const renderRubricas = (entries: Rubrica[]) => (
        <>
            {entries.map((rubrica, index) => {
                const groupedVpni = Boolean(addVpni && rubrica.vantagemPessoal === 'VPNI');
                const fixedTitle = fixedTitles?.get(rubrica.id);
                const historical = Boolean(
                    rubrica.pssCompetenciaSeparada ||
                    (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada)
                );
                const classification = classifications[rubrica.id];

                const isExpanded = expandedEaCards[rubrica.id] ?? (!fixedTitle &&
                    (rubrica.isEA || rubrica.pssCompetenciaSeparada || rubrica.funprespCompetenciaSeparada));
                const isCredito = rubrica.tipo === 'C';

                const descriptionField = (
                    <div>
                        <label htmlFor={`manual-description-${rubrica.id}`} className={styles.label}>Descrição da verba</label>
                        <input
                            type="text"
                            id={`manual-description-${rubrica.id}`}
                            list={fixedTitle ? undefined : `sugestoes-${rubrica.id}`}
                            className={styles.input}
                            value={rubrica.descricao}
                            placeholder={
                                fixedTitle || (isCredito
                                    ? 'Ex.: Acerto Retroativo, Diferença Salarial...'
                                    : 'Ex.: Empréstimo Consignado, Plano de Saúde, Coparticipação, Pensão...')
                            }
                            onChange={e => updateRubrica(rubrica.id, 'descricao', e.target.value)}
                        />
                        {!fixedTitle && (
                            <>
                                <datalist id={`sugestoes-${rubrica.id}`}>
                                    {isCredito ? (
                                        <>
                                            <option value="Acerto Retroativo (Exercício Anterior)" />
                                            <option value="Diferença Salarial" />
                                            <option value="Restituição / Reposição ao Erário" />
                                            <option value="Ressarcimento de Despesas" />
                                        </>
                                    ) : (
                                        <>
                                            <option value="Empréstimo Consignado" />
                                            <option value="Plano de Saúde (Mensalidade)" />
                                            <option value="Plano de Saúde (Coparticipação)" />
                                            <option value="Pensão Alimentícia Judicial" />
                                            <option value="Mensalidade Sindical / Associação" />
                                            <option value="Previdência Complementar / Privada" />
                                            <option value="Seguro de Vida" />
                                            <option value="Reposição ao Erário / Devolução" />
                                        </>
                                    )}
                                </datalist>
                                <div className="flex items-center gap-1.5 flex-wrap mt-1 text-body-xs text-neutral-400 dark:text-neutral-500">
                                    <span>Sugestões rápidas:</span>
                                    {isCredito ? (
                                        <>
                                            {['Acerto Retroativo', 'Diferença Salarial'].map(sugestao => (
                                                <button
                                                    key={sugestao}
                                                    type="button"
                                                    onClick={() => updateRubrica(rubrica.id, 'descricao', sugestao)}
                                                    className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                                                >
                                                    {sugestao}
                                                </button>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {['Empréstimo Consignado', 'Plano de Saúde', 'Coparticipação', 'Pensão Alimentícia'].map(sugestao => (
                                                <button
                                                    key={sugestao}
                                                    type="button"
                                                    onClick={() => updateRubrica(rubrica.id, 'descricao', sugestao)}
                                                    className="px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                                                >
                                                    {sugestao}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
                const valueField = (
                    <div>
                        <label htmlFor={`manual-value-${rubrica.id}`} className={styles.label}>Valor (R$)</label>
                        <input
                            id={`manual-value-${rubrica.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            className={styles.input}
                            value={rubrica.valor || (fixedTitle ? 0 : '')}
                            placeholder="0,00"
                            onChange={e => updateRubrica(rubrica.id, 'valor', toPositiveNumber(e.target.value))}
                        />
                    </div>
                );
                const monthlyPssField = (
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={rubrica.incidePSS}
                            onChange={e => {
                                const checked = e.target.checked;
                                updateRubrica(rubrica.id, 'incidePSS', checked);
                                if (checked) {
                                    updateRubrica(rubrica.id, 'pssCompetenciaSeparada', false);
                                }
                            }}
                        />
                        <span>Incidir na Previdência (PSS Mensal)</span>
                    </label>
                );
                const irRegime = rubrica.isEA ? 'rra' : rubrica.incideIR ? 'mensal' : 'excluir';
                const irRegimeSummary = rubrica.isEA ? 'IR em RRA' : rubrica.incideIR ? 'IR mensal' : 'Sem IR';
                const eaCompetencias = rubrica.isEA && (
                    <IrEaCompetencias
                        compact={Boolean(fixedTitle)}
                        tipo="rubrica"
                        value={rubrica.competenciasEA}
                        onChange={competencias => updateRubrica(rubrica.id, 'competenciasEA', competencias)}
                        styles={styles}
                        competenciaReferencia={competenciaReferencia}
                    />
                );
                const funprespInclusion = (
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={fixedTitle ? 'h-4 w-4 shrink-0 accent-secondary-800 dark:accent-secondary-400' : styles.checkbox}
                            checked={Boolean(rubrica.incideFunpresp)}
                            disabled={
                                !historical &&
                                ((classification === 'obrigatoria' && Boolean(rubrica.incideFunpresp)) ||
                                    (classification === 'excluida' && !rubrica.incideFunpresp))
                            }
                            onChange={e => updateRubrica(rubrica.id, 'incideFunpresp', e.target.checked)}
                        />
                        <span>Incluir na base da Funpresp</span>
                    </label>
                );
                const funprespHistory = (
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={fixedTitle ? 'h-4 w-4 shrink-0 accent-secondary-800 dark:accent-secondary-400' : styles.checkbox}
                            checked={Boolean(rubrica.funprespCompetenciaSeparada)}
                            onChange={e => updateRubrica(rubrica.id, 'funprespCompetenciaSeparada', e.target.checked)}
                        />
                        <span>Funpresp por competência original retroativa</span>
                    </label>
                );
                const pensionFields = (
                    <PensionRubricFields
                        rubrica={rubrica}
                        competencia={competencia}
                        config={pensionConfig}
                        styles={styles}
                        updateRubrica={updateRubrica}
                    />
                );
                const showFunpresp = Boolean(
                    rubrica.incideFunpresp || rubrica.funprespCompetenciaSeparada || rubrica.pensionRubricId ||
                    rubrica.pensionOptionDate || rubrica.pensionOptionReference || rubrica.pensionOptionAmountConfirmed ||
                    (rubrica.valor > 0 && (funprespParticipacao !== 'nao' || rubrica.pssCompetenciaSeparada))
                );
                const pssRegime = rubrica.pssCompetenciaSeparada ? 'original' : rubrica.incidePSS ? 'mensal' : 'excluir';
                const pssSummary = pssRegime === 'original' ? 'PSS por competência original' : pssRegime === 'mensal' ? 'PSS mensal' : 'Sem PSS';
                const advancedTaxFields = (
                    <>
                        <div className="flex flex-wrap items-center gap-4">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={rubrica.isEA}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        updateRubrica(rubrica.id, 'isEA', checked);
                                        if (checked) {
                                            updateRubrica(rubrica.id, 'incideIR', false);
                                            if (!rubrica.competenciasEA || rubrica.competenciasEA.length === 0) {
                                                updateRubrica(rubrica.id, 'competenciasEA', [getDefaultEaCompetencia(competenciaReferencia)]);
                                            }
                                        }
                                    }}
                                />
                                <span>Incluir na base do IR de Exercício Anterior (IR-EA / RRA)</span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={rubrica.pssCompetenciaSeparada}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        updateRubrica(rubrica.id, 'pssCompetenciaSeparada', checked);
                                        if (checked) {
                                            updateRubrica(rubrica.id, 'incidePSS', false);
                                        }
                                    }}
                                />
                                <span>PSS por competência original retroativa</span>
                            </label>

                            {funprespInclusion}
                            {funprespHistory}
                        </div>

                        {eaCompetencias && (
                            <div className="border-t border-neutral-200 pt-2 dark:border-neutral-700">{eaCompetencias}</div>
                        )}
                        {rubrica.isEA && rubrica.tipo === 'D' && (
                            <label className={styles.label}>
                                Fundamento e referência documental da dedução EA
                                <input
                                    required
                                    className={styles.input}
                                    value={rubrica.fundamentoDeducaoEA ?? ''}
                                    onChange={event => updateRubrica(rubrica.id, 'fundamentoDeducaoEA', event.target.value)}
                                />
                            </label>
                        )}

                        {pensionFields}
                    </>
                );
                const fixedTaxOptions = (
                    <details className="group/tax border-t border-neutral-200 pt-1 dark:border-neutral-700"
                        open={Boolean(isExpanded)}
                        onToggle={event => {
                            const open = event.currentTarget.open;
                            setExpandedEaCards(previous => previous[rubrica.id] === open
                                ? previous : { ...previous, [rubrica.id]: open });
                        }}>
                        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded py-2 text-body text-neutral-700 dark:text-neutral-300 [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700">
                            <span className="inline-flex items-center gap-2 font-semibold">
                                <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                                Ajustar tributação
                            </span>
                            <span className="ml-auto text-right text-body-xs text-neutral-500 dark:text-neutral-400">
                                {irRegimeSummary} · {pssSummary}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 group-open/tax:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="my-2 space-y-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/40 sm:p-4">
                            <TaxChoices title="Imposto de Renda (IR)" name={`manual-tributacao-${rubrica.id}`} value={irRegime}
                                options={IR_OPTIONS} onChange={value => {
                                    updateRubrica(rubrica.id, 'isEA', value === 'rra');
                                    updateRubrica(rubrica.id, 'incideIR', value === 'mensal');
                                    if (value === 'rra' && !rubrica.competenciasEA?.length) {
                                        updateRubrica(rubrica.id, 'competenciasEA', [getDefaultEaCompetencia(competenciaReferencia)]);
                                    }
                                }} />
                            {eaCompetencias}
                            <TaxChoices title="Previdência (PSS)" name={`manual-pss-${rubrica.id}`} value={pssRegime}
                                options={PSS_OPTIONS} onChange={value => {
                                    updateRubrica(rubrica.id, 'incidePSS', value === 'mensal');
                                    if (Boolean(rubrica.pssCompetenciaSeparada) !== (value === 'original')) {
                                        updateRubrica(rubrica.id, 'pssCompetenciaSeparada', value === 'original');
                                    }
                                }} />
                            {pssRegime === 'original' && (
                                <a className="inline-flex min-h-11 items-center text-body-xs font-semibold underline"
                                    href="#pension-retro-form" onClick={revisitHistoricalPension}>
                                    Distribuir PSS por competência original
                                </a>
                            )}
                            <details className="group/funpresp border-t border-neutral-200 dark:border-neutral-700" open={showFunpresp || undefined}>
                                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-body-xs font-semibold [&::-webkit-details-marker]:hidden">
                                    {showFunpresp ? 'Funpresp' : 'Configurar Funpresp'}
                                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 group-open/funpresp:rotate-180" aria-hidden="true" />
                                </summary>
                                <div className="space-y-3">
                                    {pensionFields}
                                    {funprespInclusion}
                                    {(rubrica.incideFunpresp || rubrica.funprespCompetenciaSeparada) && funprespHistory}
                                    {rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada && pssRegime !== 'original' && (
                                        <a className="inline-flex min-h-11 items-center text-body-xs font-semibold underline"
                                            href="#pension-retro-form" onClick={revisitHistoricalPension}>
                                            Distribuir Funpresp por competência original
                                        </a>
                                    )}
                                </div>
                            </details>
                        </div>
                    </details>
                );
                const taxOptions = (
                    <>
                        {/* Incidências Tributárias Básicas (Imediato) */}
                        {isCredito && (
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                                <div className="text-body-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                                    Incidências na folha mensal
                                </div>
                                <div className="flex items-center gap-6 flex-wrap">
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={rubrica.incideIR}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                updateRubrica(rubrica.id, 'incideIR', checked);
                                                if (checked) {
                                                    updateRubrica(rubrica.id, 'isEA', false);
                                                }
                                            }}
                                        />
                                        <span>Incidir no Imposto de Renda (IR Mensal)</span>
                                    </label>
                                    {monthlyPssField}
                                </div>
                            </div>
                        )}

                        {/* Gaveta de Progressive Disclosure: Opções Tributárias Especiais e EA */}
                        {isCredito && <div className="pt-1">
                            <button
                                type="button"
                                id={`manual-advanced-trigger-${rubrica.id}`}
                                aria-expanded={Boolean(isExpanded)}
                                aria-controls={`manual-advanced-${rubrica.id}`}
                                onClick={() => toggleEaCard(rubrica.id, Boolean(isExpanded))}
                                className="inline-flex items-center gap-1.5 text-body-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-secondary transition-colors min-h-11 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span className="text-left">
                                    <span className="block">Opções tributárias e exercícios anteriores (EA)</span>
                                    <span className="mt-1 block font-normal">
                                        {[rubrica.isEA && 'IR de exercícios anteriores', rubrica.pssCompetenciaSeparada && 'PSS por competência original',
                                            rubrica.incideFunpresp && 'Incluída na Funpresp', rubrica.funprespCompetenciaSeparada && 'Funpresp por competência original']
                                            .filter(Boolean).join(' · ') || 'Sem incidências adicionais selecionadas'}
                                    </span>
                                </span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                                <div id={`manual-advanced-${rubrica.id}`} hidden={!isExpanded}
                                    aria-labelledby={`manual-advanced-trigger-${rubrica.id}`} className="mt-2.5 p-3.5 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3 animate-in fade-in duration-150">
                                    {advancedTaxFields}
                                </div>
                        </div>}
                    </>
                );
                const calculationNotices = (
                    <>
                        {(rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada)) && (
                            <div className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                <p>Apuração por competência: {formatCurrency(distributed[rubrica.id] ?? 0)} de {formatCurrency(Number(rubrica.valor) || 0)} distribuídos.</p>
                                {!calculationReady && <p>A distribuição, por si só, não conclui a apuração previdenciária.</p>}
                                {!fixedTitle && <a className="font-semibold underline" href="#pension-retro-form">Apurar por competência</a>}
                            </div>
                        )}

                        {rubrica.incideFunpresp && !rubrica.funprespCompetenciaSeparada && funprespParticipacao !== 'nao' && (
                            <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                Esta rubrica integra a base compartilhada da Funpresp mensal. Confira o desconto no resumo previdenciário.
                            </p>
                        )}

                        {rubrica.tipo === 'C' && (rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp &&
                            (rubrica.funprespCompetenciaSeparada || funprespParticipacao !== 'nao'))) && (
                            <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                Líquido individual não apurado: consulte as contribuições previdenciárias no resumo compartilhado.
                            </p>
                        )}

                        {rubrica.tipo === 'C' && (!fixedTitle || rubrica.valor > 0) && !calculationReady && (
                            <p role="status" className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                Resumo de descontos e líquido indisponível enquanto o cálculo não for concluído.
                            </p>
                        )}

                        {rubrica.tipo === 'C' && (!fixedTitle || rubrica.valor > 0) && calculationReady && (!rubricasTax?.[rubrica.id] || (rubricasTax[rubrica.id].funpresp > 0)) && (
                            <p role="status" className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                Líquido individual indisponível para esta rubrica. Confira o cálculo atualizado da folha.
                            </p>
                        )}
                    </>
                );

                if (fixedTitle) {
                    const lines = calculationReady && rubrica.valor > 0
                        ? getRubricaLines(rubrica, index)
                        : [{ label: `${rubrica.descricao?.trim() || fixedTitle} Bruto`, value: rubrica.valor }];

                    return (
                        <div key={rubrica.id} id={`manual-rubrica-${rubrica.id}`} tabIndex={-1}
                            role={groupedVpni ? 'group' : undefined} aria-label={groupedVpni ? `Lançamento de VPNI ${index + 1}` : undefined}
                            className={groupedVpni
                                ? 'min-w-0 space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700 sm:p-4'
                                : `${styles.card} space-y-4`}>
                            {groupedVpni ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,10rem)_auto] sm:items-end">
                                    <div>
                                        <label htmlFor={`manual-description-${rubrica.id}`} className={styles.label}>Descrição no holerite</label>
                                        <input id={`manual-description-${rubrica.id}`} type="text" list={`${vpniId}-descricoes`}
                                            className={styles.input} value={rubrica.descricao} placeholder="VPNI"
                                            onChange={event => updateRubrica(rubrica.id, 'descricao', event.target.value)}
                                            onBlur={event => {
                                                if (!event.target.value.trim()) updateRubrica(rubrica.id, 'descricao', 'VPNI');
                                            }} />
                                    </div>
                                    {valueField}
                                    {summaryRubrics.some(saved => saved.id === rubrica.id) && (
                                        <button type="button" onClick={() => removeRubrica(rubrica.id)}
                                            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 justify-self-start rounded-lg px-2 text-body-xs text-neutral-600 hover:bg-error-50 hover:text-error-700 dark:text-neutral-300 dark:hover:bg-error-950/30"
                                            aria-label={`Remover lançamento de VPNI ${index + 1}`}>
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            <span className="sm:sr-only">Remover</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">{fixedTitle}</h3>
                                    {valueField}
                                </>
                            )}
                            {fixedTaxOptions}
                            <PresetGrossSummary compact lines={lines}>
                                {calculationNotices}
                            </PresetGrossSummary>
                        </div>
                    );
                }

                return (
                    <div
                        key={rubrica.id}
                        id={`manual-rubrica-${rubrica.id}`}
                        tabIndex={-1}
                        className={`${styles.card} space-y-3.5 border-l-4 transition-all ${
                            isCredito
                                ? 'border-l-secondary-500 shadow-xs'
                                : 'border-l-red-500 shadow-xs'
                        }`}
                    >
                        {/* Topo do Card: Badge de Tipo, Integração de Base e Exclusão */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-body-xs font-bold ${
                                        isCredito
                                            ? 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-400 border border-secondary-500/20'
                                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                                    }`}
                                >
                                    {isCredito ? 'Crédito' : 'Desconto'} #{index + 1}
                                </span>

                                {isCredito && (
                                    <span className="inline-flex items-center gap-1 text-body-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                        <CheckCircle2 className="w-3 h-3 text-secondary-500" />
                                        Disponível para compor bases de HE, GAACTA, Férias, 13º e GAE/GAS
                                    </span>
                                )}

                                {rubrica.isEA && (
                                    <span className="text-body-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                                        Exercício Anterior (EA)
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => removeRubrica(rubrica.id)}
                                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                aria-label="Remover rubrica"
                                title="Remover este lançamento avulso"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">{descriptionField}</div>
                            {valueField}
                        </div>

                        {taxOptions}
                        {calculationReady && <PresetGrossSummary lines={getRubricaLines(rubrica, index)} />}
                        {calculationNotices}
                    </div>
                );
            })}
        </>
    );

    const vpniEntries = addVpni ? filteredRubricas.filter(rubrica => rubrica.vantagemPessoal === 'VPNI') : [];
    const otherEntries = addVpni ? filteredRubricas.filter(rubrica => rubrica.vantagemPessoal !== 'VPNI') : filteredRubricas;
    const vpniTotal = vpniEntries.reduce((total, entry) => total + (Number(entry.valor) || 0), 0);

    return (
        <div className={fixedTitles ? 'space-y-5' : 'space-y-4'}>
            {addVpni && (
                <section aria-labelledby={`${vpniId}-titulo`} className={`${styles.card} space-y-4`}>
                    <h3 id={`${vpniId}-titulo`} className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">VPNI</h3>
                    <datalist id={`${vpniId}-descricoes`}>
                        {VPNI_DESCRIPTIONS.map(label => <option key={label} value={label} />)}
                    </datalist>
                    {renderRubricas(vpniEntries)}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                        <button type="button" onClick={addVpni}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 text-body-xs font-semibold text-secondary-800 hover:bg-neutral-50 dark:border-neutral-700 dark:text-secondary-300 dark:hover:bg-neutral-800">
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Adicionar outra VPNI
                        </button>
                        <div className="flex flex-wrap items-baseline gap-2 text-body-xs font-semibold">
                            <span>Total da VPNI</span>
                            <output aria-label="Total da VPNI" className="font-mono">{formatCurrency(vpniTotal)}</output>
                        </div>
                    </div>
                </section>
            )}
            {renderRubricas(otherEntries)}
            {mode === 'C' && calculationReady && pensionMemory && rubricas.some(rubrica => rubrica.tipo === 'C' &&
                (rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp &&
                    (rubrica.funprespCompetenciaSeparada || funprespParticipacao !== 'nao')))) && (
                <SharedPensionSummary memory={pensionMemory} rubricas={summaryRubrics} />
            )}
        </div>
    );
};
