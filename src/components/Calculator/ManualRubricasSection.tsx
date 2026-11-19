import React, { useEffect, useId, useRef, useState } from 'react';
import { Plus, ChevronDown, CheckCircle2 } from 'lucide-react';
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
import { CalculatorCardHeading } from './CalculatorCardHeading';
import { AtsValueFields } from './AtsValueFields';
import type { getAtsCalculationContext } from '../../services/agency/engine/modules/atsCalculations';
import { RubricCardHeading } from './RubricCardHeading';
import { calculatorTargetClass } from './hooks/useCalculatorTargetFocus';

const VPNI_DESCRIPTIONS = ['VPNI — Lei nº 9.527/1997', 'VPNI — decisão judicial'];

const VPNI_HELP = {
    label: 'Explicação sobre VPNI',
    content: <>
        <p>A VPNI é uma parcela individual da remuneração. Pode decorrer da incorporação de quintos ou décimos de função comissionada, de diferenças de enquadramento ou de decisão judicial. Lance cada parcela separadamente, pelo valor em reais informado no contracheque da competência ou no documento de referência.</p>
        <p><strong>Quintos e décimos.</strong> A Lei nº 6.732/1979 é um antecedente da incorporação. A Lei nº 9.527/1997 extinguiu a incorporação e transformou as parcelas então incorporadas em VPNI. A MP nº 2.225-45/2001 acrescentou o art. 62-A à Lei nº 8.112/1990, que também prevê a conversão em VPNI das incorporações a que se refere. A parcela convertida tem valor nominal em reais, desvinculado da tabela da função.</p>
        <p><strong>Decisão judicial.</strong> A rubrica individualiza o crédito dos beneficiários abrangidos pelo processo, preserva a referência ao título judicial e permite controlar eventual absorção. Enquanto houver fundamento para o pagamento, a Súmula 279 do TCU orienta o pagamento em valor nominal, ressalvado o que dispuser a sentença. O Tema 494 do STF trata da perda de eficácia da sentença que concedeu um percentual quando ele é definitivamente incorporado aos ganhos.</p>
        <p><strong>Absorção no PJU.</strong> O tratamento depende da origem da parcela, da lei e, quando houver, da decisão judicial. O art. 11, parágrafo único, da Lei nº 11.416/2006 protege as VPNIs permanentes nele previstas, inclusive quintos e décimos, contra redução, absorção ou compensação pelos reajustes das parcelas remuneratórias dos anexos da lei.</p>
        <p><strong>VPNI de graduação do Técnico Judiciário.</strong> Use a página Adicional de Qualificação (AQ) para a parcela do art. 15, §§ 5º e 6º, da Lei nº 11.416/2006. A redação dada pela Lei nº 15.292/2025 prevê a transformação da VPNI de graduação em AQ nas situações abrangidas.</p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
            <a className="underline" href="https://www.planalto.gov.br/ccivil_03/leis/1970-1979/l6732.htm" target="_blank" rel="noreferrer">Lei nº 6.732/1979</a>
            <a className="underline" href="https://www.planalto.gov.br/ccivil_03/leis/l9527.htm#art15" target="_blank" rel="noreferrer">Lei nº 9.527/1997, art. 15</a>
            <a className="underline" href="https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm#art62a" target="_blank" rel="noreferrer">Lei nº 8.112/1990, art. 62-A</a>
            <a className="underline" href="https://www2.camara.leg.br/legin/fed/lei/2006/lei-11416-15-dezembro-2006-548306-normaatualizada-pl.html" target="_blank" rel="noreferrer">Lei nº 11.416/2006, arts. 11 e 15</a>
            <a className="underline" href="https://portal.stf.jus.br/processos/detalhe.asp?incidente=2659105" target="_blank" rel="noreferrer">Tema 494 do STF</a>
            <a className="underline" href="https://pesquisa.apps.tcu.gov.br/doc/acordao-completo/2875/2023/Primeira%20C%C3%A2mara" target="_blank" rel="noreferrer">Súmula 279 citada pelo TCU</a>
        </p>
    </>
};

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
    atsContext?: ReturnType<typeof getAtsCalculationContext>;
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
    atsContext,
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
                            role="group" aria-label={groupedVpni ? `Lançamento de VPNI ${index + 1}` : fixedTitle === 'ATS' ? 'Adicional por Tempo de Serviço' : fixedTitle}
                            className={groupedVpni
                                ? 'min-w-0 space-y-3 py-4 first:pt-0 last:pb-0'
                                : `${styles.formSection} ${calculatorTargetClass} space-y-4`}>
                            {groupedVpni ? (
                                <>
                                    <CalculatorCardHeading remove={summaryRubrics.some(saved => saved.id === rubrica.id) ? {
                                        label: `Remover lançamento de VPNI ${index + 1}`,
                                        onClick: () => removeRubrica(rubrica.id)
                                    } : undefined}>
                                        <h4 className="font-semibold">Lançamento de VPNI {index + 1}</h4>
                                    </CalculatorCardHeading>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(7rem,10rem)] sm:items-end">
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
                                    </div>
                                </>
                            ) : (
                                <>
                                    <CalculatorCardHeading help={fixedTitle === 'ATS' ? {
                                        label: 'Explicação sobre Adicional por Tempo de Serviço',
                                        content: <>
                                            <p>O art. 67 da Lei nº 8.112/1990 previa 1% por ano de serviço público efetivo. A Lei nº 9.527/1997 passou a prever 5% a cada cinco anos de serviço público federal efetivo.</p>
                                            <p>A revogação preservou as situações constituídas até 8 de março de 1999. Informe o percentual adquirido conforme o registro funcional. O valor acompanha o vencimento básico do cargo efetivo na competência selecionada.</p>
                                            <p>
                                                <a className="underline" href="https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm" target="_blank" rel="noreferrer">Lei nº 8.112/1990, art. 67</a>
                                                {' · '}
                                                <a className="underline" href="https://www2.camara.leg.br/legin/fed/medpro/2001/medidaprovisoria-2225-45-4-setembro-2001-395990-publicacaooriginal-1-pe.html" target="_blank" rel="noreferrer">MP nº 2.225-45/2001</a>
                                            </p>
                                        </>
                                    } : undefined}>
                                        <h3 className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">
                                            {fixedTitle === 'ATS' ? 'Adicional por Tempo de Serviço (ATS)' : fixedTitle}
                                        </h3>
                                    </CalculatorCardHeading>
                                    {fixedTitle === 'ATS' && atsContext
                                        ? <AtsValueFields id={rubrica.id} percentual={rubrica.atsPercentual}
                                            context={atsContext} onChange={percentual => updateRubrica(rubrica.id, 'atsPercentual', percentual)}
                                            fixedValueField={valueField} styles={styles} />
                                        : valueField}
                                </>
                            )}
                            {taxOptions}
                            <PresetGrossSummary compact lines={lines}>
                                {calculationNotices}
                            </PresetGrossSummary>
                        </div>
                    );
                }

                const title = rubrica.descricao.trim() || `${isCredito ? 'Crédito' : 'Desconto'} avulso · ${index + 1}`;
                const remove = { label: `Remover ${title}`, onClick: () => removeRubrica(rubrica.id) };
                const cardId = `manual-rubrica-${rubrica.id}`;
                const editorId = `manual-editor-${rubrica.id}`;
                const expanded = !editor || editor.expandedIds.has(cardId);
                const lines = calculationReady ? getRubricaLines(rubrica, index) : [];
                return (
                    <div
                        key={rubrica.id}
                        id={cardId}
                        tabIndex={-1}
                        className={`${editor ? styles.statementRow : `${styles.card} space-y-3.5`} transition-shadow data-[rubric-highlight]:ring-2 data-[rubric-highlight]:ring-secondary-600 data-[rubric-highlight]:ring-offset-2`}
                    >
                        {editor ? <RubricCardHeading
                            title={title} remove={remove}
                            discount={!isCredito}
                            amount={rubrica.valor > 0 ? { kind: isCredito ? 'gross' : 'discount', value: rubrica.valor } : undefined}
                            net={lines.find(line => line.cardAmount === 'net')?.value}
                            notice={pendingIds.has(rubrica.id) ? 'Há dados a revisar' : undefined}
                            panelId={editorId} expanded={expanded} onToggle={() => editor.toggle(cardId)}
                        /> : <CalculatorCardHeading remove={remove}>
                            <h4 className="font-semibold">{title}</h4>
                        </CalculatorCardHeading>}
                        <div id={editorId} hidden={!expanded} className={expanded ? `space-y-3.5 ${editor ? styles.statementEditor : ''}` : 'hidden'}>
                        {/* Indicadores de incidência do lançamento */}
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
        <div className={editor ? undefined : fixedTitles ? 'space-y-5' : 'space-y-4'}>
            {addVpni && (
                <section id="vantagem-vpni" tabIndex={-1} aria-labelledby={`${vpniId}-titulo`} className={`${styles.formSection} ${calculatorTargetClass} space-y-4`}>
                    <CalculatorCardHeading help={VPNI_HELP}>
                        <h3 id={`${vpniId}-titulo`} className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">Vantagem Pessoal Nominalmente Identificada (VPNI)</h3>
                    </CalculatorCardHeading>
                    <datalist id={`${vpniId}-descricoes`}>
                        {VPNI_DESCRIPTIONS.map(label => <option key={label} value={label} />)}
                    </datalist>
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {renderRubricas(vpniEntries)}
                    </div>
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
