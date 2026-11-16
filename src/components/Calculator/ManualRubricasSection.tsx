import React, { useEffect, useRef, useState } from 'react';
import {
    DollarSign,
    Minus,
    Plus,
    Trash2,
    SlidersHorizontal,
    ChevronDown,
    ChevronUp,
    CheckCircle2
} from 'lucide-react';
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

interface ManualRubricasSectionProps {
    mode?: 'C' | 'D';
    rubricas: Rubrica[];
    styles: any;
    totalCreditos: number;
    totalDescontos: number;
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
    addRubrica: (payload?: Rubrica['tipo'] | Partial<Rubrica>) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    toPositiveNumber: (value: string) => number;
}

export const ManualRubricasSection: React.FC<ManualRubricasSectionProps> = ({
    mode = 'C',
    rubricas,
    styles,
    totalCreditos,
    totalDescontos,
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
    addRubrica,
    removeRubrica,
    updateRubrica,
    toPositiveNumber
}) => {
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

    return (
        <div className="space-y-4">
            {/* Bloco Central de Controle de Lançamentos Avulsos */}
            <div className={styles.card}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h3 className={`${styles.sectionTitle} mb-1 flex items-center gap-2`}>
                            <DollarSign className="w-4 h-4 text-primary" />
                            {mode === 'C' ? 'Créditos avulsos' : 'Descontos avulsos'}
                        </h3>
                        <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                            {mode === 'C' ? 'Inclua VPNI, ATS, acertos e valores retroativos.' : 'Inclua empréstimos, planos de saúde, pensões e outros descontos.'}
                        </p>
                    </div>

                </div>

                {/* Resumo de Totalizadores e Filtros Rápidos */}
                {filteredRubricas.length > 0 && (
                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div hidden={mode !== 'C'} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 flex items-center justify-between">
                                <div>
                                    <p className="text-label font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Total Créditos Avulsos</p>
                                    <p className="text-body font-bold font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(totalCreditos)}</p>
                                </div>
                                <span className="text-body-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    {rubricas.filter(r => r.tipo === 'C').length} crédito(s)
                                </span>
                            </div>
                            <div hidden={mode !== 'D'} className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 flex items-center justify-between">
                                <div>
                                    <p className="text-label font-bold uppercase tracking-widest text-red-700 dark:text-red-400">Total Descontos Avulsos</p>
                                    <p className="text-body font-bold font-mono text-red-700 dark:text-red-400">{formatCurrency(totalDescontos)}</p>
                                </div>
                                <span className="text-body-xs font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                                    {rubricas.filter(r => r.tipo === 'D').length} desconto(s)
                                </span>
                            </div>
                        </div>

                    </div>
                )}

                {filteredRubricas.length === 0 && (
                    <div className="py-3 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/30 border border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-1">
                        <p className="text-body-xs text-neutral-600 dark:text-neutral-400">
                            Nenhum lançamento avulso adicionado no momento.
                        </p>
                        <p className="text-body-xs text-neutral-500 dark:text-neutral-500">
                            {mode === 'C' ? 'Use Crédito livre para incluir uma verba.' : 'Use Desconto livre para incluir um desconto.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Listagem de Cards de Rubricas Individuais */}
            {filteredRubricas.map((rubrica, index) => {
                const historical = Boolean(
                    rubrica.pssCompetenciaSeparada ||
                    (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada)
                );
                const classification = classifications[rubrica.id];

                const isExpanded = expandedEaCards[rubrica.id] ?? (rubrica.isEA || rubrica.pssCompetenciaSeparada || rubrica.funprespCompetenciaSeparada);
                const isCredito = rubrica.tipo === 'C';

                return (
                    <div
                        key={rubrica.id}
                        id={`manual-rubrica-${rubrica.id}`}
                        tabIndex={-1}
                        className={`${styles.card} space-y-3.5 border-l-4 transition-all ${
                            isCredito
                                ? 'border-l-emerald-500 shadow-xs'
                                : 'border-l-red-500 shadow-xs'
                        }`}
                    >
                        {/* Topo do Card: Badge de Tipo, Integração de Base e Exclusão */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span
                                    className={`px-2.5 py-0.5 rounded-full text-body-xs font-bold ${
                                        isCredito
                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                                    }`}
                                >
                                    {isCredito ? 'Crédito' : 'Desconto'} #{index + 1}
                                </span>

                                {isCredito && (
                                    <span className="inline-flex items-center gap-1 text-body-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
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
                                className="text-neutral-400 hover:text-red-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                aria-label="Remover rubrica"
                                title="Remover este lançamento avulso"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Campos Principais: Tipo, Descrição e Valor */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                                <label htmlFor={`manual-description-${rubrica.id}`} className={styles.label}>Descrição da verba</label>
                                <input
                                    type="text"
                                    id={`manual-description-${rubrica.id}`}
                                    list={`sugestoes-${rubrica.id}`}
                                    className={styles.input}
                                    value={rubrica.descricao}
                                    placeholder={
                                        isCredito
                                            ? 'Ex.: VPNI, ATS, Acerto Retroativo, Diferença Salarial...'
                                            : 'Ex.: Empréstimo Consignado, Plano de Saúde, Coparticipação, Pensão...'
                                    }
                                    onChange={e => updateRubrica(rubrica.id, 'descricao', e.target.value)}
                                />
                                <datalist id={`sugestoes-${rubrica.id}`}>
                                    {isCredito ? (
                                        <>
                                            <option value="VPNI" />
                                            <option value="ATS" />
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
                                            {['VPNI', 'ATS', 'Acerto Retroativo', 'Diferença Salarial'].map(sugestao => (
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
                            </div>
                            <div>
                                <label htmlFor={`manual-value-${rubrica.id}`} className={styles.label}>Valor (R$)</label>
                                <input
                                    id={`manual-value-${rubrica.id}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={styles.input}
                                    value={rubrica.valor || ''}
                                    placeholder="0,00"
                                    onChange={e => updateRubrica(rubrica.id, 'valor', toPositiveNumber(e.target.value))}
                                />
                            </div>
                        </div>

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
                                </div>
                            </div>
                        )}

                        {/* Gaveta de Progressive Disclosure: Opções Tributárias Especiais e EA */}
                        <div className="pt-1">
                            <button
                                type="button"
                                id={`manual-advanced-trigger-${rubrica.id}`}
                                aria-expanded={Boolean(isExpanded)}
                                aria-controls={`manual-advanced-${rubrica.id}`}
                                onClick={() => toggleEaCard(rubrica.id, Boolean(isExpanded))}
                                className="inline-flex items-center gap-1.5 text-body-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors min-h-11 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700"
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
                                    <div className="flex items-center gap-4 flex-wrap">
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

                                        <label className={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                className={styles.checkbox}
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

                                        <label className={styles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                className={styles.checkbox}
                                                checked={Boolean(rubrica.funprespCompetenciaSeparada)}
                                                onChange={e => updateRubrica(rubrica.id, 'funprespCompetenciaSeparada', e.target.checked)}
                                            />
                                            <span>Funpresp por competência original retroativa</span>
                                        </label>
                                    </div>

                                    {rubrica.isEA && (
                                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                            <IrEaCompetencias
                                                tipo="rubrica"
                                                value={rubrica.competenciasEA}
                                                onChange={competencias => updateRubrica(rubrica.id, 'competenciasEA', competencias)}
                                                styles={styles}
                                                competenciaReferencia={competenciaReferencia}
                                            />
                                        </div>
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

                                    <PensionRubricFields
                                        rubrica={rubrica}
                                        competencia={competencia}
                                        config={pensionConfig}
                                        styles={styles}
                                        updateRubrica={updateRubrica}
                                    />
                                </div>
                        </div>

                        {calculationReady && <PresetGrossSummary lines={getRubricaLines(rubrica, index)} />}

                        {(rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada)) && (
                            <div className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                <p>Apuração por competência: {formatCurrency(distributed[rubrica.id] ?? 0)} de {formatCurrency(Number(rubrica.valor) || 0)} distribuídos.</p>
                                {!calculationReady && <p>A distribuição, por si só, não conclui a apuração previdenciária.</p>}
                                <a className="font-semibold underline" href="#pension-retro-form">Apurar por competência</a>
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

                        {rubrica.tipo === 'C' && !calculationReady && (
                            <p role="status" className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                Resumo de descontos e líquido indisponível enquanto o cálculo não for concluído.
                            </p>
                        )}

                        {rubrica.tipo === 'C' && calculationReady && (!rubricasTax?.[rubrica.id] || (rubricasTax[rubrica.id].funpresp > 0)) && (
                            <p role="status" className="text-body-xs text-neutral-600 dark:text-neutral-300">
                                Líquido individual indisponível para esta rubrica. Confira o cálculo atualizado da folha.
                            </p>
                        )}
                    </div>
                );
            })}
            {mode === 'C' && calculationReady && pensionMemory && rubricas.some(rubrica => rubrica.tipo === 'C' &&
                (rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp &&
                    (rubrica.funprespCompetenciaSeparada || funprespParticipacao !== 'nao')))) && (
                <SharedPensionSummary memory={pensionMemory} rubricas={rubricas} />
            )}
        </div>
    );
};
