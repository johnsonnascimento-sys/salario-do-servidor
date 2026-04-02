import React, { useEffect } from 'react';
import { Settings } from 'lucide-react';
import { CalculatorState, CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../types';
import { getTablesForPeriod } from '../../utils/calculations';
import { ManualRubricasSection } from './ManualRubricasSection';
import { DynamicPayrollAQSection } from './DynamicPayrollAQSection';
import { DynamicPayrollBaseSection } from './DynamicPayrollBaseSection';
import { DynamicPayrollTaxSection } from './DynamicPayrollTaxSection';
import { PresetCardContent } from './PresetCardContent';
import { PresetControlsSection } from './PresetControlsSection';
import { PresetInstanceCard } from './PresetInstanceCard';
import { useFunprespForm } from './hooks/useFunprespForm';
import { useDynamicPresetInstances } from './hooks/useDynamicPresetInstances';
import { buildPresetGrossLines } from './presetGrossLines';
import { pickBestKeyByReference, toReferenceMonthIndex } from './referenceDateUtils';
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
