import React, { useMemo } from 'react';
import { mapStateToAgencyParams } from '../../services/agency/adapters/stateToParams';
import type { PensionSelectionContexts } from '../../services/agency/engine/modules/pensionSelectionContext';
import { usePensionSelection } from './hooks/usePensionSelection';
import { Settings, Sparkles } from 'lucide-react';
import { CalculatorState, CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../types';
import { getTablesForPeriod } from '../../utils/calculations';
import { ManualRubricasSection } from './ManualRubricasSection';
import { DynamicPayrollAQSection } from './DynamicPayrollAQSection';
import { DynamicPayrollBaseSection } from './DynamicPayrollBaseSection';
import { DynamicPayrollTaxSection } from './DynamicPayrollTaxSection';
import { PensionRetroForm } from './PensionRetroForm';
import { PresetCardContent } from './PresetCardContent';
import { PresetControlsSection } from './PresetControlsSection';
import { PresetInstanceCard } from './PresetInstanceCard';
import { useFunprespForm } from './hooks/useFunprespForm';
import { useDynamicPresetInstances } from './hooks/useDynamicPresetInstances';
import { usePayrollFormNormalization } from './hooks/usePayrollFormNormalization';
import { buildPresetGrossLines } from './presetGrossLines';
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

export const DynamicPayrollForm: React.FC<DynamicPayrollFormProps> = ({
    step,
    state,
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

    const visiblePresets = enabledPresets.filter(instance => (instance.presetId === 'pensao') === (step === 3));

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
            <section id="remuneracao" tabIndex={-1} className={`${styles.card} scroll-mt-24`} hidden={step > 1}>
                <h2 className={styles.sectionTitle}>
                    <Settings className="w-4 h-4" />
                    {step === 0 ? 'Dados principais e qualificação' : 'Previdência e dependentes'}
                </h2>

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

                <DynamicPayrollAQSection
                    styles={styles}
                    renderPreset={renderPreset}
                    getPresetGrossLines={getPresetGrossLines}
                />

                </div>
                <div hidden={step !== 1}>
                <DynamicPayrollTaxSection
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
                />

                </div>
            </section>

            <div hidden={step !== 2 && step !== 3} className="space-y-5">
            <section id={step === 3 ? 'descontos' : 'verbas'} tabIndex={-1} className={`${styles.card} scroll-mt-24`}>
                <h2 className={`${styles.sectionTitle} relative`}>
                    <Sparkles className="w-4 h-4 text-primary" />
                    {step === 3 ? 'Adicionar descontos' : 'Adicionar verbas à simulação'}
                </h2>

                <PresetControlsSection
                    mode={step === 3 ? 'D' : 'C'}
                    styles={styles}
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    availablePresets={availablePresets}
                    includePreset={includePreset}
                    reorderMode={reorderMode}
                    setReorderMode={setReorderMode}
                    enabledPresetCount={visiblePresets.length}
                    multiInstanceHintLabel={MULTI_INSTANCE_HINT_LABEL}
                    enabledPresets={enabledPresets}
                    transportIndemnityEnabled={transportIndemnityEnabled}
                    gaactaAvailable={gaactaAvailable}
                    addRubrica={addRubrica}
                    rubricas={state.rubricasExtras}
                />
            </section>

            <p role="status" aria-live="polite" className="sr-only">{reorderAnnouncement}</p>
            {enabledPresets.map((instance, index) => {
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
                        hidden={(instance.presetId === 'pensao') !== (step === 3)}
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
                    mode={step === 3 ? 'D' : 'C'}
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
