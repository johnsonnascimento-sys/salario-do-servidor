import React, { useMemo } from 'react';
import { mapStateToAgencyParams } from '../../services/agency/adapters/stateToParams';
import type { PensionSelectionContexts } from '../../services/agency/engine/modules/pensionSelectionContext';
import { usePensionSelection } from './hooks/usePensionSelection';
import { GripVertical, Sparkles } from 'lucide-react';
import { CalculatorState, CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../types';
import { getTablesForPeriod } from '../../utils/calculations';
import { ManualRubricasSection } from './ManualRubricasSection';
import { DynamicPayrollAQSection } from './DynamicPayrollAQSection';
import { DynamicPayrollBaseSection } from './DynamicPayrollBaseSection';
import { DynamicPayrollTaxSection } from './DynamicPayrollTaxSection';
import { PensionRetroForm } from './PensionRetroForm';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossSummary } from './PresetGrossSummary';
import { PresetControlsSection } from './PresetControlsSection';
import { PresetInstanceCard } from './PresetInstanceCard';
import { useFunprespForm } from './hooks/useFunprespForm';
import { useDynamicPresetInstances } from './hooks/useDynamicPresetInstances';
import { usePayrollFormNormalization } from './hooks/usePayrollFormNormalization';
import { buildPresetGrossLines } from './presetGrossLines';
import type { PayslipResultRow } from '../../types/user';
import {
    PresetGrossLine,
    PresetInstance,
    PREDEFINED_OPTIONS,
    MULTI_INSTANCE_HINT_LABEL,
    toPositiveNumber,
    formatReferenciaMesAno
} from './dynamicPayrollForm.helpers';

interface DynamicPayrollFormProps {
    step: number;
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
    addRubrica: (payload?: Rubrica['tipo'] | Partial<Rubrica>) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    styles: any;
}

const GRATIFICATION_INSTANCE: PresetInstance = { key: 'gratificacao-fixed', presetId: 'gratificacao' };
const ABONO_INSTANCE: PresetInstance = { key: 'abono-fixed', presetId: 'abono' };

export const DynamicPayrollForm: React.FC<DynamicPayrollFormProps> = ({
    step,
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
    const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
    const gaactaAvailable = Boolean(courtConfig?.gaactaRules?.enabled || orgSlug === 'jmu' || orgSlug === 'stm' || orgSlug === 'cjf' || orgSlug.startsWith('trf'));
    const pensionSelection = usePensionSelection({ params: pensionParams, context: pensionContexts?.monthly ?? null,
        onApply: patch => updateMany(patch as Partial<CalculatorState>), normalize: !pensionPending });

    const transportIndemnityEnabled = Boolean(courtConfig.transportIndemnity?.enabled);

    const {
        enabledPresets,
        movePreset,
        reorderAnnouncement,
        availablePresets,
        selectedPreset,
        setSelectedPreset,
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
        transportIndemnityEnabled,
        gaactaAvailable
    });

    const totalCreditos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'C')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const totalDescontos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'D')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const visiblePresets = enabledPresets.filter(instance =>
        instance.presetId !== 'gratificacao' && instance.presetId !== 'abono' &&
        (instance.presetId === 'pensao') === (step === 5)
    );

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

    return (
        <>
            <section id="remuneracao" tabIndex={-1} className="scroll-mt-24" hidden={step > 3}>
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

                <div className={styles.card}>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <h4 className={`${styles.innerBoxTitle} !mb-0`}>Gratificação específica (GAE / GAS)</h4>
                        <details className="relative">
                            <summary aria-label="Sobre GAE e GAS" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:text-neutral-300 dark:hover:bg-neutral-700"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold">i</span></summary>
                            <div className="absolute left-0 top-full z-20 mt-1 w-72 max-w-[min(18rem,80vw)] rounded-xl border border-neutral-200 bg-white p-4 text-body-xs text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                <p className="font-semibold">Quando escolher cada opção?</p>
                                <p className="mt-2"><strong>GAE:</strong> para atividade externa vinculada às atribuições do cargo.</p>
                                <p className="mt-2"><strong>GAS:</strong> para atividade de segurança vinculada às atribuições do cargo.</p>
                            </div>
                        </details>
                        <a href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm" target="_blank" rel="noopener noreferrer" className="rounded border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-body-xs font-medium text-neutral-500 hover:underline dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">Lei 11.416/06, arts. 16 e 17</a>
                    </div>
                    {renderPreset(GRATIFICATION_INSTANCE)}
                    <div className="mt-2"><PresetGrossSummary compact lines={getPresetGrossLines(GRATIFICATION_INSTANCE)} /></div>
                </div>

                </div>
                <div hidden={step !== 1} className="space-y-5">
                    <DynamicPayrollAQSection
                        styles={styles}
                        renderPreset={renderPreset}
                        getPresetGrossLines={getPresetGrossLines}
                    />
                </div>
                <div hidden={step !== 2}>
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

                </div>
                <div hidden={step !== 3}>
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

            <div hidden={step !== 4 && step !== 5} className="space-y-5">
            <section id={step === 5 ? 'descontos' : 'verbas'} tabIndex={-1} className={`${styles.card} scroll-mt-24`}>
                <h2 className={`${styles.sectionTitle} relative`}>
                    <Sparkles className="w-4 h-4 text-primary" />
                    {step === 5 ? 'Adicionar descontos' : 'Adicionar verbas à simulação'}
                </h2>
                <p className="mb-4 text-body text-neutral-600 dark:text-neutral-300">{step === 5
                    ? 'As categorias reúnem os descontos disponíveis. Abra uma para conferir os itens ou pesquise pelo nome; use o botão Adicionar do item escolhido. Desconto avulso serve para lançar um item que não está no catálogo.'
                    : 'As categorias reúnem créditos e adicionais disponíveis. Abra uma para conferir os itens ou pesquise pelo nome; use o botão Adicionar do item escolhido. Crédito avulso serve para lançar um item que não está no catálogo.'}</p>

                <PresetControlsSection
                    mode={step === 5 ? 'D' : 'C'}
                    styles={styles}
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    availablePresets={availablePresets}
                    includePreset={includePreset}
                    multiInstanceHintLabel={MULTI_INSTANCE_HINT_LABEL}
                    enabledPresets={enabledPresets}
                    transportIndemnityEnabled={transportIndemnityEnabled}
                    gaactaAvailable={gaactaAvailable}
                    addRubrica={addRubrica}
                    rubricas={state.rubricasExtras}
                />
            </section>

            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setReorderMode(previous => !previous)}
                    disabled={visiblePresets.length < 2 && !reorderMode}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-body font-semibold transition-colors disabled:opacity-40 ${reorderMode ? 'border-primary bg-primary text-white' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'}`}
                    title="Reordenar a ordem de exibição dos cards no formulário">
                    <GripVertical className="h-4 w-4" />
                    {reorderMode ? 'Concluir ordem' : `Reordenar cards (${visiblePresets.length})`}
                </button>
                {reorderMode && <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Use os botões de mover ou arraste os cards para reorganizar a ordem.</p>}
            </div>

            <p role="status" aria-live="polite" className="sr-only">{reorderAnnouncement}</p>
            {enabledPresets.map((instance, index) => {
                if (instance.presetId === 'gratificacao' || instance.presetId === 'abono') return null;
                const preset = PREDEFINED_OPTIONS.find(option => option.id === instance.presetId);
                if (!preset) return null;
                const visibleIndex = visiblePresets.findIndex(item => item.key === instance.key);

                return (
                    <div
                        id={`preset-card-${instance.key}`}
                        data-preset-id={instance.presetId}
                        tabIndex={-1}
                        key={instance.key}
                        className="scroll-mt-20 transition-all duration-300"
                        hidden={(instance.presetId === 'pensao') !== (step === 5)}
                    >
                        <PresetInstanceCard
                            instance={instance}
                            position={index}
                            instanceNumber={enabledPresets.filter(item => item.presetId === instance.presetId).findIndex(item => item.key === instance.key) + 1}
                            canMoveUp={visibleIndex > 0}
                            canMoveDown={visibleIndex >= 0 && visibleIndex < visiblePresets.length - 1}
                            movePreset={movePreset}
                            presetLabel={preset.label}
                            reorderMode={reorderMode}
                            draggingPreset={draggingPreset}
                            handlePresetDragStart={handlePresetDragStart}
                            handlePresetDragOver={handlePresetDragOver}
                            handlePresetDrop={handlePresetDrop}
                            handlePresetDragEnd={handlePresetDragEnd}
                            removePreset={removePreset}
                            state={state}
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
                    mode={step === 5 ? 'D' : 'C'}
                    rubricas={state.rubricasExtras}
                    rubricasTax={state.rubricasTax}
                    calculationReady={calculationReady && Boolean(state.pensionMemory)}
                    funprespParticipacao={state.funprespParticipacao}
                    pensionRetroEntries={(inputState ?? state).pensionRetroEntries}
                    pensionConfig={courtConfig.previdenciaComplementar}
                    pensionMemory={calculationReady ? state.pensionMemory : undefined}
                    competencia={pensionParams.competencia}
                    irEaEntryTax={state.irEaEntryTax}
                    irEaCurrentYearKeys={state.irEaCurrentYearKeys}
                    competenciaReferencia={competenciaReferencia}
                    totalCreditos={totalCreditos}
                    totalDescontos={totalDescontos}
                    styles={styles}
                    addRubrica={addRubrica}
                    removeRubrica={removeRubrica}
                    updateRubrica={updateRubrica}
                    toPositiveNumber={toPositiveNumber}
                />
            </div>
            <div hidden={step !== 2}>
            <PensionRetroForm state={inputState ?? state} pensionMemory={calculationReady ? state.pensionMemory : undefined} update={update} styles={styles} pssTableOptions={pssOptions}
                pensionParams={pensionParams} pensionContexts={pensionContexts}
                invalidateOptionConfirmation={ids => update('rubricasExtras', (inputState ?? state).rubricasExtras.map(rubrica =>
                    ids.includes(rubrica.id) ? { ...rubrica, pensionOptionAmountConfirmed: false } : rubrica))}
                allowNormalization={!pensionSelection.incompatible} />
            </div>
            </div>
        </>
    );
};
