import React from 'react';
import { mapStateToAgencyParams } from '../../services/agency/adapters/stateToParams';
import type { PensionSelectionContexts } from '../../services/agency/engine/modules/pensionSelectionContext';
import { usePensionSelection } from './hooks/usePensionSelection';
import { Info, Settings } from 'lucide-react';
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
    addRubrica: (tipo?: Rubrica['tipo']) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    styles: any;
}

export const DynamicPayrollForm: React.FC<DynamicPayrollFormProps> = ({
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
    const pensionSelection = usePensionSelection({ params: pensionParams, context: pensionContexts?.monthly ?? null,
        onApply: patch => updateMany(patch as Partial<CalculatorState>), normalize: !pensionPending });

    const {
        enabledPresets,
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
        transportIndemnityEnabled: Boolean(courtConfig.transportIndemnity?.enabled)
    });

    const totalCreditos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'C')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const totalDescontos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'D')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const gratificacaoEspecificaCalculada =
        state.gratEspecificaTipo === 'gae' || state.gratEspecificaTipo === 'gas'
            ? baseVencimento * (payrollRules?.specificGratificationRate ?? 0)
            : 0;

    const funcaoAtualValor =
        state.funcao && state.funcao !== noFunctionCode
            ? (currentTables.funcoes[state.funcao] || 0)
            : 0;

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
            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Settings className="w-4 h-4" />
                    Formulário dinâmico do holerite
                </h3>

                <DynamicPayrollBaseSection
                    styles={styles}
                    state={state}
                    cargoOptions={cargoOptions}
                    padroes={padroes}
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
                />

                <PensionRetroForm state={inputState ?? state} update={update} styles={styles} pssTableOptions={pssOptions}
                    pensionParams={pensionParams} pensionContexts={pensionContexts}
                    invalidateOptionConfirmation={ids => update('rubricasExtras', (inputState ?? state).rubricasExtras.map(rubrica =>
                        ids.includes(rubrica.id) ? { ...rubrica, pensionOptionAmountConfirmed: false } : rubrica))}
                    allowNormalization={!pensionSelection.incompatible} />
            </div>

            <div className={styles.card}>
                <h3 className={`${styles.sectionTitle} relative`}>
                    <Settings className="w-4 h-4" />
                    Rubricas Pré-definidas
                    <span className="relative inline-flex items-center group">
                        <button
                            type="button"
                            aria-label="Informações sobre rubricas pré-definidas"
                            className="rounded p-1 text-neutral-500 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        >
                            <Info className="w-4 h-4" />
                        </button>
                        <span role="tooltip" className="pointer-events-none invisible absolute left-0 top-full z-tooltip mt-1 w-72 rounded-lg border border-neutral-200 bg-white p-3 text-left text-body-xs font-normal normal-case tracking-normal text-neutral-700 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                            Adicione ao formulário itens pré-definidos de remuneração, benefícios e outras verbas para informar os dados e calcular seus valores na simulação.
                        </span>
                    </span>
                </h3>

                <PresetControlsSection
                    styles={styles}
                    selectedPreset={selectedPreset}
                    setSelectedPreset={setSelectedPreset}
                    availablePresets={availablePresets}
                    includePreset={includePreset}
                    reorderMode={reorderMode}
                    setReorderMode={setReorderMode}
                    enabledPresetCount={enabledPresets.length}
                    multiInstanceHintLabel={MULTI_INSTANCE_HINT_LABEL}
                />
            </div>

            {enabledPresets.map(instance => {
                const preset = PREDEFINED_OPTIONS.find(option => option.id === instance.presetId);
                if (!preset) return null;

                return (
                    <PresetInstanceCard
                        key={instance.key}
                        instance={instance}
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
                    />
                );
            })}

            <ManualRubricasSection
                rubricas={state.rubricasExtras}
                rubricasTax={state.rubricasTax}
                calculationReady={calculationReady && Boolean(state.pensionMemory)}
                funprespParticipacao={state.funprespParticipacao}
                pensionMemory={state.pensionMemory}
                pensionRetroEntries={(inputState ?? state).pensionRetroEntries}
                pensionConfig={courtConfig.previdenciaComplementar}
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
        </>
    );
};
