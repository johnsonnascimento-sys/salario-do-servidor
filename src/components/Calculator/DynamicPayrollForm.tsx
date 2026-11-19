import React, { useEffect, useMemo, useRef, useState } from 'react';
import { mapStateToAgencyParams } from '../../services/agency/adapters/stateToParams';
import { getAtsCalculationContext } from '../../services/agency/engine/modules/atsCalculations';
import type { PensionSelectionContexts } from '../../services/agency/engine/modules/pensionSelectionContext';
import { usePensionSelection } from './hooks/usePensionSelection';
import { GripVertical, X } from 'lucide-react';
import { CalculatorState, CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../types';
import { getTablesForPeriod } from '../../utils/calculations';
import { CalculatorCardHeading } from './CalculatorCardHeading';
import { ManualRubricasSection } from './ManualRubricasSection';
import { DynamicPayrollAQSection } from './DynamicPayrollAQSection';
import { DynamicPayrollBaseSection } from './DynamicPayrollBaseSection';
import { DynamicPayrollTaxSection } from './DynamicPayrollTaxSection';
import { GaactaCompensatoryLeaveCard } from './cards/GaactaCompensatoryLeaveCard';
import { PensionRetroForm } from './PensionRetroForm';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossSummary } from './PresetGrossSummary';
import { PresetControlsSection } from './PresetControlsSection';
import { PresetInstanceCard } from './PresetInstanceCard';
import { useFunprespForm } from './hooks/useFunprespForm';
import { useDynamicPresetInstances } from './hooks/useDynamicPresetInstances';
import { usePayrollFormNormalization } from './hooks/usePayrollFormNormalization';
import { buildPresetGrossLines } from './presetGrossLines';
import type { PresetSearchDestination } from './calculatorSearchIndex';
import { calculatorTargetClass } from './hooks/useCalculatorTargetFocus';
import type { PayslipResultRow } from '../../types/user';
import {
    PresetGrossLine,
    PresetInstance,
    MULTI_INSTANCE_PRESETS,
    PREDEFINED_OPTIONS,
    PRESET_CATALOG,
    PredefinedRubricId,
    toPositiveNumber,
    formatReferenciaMesAno
} from './dynamicPayrollForm.helpers';

interface DynamicPayrollFormProps {
    step: number;
    presetSearchDestination?: PresetSearchDestination | null;
    onSearchFallback?: () => void;
    state: CalculatorState;
    resultRows: PayslipResultRow[];
    inputState?: CalculatorState;
    updateMany: (patch: Partial<CalculatorState>) => void;
    pensionContexts?: PensionSelectionContexts | null;
    preserveRestoredGlobals?: boolean;
    calculationError?: string | null;
    calculationReady?: boolean;
    pensionPending?: boolean;
    update: (field: keyof CalculatorState, value: any) => void;
    updateSubstDays: (key: string, days: number) => void;
    courtConfig: CourtConfig;
    addRubrica: (payload?: Rubrica['tipo'] | Partial<Rubrica>) => string | void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any, fallback?: Rubrica) => void;
    styles: any;
}

const GRATIFICATION_INSTANCE: PresetInstance = { key: 'gratificacao-fixed', presetId: 'gratificacao' };
const ABONO_INSTANCE: PresetInstance = { key: 'abono-fixed', presetId: 'abono' };
const FIXED_BENEFITS: Array<PresetInstance & { title: string }> = [
    { key: 'aux-transporte-fixed', presetId: 'aux_transporte', title: 'Auxílio-transporte' },
    { key: 'pre-escolar-fixed', presetId: 'pre_escolar', title: 'Auxílio pré-escolar' }
];

const PERSONAL_ADVANTAGES = ['VPNI', 'ATS'] as const;

const getPersonalAdvantage = (rubrica: Rubrica): typeof PERSONAL_ADVANTAGES[number] | undefined => {
    if (rubrica.tipo !== 'C') return undefined;
    if (rubrica.vantagemPessoal !== undefined) return rubrica.vantagemPessoal ?? undefined;
    const prefix = rubrica.descricao?.trim().match(/^(VPNI|ATS)\b/i)?.[0].toUpperCase();
    return PERSONAL_ADVANTAGES.find(name => name === prefix);
};

const personalAdvantageDefaults = (name: typeof PERSONAL_ADVANTAGES[number]): Omit<Rubrica, 'id'> => ({
    vantagemPessoal: name,
    descricao: name,
    valor: 0,
    tipo: 'C',
    incideIR: true,
    incidePSS: true,
    isEA: false,
    pssCompetenciaSeparada: false
});

export const DynamicPayrollForm: React.FC<DynamicPayrollFormProps> = ({
    step,
    presetSearchDestination,
    onSearchFallback,
    state,
    resultRows,
    inputState,
    updateMany,
    pensionContexts,
    preserveRestoredGlobals = false,
    calculationError,
    calculationReady = false,
    pensionPending = false,
    update,
    updateSubstDays,
    courtConfig,
    addRubrica,
    removeRubrica,
    updateRubrica,
    styles
}) => {
    const currentTables = getTablesForPeriod(state.periodo, courtConfig);
    const payrollRules = courtConfig.payrollRules;
    const careerCatalog = courtConfig.careerCatalog;
    const noFunctionCode = careerCatalog?.noFunctionCode ?? '';
    const noFunctionLabel = careerCatalog?.noFunctionLabel ?? 'Sem função';
    const cargoOptions = Object.keys(currentTables.salario || {});
    const salaryByCargo = currentTables.salario[state.cargo] || {};
    const padroes = Object.keys(salaryByCargo);
    const baseVencimento = salaryByCargo[state.padrao] || 0;
    const gaj = baseVencimento * (payrollRules?.gajRate ?? 0);
    const isNovoAQ = state.periodo >= 1;
    const functionKeys = Object.keys(currentTables.funcoes || {});
    const pssOptions = Object.keys(courtConfig.historico_pss || {});
    const irOptions = Object.keys(courtConfig.historico_ir || {});
    const previdenciaComplementar = courtConfig.previdenciaComplementar;
    const competenciaReferencia = formatReferenciaMesAno(state.mesRef, state.anoRef);

    const {
        showFunprespSection,
        funprespNormalOptions,
        funprespValidationError,
        funprespAdditionalValidationError
    } = useFunprespForm({
        state,
        update,
        previdenciaComplementar
    });

    const pensionParams = mapStateToAgencyParams(inputState ?? state, '', courtConfig);
    const pensionSelection = usePensionSelection({ params: pensionParams, context: pensionContexts?.monthly ?? null,
        onApply: patch => updateMany(patch as Partial<CalculatorState>), normalize: !pensionPending });

    const transportIndemnityEnabled = Boolean(courtConfig.transportIndemnity?.enabled);

    const {
        enabledPresets,
        movePreset,
        reorderAnnouncement,
        reorderMode,
        setReorderMode,
        draggingPreset,
        includePreset,
        removePreset,
        handlePresetDragStart,
        handlePresetDragOver,
        handlePresetDrop,
        handlePresetDragEnd
    } = useDynamicPresetInstances({
        state,
        initialState: inputState,
        update,
        updateSubstDays,
        functionKeys,
        transportIndemnityEnabled
    });

    const [removedCard, setRemovedCard] = useState<{
        name: string;
        cardId: string;
        presetId?: PredefinedRubricId;
        restore: (current: CalculatorState, instances: PresetInstance[]) => void;
    } | null>(null);
    const undoButton = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (removedCard) undoButton.current?.focus({ preventScroll: true });
    }, [removedCard]);

    const currentInputs = inputState ?? state;
    const periodRevision = useRef(0);
    useEffect(() => {
        periodRevision.current += 1;
    }, [currentInputs.anoRef, currentInputs.mesRef]);

    const removeManualCard = (id: string) => {
        const index = currentInputs.rubricasExtras.findIndex(rubrica => rubrica.id === id);
        if (index < 0) return;
        const rubrica = currentInputs.rubricasExtras[index];
        const revisionOnRemoval = periodRevision.current;
        const linkedEntries = (inputs: CalculatorState) => inputs.pensionRetroEntries?.filter(entry =>
            entry.vinculos?.some(link => link.rubricaId === id)) ?? [];
        const originalLinks = linkedEntries(currentInputs);
        removeRubrica(id);
        setRemovedCard({
            name: rubrica.descricao.trim() || (rubrica.tipo === 'C' ? 'Crédito avulso' : 'Desconto avulso'),
            cardId: `manual-rubrica-${id}`,
            restore: current => {
                const rows = current.rubricasExtras;
                if (rows.some(row => row.id === id)) return;
                const links = linkedEntries(current);
                const confirmationStale = periodRevision.current !== revisionOnRemoval ||
                    links.length !== originalLinks.length || links.some((entry, i) => entry !== originalLinks[i]);
                const restored = rubrica.pensionOptionAmountConfirmed && confirmationStale
                    ? { ...rubrica, pensionOptionAmountConfirmed: false } : rubrica;
                updateMany({ rubricasExtras: [...rows.slice(0, index), restored, ...rows.slice(index)] });
            }
        });
    };
    const removePresetCard = (instance: PresetInstance) => {
        const restore = removePreset(instance);
        if (!restore) return;
        const name = PRESET_CATALOG.find(item => item.id === instance.presetId)?.label
            ?? PREDEFINED_OPTIONS.find(item => item.id === instance.presetId)?.label
            ?? 'Rubrica';
        setRemovedCard({ name, cardId: `preset-card-${instance.key}`, presetId: instance.presetId, restore });
    };
    const undoRemoval = () => {
        if (!removedCard) return;
        removedCard.restore(currentInputs, enabledPresets);
        setRemovedCard(null);
        requestAnimationFrame(() => {
            const card = document.getElementById(removedCard.cardId);
            if (card?.getClientRects().length) card.focus();
        });
    };

    const visiblePresets = enabledPresets.filter(instance =>
        instance.presetId !== 'gratificacao' && instance.presetId !== 'abono' &&
        (instance.presetId === 'pensao') === (step === 7)
    );
    const rubricMode = step === 6 ? 'C' : step === 7 ? 'D' : null;
    const [expandedRubricIds, setExpandedRubricIds] = useState<ReadonlySet<string>>(() => new Set());
    const toggleRubric = (id: string) => setExpandedRubricIds(previous => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const funcaoAtualValor =
        state.funcao && state.funcao !== noFunctionCode
            ? (currentTables.funcoes[state.funcao] || 0)
            : 0;

    const gratificacaoEspecificaCalculada = useMemo(() => {
        if (state.gratEspecificaTipo !== 'gae' && state.gratEspecificaTipo !== 'gas') {
            return 0;
        }
        const rate = payrollRules?.specificGratificationRate ?? 0.35;
        let baseGrat = 0;
        if (state.gratIncideVencimento !== false) baseGrat += baseVencimento;
        if (state.gratIncideGAJ) baseGrat += (state.gaj || 0);
        if (state.gratIncideFuncao) baseGrat += funcaoAtualValor;
        if (state.gratIncideAQTitulo) baseGrat += (state.aqTituloValor || 0);
        if (state.gratIncideAQTreino) baseGrat += (state.aqTreinoValor || 0);
        if (state.gratIncideVPNI) baseGrat += ((state.vpni_lei || 0) + (state.vpni_decisao || 0));
        if (state.gratIncideATS) baseGrat += (state.ats || 0);
        if (state.gratIncideAbono && state.recebeAbono) {
            baseGrat += (Number(state.abonoPermanencia) || Number(state.pssMensal) || 0);
        }
        if (state.gratRubricasInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'C' && state.gratRubricasInclusas?.[r.id] === true)
                .forEach(r => {
                    baseGrat += (r.valor || 0);
                });
        }
        if (state.gratOutrasParcelas && state.gratOutrasParcelas > 0) {
            baseGrat += state.gratOutrasParcelas;
        }
        return Math.round(baseGrat * rate * 100) / 100;
    }, [
        state.gratEspecificaTipo,
        state.gratIncideVencimento,
        baseVencimento,
        state.gratIncideGAJ,
        state.gaj,
        state.gratIncideFuncao,
        funcaoAtualValor,
        state.gratIncideAQTitulo,
        state.aqTituloValor,
        state.gratIncideAQTreino,
        state.aqTreinoValor,
        state.gratIncideVPNI,
        state.vpni_lei,
        state.vpni_decisao,
        state.gratIncideATS,
        state.ats,
        state.gratIncideAbono,
        state.recebeAbono,
        state.abonoPermanencia,
        state.pssMensal,
        state.gratRubricasInclusas,
        state.rubricasExtras,
        state.gratOutrasParcelas,
        payrollRules?.specificGratificationRate
    ]);

    const { handleCargoChange } = usePayrollFormNormalization({
        state,
        update,
        cargoOptions,
        padroes,
        functionKeys,
        noFunctionCode,
        pssOptions,
        irOptions,
        salaryTable: currentTables.salario || {},
        preserveRestoredGlobals
    });

    const updateOvertimeEntry = (id: string, patch: Partial<OvertimeEntry>) => {
        update(
            'overtimeEntries',
            state.overtimeEntries.map((entry) => (
                entry.id === id ? { ...entry, ...patch } : entry
            ))
        );
    };

    const updateSubstitutionEntry = (id: string, patch: Partial<SubstitutionEntry>) => {
        update(
            'substitutionEntries',
            state.substitutionEntries.map((entry) => (
                entry.id === id ? { ...entry, ...patch } : entry
            ))
        );
    };

    const getPresetGrossLines = (instance: PresetInstance): PresetGrossLine[] => {
        return buildPresetGrossLines({
            instance,
            state,
            courtConfig,
            currentTables,
            isNovoAQ,
            noFunctionCode,
            currentFunctionValue: funcaoAtualValor,
            gratificacaoEspecificaCalculada
        });
    };

    const renderPreset = (instance: PresetInstance) => (
        <PresetCardContent
            instance={instance}
            calculationReady={calculationReady}
            state={state}
            update={update}
            styles={styles}
            isNovoAQ={isNovoAQ}
            competenciaReferencia={competenciaReferencia}
            functionKeys={functionKeys}
            updateOvertimeEntry={updateOvertimeEntry}
            updateSubstitutionEntry={updateSubstitutionEntry}
            courtConfig={courtConfig}
        />
    );

    const fixedTitles = new Map<string, string>();
    const personalRubrics = PERSONAL_ADVANTAGES.flatMap(name => {
        const saved = state.rubricasExtras.filter(rubrica => getPersonalAdvantage(rubrica) === name);
        const cards = saved.length ? saved : [{
            id: `vantagem-pessoal-${name.toLowerCase()}`,
            ...personalAdvantageDefaults(name)
        }];
        for (const card of name === 'VPNI' ? cards : cards.slice(0, 1)) fixedTitles.set(card.id, name);
        return cards.map(rubrica => ({ ...rubrica, vantagemPessoal: name }));
    });
    const otherRubrics = state.rubricasExtras.filter(rubrica => !getPersonalAdvantage(rubrica));
    const addVpni = () => {
        const first = personalRubrics.find(rubrica => rubrica.vantagemPessoal === 'VPNI');
        if (first && !state.rubricasExtras.some(saved => saved.id === first.id)) {
            updateRubrica(first.id, 'valor', first.valor, first);
        }
        addRubrica(personalAdvantageDefaults('VPNI'));
    };
    const manualRubricProps = {
        rubricasTax: state.rubricasTax,
        summaryRubrics: state.rubricasExtras,
        calculationReady: calculationReady && Boolean(state.pensionMemory),
        funprespParticipacao: state.funprespParticipacao,
        pensionRetroEntries: (inputState ?? state).pensionRetroEntries,
        pensionConfig: courtConfig.previdenciaComplementar,
        pensionMemory: calculationReady ? state.pensionMemory : undefined,
        competencia: pensionParams.competencia,
        irEaEntryTax: state.irEaEntryTax,
        irEaCurrentYearKeys: state.irEaCurrentYearKeys,
        competenciaReferencia,
        styles,
        removeRubrica: removeManualCard,
        toPositiveNumber
    };

    return (
        <>
            {removedCard && <div
                className="fixed inset-x-4 bottom-[calc(var(--calculator-bar-height,100px)_+_4.5rem)] z-40 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 pl-3 shadow-xl min-[960px]:bottom-[calc(var(--calculator-bar-height,100px)_+_1rem)] dark:border-neutral-700 dark:bg-neutral-900">
                <p role="status" className="min-w-0 flex-1 truncate text-body-sm">Removido: {removedCard.name}</p>
                <button ref={undoButton} type="button" onClick={undoRemoval}
                    className="min-h-11 shrink-0 rounded-lg px-2 font-semibold text-secondary-800 hover:bg-secondary-50 focus-visible:outline focus-visible:outline-2 dark:text-secondary-300 dark:hover:bg-secondary-950">
                    Desfazer
                </button>
                <button type="button" aria-label="Fechar aviso de remoção" onClick={() => setRemovedCard(null)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:text-neutral-300 dark:hover:bg-neutral-700">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>}
            <section id="remuneracao" tabIndex={-1} className="scroll-mt-24" hidden={step > 6}>
                <div hidden={step !== 0} className="space-y-5">
                <DynamicPayrollBaseSection
                    styles={styles}
                    state={state}
                    cargoOptions={cargoOptions}
                    padroes={padroes}
                    salaryByCargo={salaryByCargo}
                    functionKeys={functionKeys}
                    functionValues={currentTables.funcoes}
                    cargoLabels={careerCatalog?.cargoLabels}
                    noFunctionCode={noFunctionCode}
                    noFunctionLabel={noFunctionLabel}
                    baseVencimento={baseVencimento}
                    gaj={gaj}
                    handleCargoChange={handleCargoChange}
                    update={update}
                />

                <section id="gaacta-licenca" tabIndex={-1} aria-label="GAACTA / Licença Compensatória" className={calculatorTargetClass}>
                    <GaactaCompensatoryLeaveCard state={state} updateMany={updateMany} courtConfig={courtConfig}
                        calculationReady={calculationReady} functionValues={currentTables.funcoes ?? {}} styles={styles} />
                </section>

                <section id="gratificacao-especifica" tabIndex={-1} aria-labelledby="gratificacao-especifica-titulo" className={`${styles.formSection} ${calculatorTargetClass}`}>
                    <CalculatorCardHeading help={{ label: "Sobre GAE e GAS", content: <>
                        <p className="font-semibold">Quando escolher cada opção?</p>
                        <p className="mt-2"><strong>GAE:</strong> para atividade externa vinculada às atribuições do cargo.</p>
                        <p className="mt-2"><strong>GAS:</strong> para atividade de segurança vinculada às atribuições do cargo.</p>
                        <p className="mt-2">Norma: Lei nº 11.416/2006, arts. 16 e 17.</p>
                    </> }}>
                        <h4 id="gratificacao-especifica-titulo" className={`${styles.innerBoxTitle} !mb-0`}>Gratificação específica (GAE / GAS)</h4>
                    </CalculatorCardHeading>
                    {renderPreset(GRATIFICATION_INSTANCE)}
                    <div className="mt-2"><PresetGrossSummary compact lines={getPresetGrossLines(GRATIFICATION_INSTANCE)} /></div>
                </section>

                </div>
                <div hidden={step !== 1} className="space-y-5">
                    <DynamicPayrollAQSection
                        styles={styles}
                        renderPreset={renderPreset}
                        getPresetGrossLines={getPresetGrossLines}
                    />
                </div>
                <div hidden={step !== 4}>
                <DynamicPayrollTaxSection
                    activeSection="pension"
                    resultRows={resultRows}
                    styles={styles}
                    state={state}
                    update={update}
                    handleRegimePrevChange={pensionSelection.handleRegimeChange}
                    showFunprespSection={showFunprespSection}
                    previdenciaComplementar={previdenciaComplementar}
                    funprespNormalOptions={funprespNormalOptions}
                    handleFunprespParticipacaoChange={pensionSelection.handleParticipationChange}
                    funprespValidationError={funprespValidationError}
                    funprespAdditionalValidationError={funprespAdditionalValidationError}
                    calculationError={calculationError}
                    pensionContext={pensionContexts?.monthly ?? null}
                    selectionRequired={pensionSelection.incompatible}
                    calculationReady={calculationReady}
                    deducaoPorDependente={courtConfig.values?.deducao_dep ?? 0}
                    abonoGrossLines={getPresetGrossLines(ABONO_INSTANCE)}
                />
                <PensionRetroForm state={{ ...currentInputs, rubricasExtras: state.rubricasExtras }} pensionMemory={calculationReady ? state.pensionMemory : undefined} update={update} styles={styles} pssTableOptions={pssOptions}
                    pensionParams={pensionParams} pensionContexts={pensionContexts}
                    invalidateOptionConfirmation={ids => update('rubricasExtras', (inputState ?? state).rubricasExtras.map(rubrica =>
                        ids.includes(rubrica.id) ? { ...rubrica, pensionOptionAmountConfirmed: false } : rubrica))}
                    allowNormalization={!pensionSelection.incompatible} />
                </div>
                <div hidden={step !== 5}>
                <DynamicPayrollTaxSection
                    activeSection="incomeTax"
                    resultRows={resultRows}
                    styles={styles}
                    state={state}
                    update={update}
                    handleRegimePrevChange={pensionSelection.handleRegimeChange}
                    showFunprespSection={showFunprespSection}
                    previdenciaComplementar={previdenciaComplementar}
                    funprespNormalOptions={funprespNormalOptions}
                    handleFunprespParticipacaoChange={pensionSelection.handleParticipationChange}
                    funprespValidationError={funprespValidationError}
                    funprespAdditionalValidationError={funprespAdditionalValidationError}
                    calculationError={calculationError}
                    pensionContext={pensionContexts?.monthly ?? null}
                    selectionRequired={pensionSelection.incompatible}
                    calculationReady={calculationReady}
                    deducaoPorDependente={courtConfig.values?.deducao_dep ?? 0}
                    abonoGrossLines={getPresetGrossLines(ABONO_INSTANCE)}
                />
                </div>
            </section>

            <section id="vantagens-pessoais" tabIndex={-1} className="scroll-mt-24" hidden={step !== 2}>
                <ManualRubricasSection
                    {...manualRubricProps}
                    rubricas={personalRubrics}
                    fixedTitles={fixedTitles}
                    addVpni={addVpni}
                    atsContext={getAtsCalculationContext(pensionParams)}
                    updateRubrica={(id, field, value) => updateRubrica(
                        id, field, value, personalRubrics.find(rubrica => rubrica.id === id)
                    )}
                />
            </section>

            <section id="beneficios" tabIndex={-1} className="space-y-5 scroll-mt-24" hidden={step !== 3}>
                {FIXED_BENEFITS.map(instance => (
                    <section key={instance.key} id={instance.key} tabIndex={-1} aria-labelledby={`${instance.key}-titulo`}
                        className={`${styles.formSection} ${calculatorTargetClass} space-y-3`}>
                        <h3 id={`${instance.key}-titulo`} className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">
                            {instance.title}
                        </h3>
                        {renderPreset(instance)}
                        <PresetGrossSummary compact lines={calculationReady ? getPresetGrossLines(instance) : []} />
                    </section>
                ))}
            </section>

            <div id={rubricMode === 'C' ? 'creditos-eventuais' : rubricMode === 'D' ? 'descontos' : undefined}
                hidden={rubricMode === null} className="space-y-5" tabIndex={-1}>
            <PresetControlsSection
                mode={rubricMode}
                instanceCount={visiblePresets.length + otherRubrics.filter(rubrica => rubrica.tipo === rubricMode).length}
                enabledPresets={visiblePresets}
                searchDestination={presetSearchDestination}
                onSearchFallback={onSearchFallback}
                includePreset={presetId => {
                    const key = includePreset(presetId);
                    if (key && removedCard?.presetId === presetId && !MULTI_INSTANCE_PRESETS.has(presetId)) setRemovedCard(null);
                    return key;
                }}
                transportIndemnityEnabled={transportIndemnityEnabled}
                addRubrica={addRubrica}
                expandCard={id => setExpandedRubricIds(previous => new Set(previous).add(id))}
            >

            {(visiblePresets.length >= 2 || reorderMode) && <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setReorderMode(previous => !previous)}
                    disabled={visiblePresets.length < 2 && !reorderMode}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-body font-semibold transition-colors disabled:opacity-40 ${reorderMode ? 'border-secondary bg-secondary text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'}`}
                    title="Reordenar a ordem de exibição dos cards no formulário">
                    <GripVertical className="h-4 w-4" />
                    {reorderMode ? 'Concluir ordem' : `Reordenar cards (${visiblePresets.length})`}
                </button>
                {reorderMode && <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Use os botões de mover ou arraste os cards para reorganizar a ordem.</p>}
            </div>}

            <p role="status" aria-live="polite" className="sr-only">{reorderAnnouncement}</p>
            <div className={visiblePresets.length || otherRubrics.some(rubrica => rubrica.tipo === rubricMode)
                ? 'border-t border-neutral-200 dark:border-neutral-700' : undefined}>
            {enabledPresets.map((instance, index) => {
                if (instance.presetId === 'gratificacao' || instance.presetId === 'abono') return null;
                const preset = PREDEFINED_OPTIONS.find(option => option.id === instance.presetId);
                if (!preset) return null;
                const visibleIndex = visiblePresets.findIndex(item => item.key === instance.key);
                const cardId = `preset-card-${instance.key}`;

                return (
                    <div
                        id={cardId}
                        data-preset-id={instance.presetId}
                        tabIndex={-1}
                        key={instance.key}
                        className={calculatorTargetClass}
                        hidden={(instance.presetId === 'pensao') !== (step === 7)}
                    >
                        <PresetInstanceCard
                            instance={instance}
                            position={index}
                            instanceNumber={enabledPresets.filter(item => item.presetId === instance.presetId).findIndex(item => item.key === instance.key) + 1}
                            canMoveUp={visibleIndex > 0}
                            canMoveDown={visibleIndex >= 0 && visibleIndex < visiblePresets.length - 1}
                            movePreset={movePreset}
                            presetLabel={PRESET_CATALOG.find(item => item.id === instance.presetId)?.label ?? preset.label}
                            editor={rubricMode ? {
                                expanded: expandedRubricIds.has(cardId),
                                toggle: () => toggleRubric(cardId)
                            } : undefined}
                            reorderMode={reorderMode}
                            draggingPreset={draggingPreset}
                            handlePresetDragStart={handlePresetDragStart}
                            handlePresetDragOver={handlePresetDragOver}
                            handlePresetDrop={handlePresetDrop}
                            handlePresetDragEnd={handlePresetDragEnd}
                            removePreset={removePresetCard}
                            state={state}
                            inputState={inputState}
                            update={update}
                            styles={styles}
                            isNovoAQ={isNovoAQ}
                            competenciaReferencia={competenciaReferencia}
                            functionKeys={functionKeys}
                            updateOvertimeEntry={updateOvertimeEntry}
                            updateSubstitutionEntry={updateSubstitutionEntry}
                            courtConfig={courtConfig}
                            lines={getPresetGrossLines(instance)}
                            calculationReady={calculationReady}
                        />
                    </div>
                );
            })}

            <div id="manual-rubricas-section" className="scroll-mt-20 transition-all duration-300">
                <ManualRubricasSection
                    {...manualRubricProps}
                    mode={rubricMode ?? 'C'}
                    rubricas={otherRubrics}
                    updateRubrica={updateRubrica}
                    editor={rubricMode ? { expandedIds: expandedRubricIds, toggle: toggleRubric } : undefined}
                />
            </div>
            </div>
            </PresetControlsSection>
            </div>
        </>
    );
};
