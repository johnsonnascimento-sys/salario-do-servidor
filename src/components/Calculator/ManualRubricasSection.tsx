import React, { useEffect, useId, useRef, useState } from 'react';
import { Trash2, Plus, ChevronDown, CheckCircle2 } from 'lucide-react';
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
import { IR_OPTIONS, IR_SUMMARY, TaxAdjustmentPanel, TaxChoices } from './TaxAdjustmentPanel';
import { RubricCardHeading } from './RubricCardHeading';
import { calculatorTargetClass } from './hooks/useCalculatorTargetFocus';

const VPNI_DESCRIPTIONS = ['VPNI — Lei nº 9.527/1997', 'VPNI — decisão judicial'];


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
    editor?: { expandedIds: ReadonlySet<string>; toggle: (id: string) => void };
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
    toPositiveNumber,
    editor
}) => {
    const vpniId = useId();
    const [expandedTaxPanels, setExpandedTaxPanels] = useState<Record<string, boolean>>({});

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
        const needsClassification = rubrica.valor > 0 && (rubrica.incideFunpresp ||
            (rubrica.tipo === 'C' && (funprespParticipacao !== 'nao' || historical)));
        if (needsClassification && (!classifications[rubrica.id] || classifications[rubrica.id] === 'pendente')) reasons.push('natureza');
        if (rubrica.incideFunpresp && (historical || classifications[rubrica.id] === 'facultativa') &&
            (!rubrica.pensionOptionDate || !rubrica.pensionOptionReference || !rubrica.pensionOptionAmountConfirmed)) reasons.push('opcao');
        if (historical && Math.abs((distributed[rubrica.id] ?? 0) - Number(rubrica.valor || 0)) > 0.005) reasons.push('historico');
        if (rubrica.isEA && ((!rubrica.competenciasEA?.length) || (rubrica.tipo === 'D' && !rubrica.fundamentoDeducaoEA?.trim()))) reasons.push('exercicios-anteriores');
        return reasons.map(reason => `${rubrica.id}:${reason}`);
    });
    const pendingSignature = JSON.stringify(pendingSections);
    const pendingIds = new Set(pendingSections.map(key => key.slice(0, key.lastIndexOf(':'))));
    const previousPendingSections = useRef(new Set<string>());
    useEffect(() => {
        const pending: string[] = JSON.parse(pendingSignature);
        const newlyPending = pending.filter(key => !previousPendingSections.current.has(key));
        previousPendingSections.current = new Set(pending);
        if (newlyPending.length === 0) return;
        const ids = new Set(newlyPending.map(key => key.slice(0, key.lastIndexOf(':'))));
        setExpandedTaxPanels(previous => ({ ...previous, ...Object.fromEntries([...ids].map(id => [id, true])) }));
    }, [pendingSignature]);


    const getRubricaLines = (rubrica: Rubrica, index: number): PresetGrossLine[] => {
        const valor = Number(rubrica.valor) || 0;
        if (rubrica.tipo === 'D') {
            return [{ label: 'Total do desconto', value: valor, isDiscount: true }];
        }

        const label = (rubrica.descricao || '').trim() || `Crédito #${index + 1}`;
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
                lines.push({ label: `${label} Líquido`, value: tax.liquido, cardAmount: 'net' });
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

                const taxOpen = expandedTaxPanels[rubrica.id] ?? (!fixedTitle &&
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
                const irRegime = rubrica.isEA ? 'rra' : rubrica.incideIR ? 'mensal' : 'excluir';
                const eaCompetencias = rubrica.isEA && (
                    <IrEaCompetencias
                        compact
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
                            className="h-4 w-4 shrink-0 accent-secondary-800 dark:accent-secondary-400"
                            checked={Boolean(rubrica.incideFunpresp)}
                            disabled={
                                !historical &&
                                ((classification === 'obrigatoria' && Boolean(rubrica.incideFunpresp)) ||
                                    (classification === 'excluida' && !rubrica.incideFunpresp))
                            }
                            onChange={e => updateRubrica(rubrica.id, 'incideFunpresp', e.target.checked)}
                        />
                        <span>{isCredito ? 'Incluir na base da Funpresp' : 'Deduzir da base da Funpresp'}</span>
                    </label>
                );
                const funprespHistory = (
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0 accent-secondary-800 dark:accent-secondary-400"
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
                    (isCredito && rubrica.valor > 0 && (funprespParticipacao !== 'nao' || rubrica.pssCompetenciaSeparada))
                );
                const pssRegime = rubrica.pssCompetenciaSeparada ? 'original' : rubrica.incidePSS ? 'mensal' : 'excluir';
                const pssSummary = pssRegime === 'original' ? 'PSS por competência original' : pssRegime === 'mensal' ? 'PSS mensal' : 'Sem PSS';
                const taxOptions = (
                    <TaxAdjustmentPanel open={Boolean(taxOpen)} summary={`${IR_SUMMARY[irRegime]} · ${pssSummary}`}
                        onToggle={open => setExpandedTaxPanels(previous => previous[rubrica.id] === open
                            ? previous : { ...previous, [rubrica.id]: open })}>
                        <TaxChoices title={isCredito ? 'Imposto de Renda (IR)' : 'Dedução na base do Imposto de Renda (IR)'}
                            name={`manual-tributacao-${rubrica.id}`} value={irRegime}
                            options={IR_OPTIONS} onChange={value => {
                                updateRubrica(rubrica.id, 'isEA', value === 'rra');
                                updateRubrica(rubrica.id, 'incideIR', value === 'mensal');
                                if (isCredito && value === 'rra' && !rubrica.competenciasEA?.length) {
                                    updateRubrica(rubrica.id, 'competenciasEA', [getDefaultEaCompetencia(competenciaReferencia)]);
                                }
                            }} />
                        {eaCompetencias}
                        {!isCredito && rubrica.isEA && (
                            <label className={styles.label}>
                                Fundamento e referência documental da dedução em RRA
                                <input type="text" required className={styles.input}
                                    value={rubrica.fundamentoDeducaoEA ?? ''}
                                    onChange={event => updateRubrica(rubrica.id, 'fundamentoDeducaoEA', event.target.value)} />
                            </label>
                        )}
                        <TaxChoices title={isCredito ? 'Previdência (PSS)' : 'Dedução na base da Previdência (PSS)'}
                            name={`manual-pss-${rubrica.id}`} value={pssRegime}
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
                    </TaxAdjustmentPanel>
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
                                {isCredito ? 'Esta rubrica integra a base compartilhada da Funpresp mensal.' : 'Esta rubrica reduz a base compartilhada da Funpresp mensal.'}
                                {' '}Confira a contribuição no resumo previdenciário.
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
                        <div key={rubrica.id} id={fixedTitle === 'ATS' ? 'vantagem-ats' : `manual-rubrica-${rubrica.id}`} tabIndex={-1}
                            role="group" aria-label={groupedVpni ? `Lançamento de VPNI ${index + 1}` : fixedTitle}
                            className={groupedVpni
                                ? 'min-w-0 space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700 sm:p-4'
                                : `${styles.card} ${calculatorTargetClass} space-y-4`}>
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
                            {taxOptions}
                            <PresetGrossSummary compact lines={lines}>
                                {calculationNotices}
                            </PresetGrossSummary>
                        </div>
                    );
                }

                const cardId = `manual-rubrica-${rubrica.id}`;
                const editorId = `manual-editor-${rubrica.id}`;
                const expanded = !editor || editor.expandedIds.has(cardId);
                const lines = calculationReady ? getRubricaLines(rubrica, index) : [];
                return (
                    <div
                        key={rubrica.id}
                        id={cardId}
                        tabIndex={-1}
                        className={`${editor ? styles.rubricCard : styles.card} ${editor ? 'space-y-2' : 'space-y-3.5'} border-l-4 transition-shadow data-[rubric-highlight]:ring-2 data-[rubric-highlight]:ring-secondary-600 data-[rubric-highlight]:ring-offset-2 ${
                            isCredito
                                ? 'border-l-secondary-500 shadow-xs'
                                : 'border-l-red-500 shadow-xs'
                        }`}
                    >
                        {editor && <RubricCardHeading
                            title={rubrica.descricao.trim() || `${isCredito ? 'Crédito' : 'Desconto'} avulso · ${index + 1}`}
                            discount={!isCredito}
                            amount={rubrica.valor > 0 ? { kind: isCredito ? 'gross' : 'discount', value: rubrica.valor } : undefined}
                            net={lines.find(line => line.cardAmount === 'net')?.value}
                            notice={pendingIds.has(rubrica.id) ? 'Há dados a revisar' : undefined}
                            panelId={editorId} expanded={expanded} onToggle={() => editor.toggle(cardId)}
                        />}
                        <div id={editorId} hidden={!expanded} className={expanded ? 'space-y-3.5' : 'hidden'}>
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
                        {calculationReady ? (
                            <PresetGrossSummary compact lines={lines}>
                                {calculationNotices}
                            </PresetGrossSummary>
                        ) : calculationNotices}
                        </div>
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
                <section id="vantagem-vpni" tabIndex={-1} aria-labelledby={`${vpniId}-titulo`} className={`${styles.card} ${calculatorTargetClass} space-y-4`}>
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
            {calculationReady && pensionMemory && filteredRubricas.some(rubrica =>
                (rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp &&
                    (rubrica.funprespCompetenciaSeparada || funprespParticipacao !== 'nao')))) && (
                <SharedPensionSummary memory={pensionMemory} rubricas={summaryRubrics} />
            )}
        </div>
    );
};
