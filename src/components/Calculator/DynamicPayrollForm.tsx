import React, { useEffect } from 'react';
import { GripVertical, Plus, Settings, Trash2 } from 'lucide-react';
import { CalculatorState, CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../types';
import { getTablesForPeriod } from '../../utils/calculations';
import { ManualRubricasSection } from './ManualRubricasSection';
import { DynamicPayrollAQSection } from './DynamicPayrollAQSection';
import { DynamicPayrollBaseSection } from './DynamicPayrollBaseSection';
import { DynamicPayrollTaxSection } from './DynamicPayrollTaxSection';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossSummary } from './PresetGrossSummary';
import { useFunprespForm } from './hooks/useFunprespForm';
import { useDynamicPresetInstances } from './hooks/useDynamicPresetInstances';
import { buildPresetGrossLines } from './presetGrossLines';
import { pickBestKeyByReference, toReferenceMonthIndex } from './referenceDateUtils';
import {
    PredefinedRubricId,
    PresetGrossLine,
    PresetInstance,
    PREDEFINED_OPTIONS,
    MULTI_INSTANCE_PRESETS,
    MULTI_INSTANCE_HINT_LABEL,
    toPositiveNumber,
    createUniqueId,
    formatReferenciaMesAno,
    getPresetPickerLabel
} from './dynamicPayrollForm.helpers';

interface DynamicPayrollFormProps {
    state: CalculatorState;
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
        handleRegimePrevChange,
        handleFunprespParticipacaoChange,
        funprespValidationError
    } = useFunprespForm({
        state,
        update,
        previdenciaComplementar
    });
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
        update,
        updateSubstDays,
        functionKeys
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

    const handleCargoChange = (nextCargo: CalculatorState['cargo']) => {
        const nextPadroes = Object.keys(currentTables.salario[nextCargo] || {});
        const fallbackPadrao = nextPadroes[0] || state.padrao;

        update('cargo', nextCargo);
        update('padrao', fallbackPadrao);
    };

    useEffect(() => {
        if (cargoOptions.length === 0) return;
        if (!state.cargo || !cargoOptions.includes(state.cargo)) {
            update('cargo', cargoOptions[0]);
        }
    }, [cargoOptions, state.cargo, update]);

    useEffect(() => {
        if (padroes.length === 0) return;
        if (!state.padrao || !padroes.includes(state.padrao)) {
            update('padrao', padroes[0]);
        }
    }, [padroes, state.padrao, update]);

    useEffect(() => {
        if (!noFunctionCode) return;
        const validFunctions = new Set([noFunctionCode, ...functionKeys]);
        if (!state.funcao) {
            update('funcao', noFunctionCode);
            return;
        }

        // Evita sobrescrever snapshot restaurado enquanto as funções ainda não carregaram.
        if (functionKeys.length === 0) {
            return;
        }

        if (!validFunctions.has(state.funcao)) {
            const normalizedCurrent = String(state.funcao).trim().toLowerCase();
            const matchedFunction = functionKeys.find(
                key => key.trim().toLowerCase() === normalizedCurrent
            );

            if (matchedFunction) {
                update('funcao', matchedFunction);
                return;
            }

            const sanitizedCurrent = normalizedCurrent.replace(/[^a-z0-9]/g, '');
            const matchedByToken = functionKeys.find(
                key => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === sanitizedCurrent
            );

            if (matchedByToken) {
                update('funcao', matchedByToken);
                return;
            }

            // Fallback para snapshots legados em formato de texto/label
            // Ex.: "Funcao Comissionada (Opcao) - FC4" ou "CJ-2"
            const tokenMatch = normalizedCurrent.match(/(fc|cj)\s*[-_ ]?\s*(\d+)/i);
            if (tokenMatch) {
                const token = `${tokenMatch[1]}${tokenMatch[2]}`.toLowerCase();
                const matchedByEmbeddedToken = functionKeys.find((key) => {
                    const normalizedKey = key.trim().toLowerCase();
                    const keyToken = normalizedKey.replace(/[^a-z0-9]/g, '');
                    return normalizedKey.includes(token) || keyToken.includes(token);
                });

                if (matchedByEmbeddedToken) {
                    update('funcao', matchedByEmbeddedToken);
                    return;
                }
            }

            update('funcao', noFunctionCode);
        }
    }, [noFunctionCode, functionKeys, state.funcao, update]);

    useEffect(() => {
        if (pssOptions.length === 0) return;
        const referenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
        const nextTabelaPSS = pickBestKeyByReference(pssOptions, state.anoRef, referenceMonth);
        if (nextTabelaPSS && state.tabelaPSS !== nextTabelaPSS) {
            update('tabelaPSS', nextTabelaPSS);
        }
    }, [pssOptions, state.tabelaPSS, state.anoRef, state.mesRef, update]);

    useEffect(() => {
        if (irOptions.length === 0) return;
        const referenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
        const nextTabelaIR = pickBestKeyByReference(irOptions, state.anoRef, referenceMonth);
        if (nextTabelaIR && state.tabelaIR !== nextTabelaIR) {
            update('tabelaIR', nextTabelaIR);
        }
    }, [irOptions, state.tabelaIR, state.anoRef, state.mesRef, update]);

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
                    handleRegimePrevChange={handleRegimePrevChange}
                    showFunprespSection={showFunprespSection}
                    previdenciaComplementar={previdenciaComplementar}
                    funprespNormalOptions={funprespNormalOptions}
                    handleFunprespParticipacaoChange={handleFunprespParticipacaoChange}
                    funprespValidationError={funprespValidationError}
                />
            </div>

            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Settings className="w-4 h-4" />
                    Rubricas Pré-definidas
                </h3>

                <div className="space-y-3">
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                            className={`${styles.input} w-full min-w-0 sm:flex-1 sm:min-w-[20rem]`}
                            value={selectedPreset}
                            onChange={e => setSelectedPreset(e.target.value as PredefinedRubricId | '')}
                            disabled={availablePresets.length === 0}
                        >
                            {availablePresets.length === 0 && <option value="">Todas adicionadas</option>}
                            {availablePresets.map(option => (
                                <option key={option.id} value={option.id}>{getPresetPickerLabel(option.id, option.label)}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={includePreset}
                            disabled={!selectedPreset}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Incluir
                        </button>
                        <button
                            type="button"
                            onClick={() => setReorderMode(prev => !prev)}
                            disabled={enabledPresets.length < 2 && !reorderMode}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700 shrink-0"
                        >
                            <GripVertical className="w-4 h-4" />
                            {reorderMode ? 'Concluir ordem' : 'Reordenar cards'}
                        </button>
                    </div>
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                        Cards que podem ser adicionados mais de uma vez: {MULTI_INSTANCE_HINT_LABEL}.
                    </p>
                </div>

                {reorderMode && (
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        Arraste os cards para reorganizar a ordem de exibição.
                    </p>
                )}

                {enabledPresets.length === 0 && (
                    <p className="text-body text-neutral-400 italic pt-1">
                        Nenhuma rubrica pré-definida adicionada.
                    </p>
                )}
            </div>

            {enabledPresets.map(instance => {
                const preset = PREDEFINED_OPTIONS.find(option => option.id === instance.presetId);
                if (!preset) return null;

                return (
                    <div
                        key={instance.key}
                        draggable={reorderMode}
                        onDragStart={() => handlePresetDragStart(instance.key)}
                        onDragOver={handlePresetDragOver}
                        onDrop={() => handlePresetDrop(instance.key)}
                        onDragEnd={handlePresetDragEnd}
                        className={`${styles.card} space-y-4 transition-shadow ${draggingPreset === instance.key ? 'border-primary/60 shadow-lg' : ''} ${reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {reorderMode && <GripVertical className="w-4 h-4 text-neutral-400" />}
                                <span className="px-2.5 py-1 rounded-full text-body-xs font-bold bg-primary/10 text-primary">{preset.label}</span>
                                {MULTI_INSTANCE_PRESETS.has(instance.presetId) && (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                                        Múltiplo
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => removePreset(instance)}
                                className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                aria-label={`Remover ${preset.label}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        {renderPreset(instance)}
                        <PresetGrossSummary lines={getPresetGrossLines(instance)} />
                    </div>
                );
            })}

            <ManualRubricasSection
                rubricas={state.rubricasExtras}
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
