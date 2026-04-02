import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CalculatorState, OvertimeEntry, SubstitutionEntry } from '../../../types';
import {
    DEFAULT_PRESETS,
    MULTI_INSTANCE_PRESETS,
    PREDEFINED_OPTIONS,
    PredefinedRubricId,
    PresetInstance,
    createUniqueId,
    hasPresetValue
} from '../dynamicPayrollForm.helpers';

interface UseDynamicPresetInstancesParams {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    updateSubstDays: (key: string, days: number) => void;
    functionKeys: string[];
}

const createOvertimeEntry = (): OvertimeEntry => ({
    id: createUniqueId('he-entry'),
    qtd50: 0,
    qtd100: 0,
    isEA: false,
    excluirIR: false,
    usarSubstituicaoFuncao: false,
    competenciaRef: ''
});

const createSubstitutionEntry = (): SubstitutionEntry => ({
    id: createUniqueId('subst-entry'),
    dias: {},
    isEA: false,
    excluirIR: false,
    pssIsEA: false
});

export const useDynamicPresetInstances = ({
    state,
    update,
    updateSubstDays,
    functionKeys
}: UseDynamicPresetInstancesParams) => {
    const overtimeLegacyMigratedRef = useRef(false);
    const substitutionLegacyMigratedRef = useRef(false);

    const initialPresetInstances = useMemo<PresetInstance[]>(() => {
        const instances: PresetInstance[] = [];
        const selectedIds = Array.from(new Set([
            ...DEFAULT_PRESETS,
            ...PREDEFINED_OPTIONS.filter(option => hasPresetValue(option.id, state)).map(option => option.id)
        ]));

        selectedIds.forEach((presetId) => {
            if (presetId === 'hora_extra' && state.overtimeEntries.length > 0) {
                state.overtimeEntries.forEach((entry) => {
                    instances.push({
                        key: createUniqueId(`preset-${presetId}`),
                        presetId,
                        overtimeEntryId: entry.id
                    });
                });
                return;
            }
            if (presetId === 'substituicao' && state.substitutionEntries.length > 0) {
                state.substitutionEntries.forEach((entry) => {
                    instances.push({
                        key: createUniqueId(`preset-${presetId}`),
                        presetId,
                        substitutionEntryId: entry.id
                    });
                });
                return;
            }

            instances.push({
                key: createUniqueId(`preset-${presetId}`),
                presetId
            });
        });

        return instances;
    }, [state]);

    const [enabledPresets, setEnabledPresets] = useState<PresetInstance[]>(initialPresetInstances);
    const enabledPresetIds = useMemo(
        () => new Set(enabledPresets.map(instance => instance.presetId)),
        [enabledPresets]
    );
    const availablePresets = PREDEFINED_OPTIONS.filter(
        option => MULTI_INSTANCE_PRESETS.has(option.id) || !enabledPresetIds.has(option.id)
    );
    const [selectedPreset, setSelectedPreset] = useState<PredefinedRubricId | ''>(PREDEFINED_OPTIONS[0]?.id || '');
    const [reorderMode, setReorderMode] = useState(false);
    const [draggingPreset, setDraggingPreset] = useState<string | null>(null);

    const hasLegacyOvertime =
        (state.heQtd50 || 0) > 0 ||
        (state.heQtd100 || 0) > 0 ||
        state.heIsEA ||
        state.heExcluirIR;

    const hasLegacySubstitution =
        Object.values(state.substDias || {}).some(days => Number(days) > 0) ||
        state.substIsEA ||
        state.substPssIsEA;

    useEffect(() => {
        if (enabledPresets.length < 2 && reorderMode) {
            setReorderMode(false);
            setDraggingPreset(null);
        }
    }, [enabledPresets.length, reorderMode]);

    useEffect(() => {
        const heInstances = enabledPresets.filter(item => item.presetId === 'hora_extra');
        if (heInstances.length === 0) {
            if (state.overtimeEntries.length > 0) {
                update('overtimeEntries', []);
            }
            return;
        }

        const existingEntries = state.overtimeEntries;
        const existingById = new Map<string, OvertimeEntry>(existingEntries.map(entry => [entry.id, entry]));
        const nextEntries: OvertimeEntry[] = [];
        const nextPresets = enabledPresets.map(instance => {
            if (instance.presetId !== 'hora_extra') {
                return instance;
            }

            const currentEntry =
                (instance.overtimeEntryId && existingById.get(instance.overtimeEntryId)) ||
                (existingEntries.length === 0 && hasLegacyOvertime
                    ? {
                        id: createUniqueId('he-entry'),
                        qtd50: Math.max(0, state.heQtd50 || 0),
                        qtd100: Math.max(0, state.heQtd100 || 0),
                        isEA: Boolean(state.heIsEA),
                        excluirIR: Boolean(state.heExcluirIR),
                        usarSubstituicaoFuncao: false,
                        competenciaRef: ''
                    }
                    : createOvertimeEntry());
            nextEntries.push(currentEntry);

            if (instance.overtimeEntryId !== currentEntry.id) {
                return { ...instance, overtimeEntryId: currentEntry.id };
            }
            return instance;
        });

        const needsPresetSync = nextPresets.some((instance, index) => {
            const current = enabledPresets[index];
            return current?.overtimeEntryId !== instance.overtimeEntryId;
        });
        if (needsPresetSync) {
            setEnabledPresets(nextPresets);
        }

        const sameLength = nextEntries.length === existingEntries.length;
        const sameIdsAndValues = sameLength && nextEntries.every((entry, index) => {
            const current = existingEntries[index];
            const horasPorFuncaoKeys = new Set([
                ...Object.keys(entry.horasPorFuncao || {}),
                ...Object.keys(current?.horasPorFuncao || {})
            ]);
            const horasPorFuncaoEqual = Array.from(horasPorFuncaoKeys).every((key) => (
                (entry.horasPorFuncao?.[key]?.qtd50 || 0) === (current?.horasPorFuncao?.[key]?.qtd50 || 0) &&
                (entry.horasPorFuncao?.[key]?.qtd100 || 0) === (current?.horasPorFuncao?.[key]?.qtd100 || 0)
            ));
            return (
                !!current &&
                current.id === entry.id &&
                current.qtd50 === entry.qtd50 &&
                current.qtd100 === entry.qtd100 &&
                current.isEA === entry.isEA &&
                current.excluirIR === entry.excluirIR &&
                current.usarSubstituicaoFuncao === entry.usarSubstituicaoFuncao &&
                current.competenciaRef === entry.competenciaRef &&
                horasPorFuncaoEqual
            );
        });

        if (!sameIdsAndValues) {
            update('overtimeEntries', nextEntries);
        }
    }, [enabledPresets, hasLegacyOvertime, state.heExcluirIR, state.heIsEA, state.heQtd100, state.heQtd50, state.overtimeEntries, update]);

    useEffect(() => {
        const substInstances = enabledPresets.filter(item => item.presetId === 'substituicao');
        if (substInstances.length === 0) {
            if (state.substitutionEntries.length > 0) {
                update('substitutionEntries', []);
            }
            return;
        }

        const existingEntries = state.substitutionEntries;
        const existingById = new Map<string, SubstitutionEntry>(existingEntries.map(entry => [entry.id, entry]));
        const nextEntries: SubstitutionEntry[] = [];
        const nextPresets = enabledPresets.map(instance => {
            if (instance.presetId !== 'substituicao') {
                return instance;
            }

            const currentEntry =
                (instance.substitutionEntryId && existingById.get(instance.substitutionEntryId)) ||
                (existingEntries.length === 0 && hasLegacySubstitution
                    ? {
                        id: createUniqueId('subst-entry'),
                        dias: { ...(state.substDias || {}) },
                        isEA: Boolean(state.substIsEA),
                        excluirIR: false,
                        pssIsEA: Boolean(state.substPssIsEA)
                    }
                    : createSubstitutionEntry());
            nextEntries.push(currentEntry);

            if (instance.substitutionEntryId !== currentEntry.id) {
                return { ...instance, substitutionEntryId: currentEntry.id };
            }
            return instance;
        });

        const needsPresetSync = nextPresets.some((instance, index) => {
            const current = enabledPresets[index];
            return current?.substitutionEntryId !== instance.substitutionEntryId;
        });
        if (needsPresetSync) {
            setEnabledPresets(nextPresets);
        }

        const sameLength = nextEntries.length === existingEntries.length;
        const sameIdsAndValues = sameLength && nextEntries.every((entry, index) => {
            const current = existingEntries[index];
            const diasKeys = new Set([
                ...Object.keys(entry.dias || {}),
                ...Object.keys(current?.dias || {})
            ]);
            const diasEqual = Array.from(diasKeys).every((key) => (entry.dias?.[key] || 0) === (current?.dias?.[key] || 0));
            return (
                !!current &&
                current.id === entry.id &&
                current.isEA === entry.isEA &&
                current.excluirIR === entry.excluirIR &&
                current.pssIsEA === entry.pssIsEA &&
                diasEqual
            );
        });

        if (!sameIdsAndValues) {
            update('substitutionEntries', nextEntries);
        }
    }, [enabledPresets, hasLegacySubstitution, state.substDias, state.substIsEA, state.substPssIsEA, state.substitutionEntries, update]);

    useEffect(() => {
        if (overtimeLegacyMigratedRef.current) return;
        if (state.overtimeEntries.length > 0) {
            overtimeLegacyMigratedRef.current = true;
            return;
        }

        if (!hasLegacyOvertime) {
            overtimeLegacyMigratedRef.current = true;
            return;
        }

        update('overtimeEntries', [
            {
                id: createUniqueId('he-entry'),
                qtd50: Math.max(0, state.heQtd50 || 0),
                qtd100: Math.max(0, state.heQtd100 || 0),
                isEA: Boolean(state.heIsEA),
                excluirIR: Boolean(state.heExcluirIR),
                usarSubstituicaoFuncao: false,
                competenciaRef: ''
            }
        ]);
        overtimeLegacyMigratedRef.current = true;
    }, [hasLegacyOvertime, state.heExcluirIR, state.heIsEA, state.heQtd100, state.heQtd50, state.overtimeEntries.length, update]);

    useEffect(() => {
        if (substitutionLegacyMigratedRef.current) return;
        if (state.substitutionEntries.length > 0) {
            substitutionLegacyMigratedRef.current = true;
            return;
        }

        if (!hasLegacySubstitution) {
            substitutionLegacyMigratedRef.current = true;
            return;
        }

        update('substitutionEntries', [
            {
                id: createUniqueId('subst-entry'),
                dias: { ...(state.substDias || {}) },
                isEA: Boolean(state.substIsEA),
                excluirIR: false,
                pssIsEA: Boolean(state.substPssIsEA)
            }
        ]);
        substitutionLegacyMigratedRef.current = true;
    }, [hasLegacySubstitution, state.substDias, state.substIsEA, state.substPssIsEA, state.substitutionEntries.length, update]);

    const clearPreset = (presetId: PredefinedRubricId) => {
        switch (presetId) {
            case 'aq':
                update('aqTituloPerc', 0);
                update('aqTreinoPerc', 0);
                update('aqTituloVR', 0);
                update('aqTreinoVR', 0);
                break;
            case 'gratificacao':
                update('gratEspecificaTipo', '0');
                update('gratEspecificaValor', 0);
                break;
            case 'vantagens':
                update('vpni_lei', 0);
                update('vpni_decisao', 0);
                update('ats', 0);
                break;
            case 'abono':
                update('recebeAbono', false);
                break;
            case 'ferias':
                update('manualFerias', false);
                update('ferias1_3', 0);
                update('feriasDesc', 0);
                update('feriasDescManual', false);
                update('feriasAntecipadas', false);
                break;
            case 'decimo':
                update('manualAdiant13', false);
                update('adiant13Venc', 0);
                update('adiant13FC', 0);
                update('segunda13Venc', 0);
                update('segunda13FC', 0);
                break;
            case 'hora_extra':
                update('heQtd50', 0);
                update('heQtd100', 0);
                update('heIsEA', false);
                update('hePssIsEA', false);
                update('heExcluirIR', false);
                update('overtimeEntries', []);
                break;
            case 'substituicao':
                update('substIsEA', false);
                update('substPssIsEA', false);
                update('substitutionEntries', []);
                functionKeys.forEach(key => updateSubstDays(key, 0));
                break;
            case 'licenca':
                update('licencaDias', 0);
                update('baseLicenca', 'auto');
                update('incluirAbonoLicenca', true);
                break;
            case 'pre_escolar':
                update('auxPreEscolarQtd', 0);
                break;
            case 'aux_transporte':
                update('auxTransporteGasto', 0);
                break;
            case 'diarias':
                update('diariasQtd', 0);
                update('diariasEmbarque', 'nenhum');
                update('diariasModoDesconto', 'manual');
                update('diariasDataInicio', '');
                update('diariasDataFim', '');
                update('diariasDiasDescontoAlimentacao', 0);
                update('diariasDiasDescontoTransporte', 0);
                update('diariasDiasDescontoAlimentacaoCalc', 0);
                update('diariasDiasDescontoTransporteCalc', 0);
                update('diariasDescontarAlimentacao', true);
                update('diariasDescontarTransporte', true);
                update('diariasCorteLdo', 0);
                update('diariasGlosa', 0);
                update('diariasExtHospedagem', false);
                update('diariasExtAlimentacao', false);
                update('diariasExtTransporte', false);
                break;
        }
    };

    const includePreset = () => {
        if (!selectedPreset) return;

        if (selectedPreset === 'hora_extra') {
            const newEntry = createOvertimeEntry();
            const hasActiveOvertimePreset = enabledPresets.some(item => item.presetId === 'hora_extra');
            update('overtimeEntries', hasActiveOvertimePreset ? [newEntry, ...state.overtimeEntries] : [newEntry]);
            setEnabledPresets(prev => [
                {
                    key: createUniqueId('preset-hora_extra'),
                    presetId: 'hora_extra',
                    overtimeEntryId: newEntry.id
                },
                ...prev
            ]);
            return;
        }

        if (selectedPreset === 'substituicao') {
            const newEntry = createSubstitutionEntry();
            const hasActiveSubstitutionPreset = enabledPresets.some(item => item.presetId === 'substituicao');
            update('substitutionEntries', hasActiveSubstitutionPreset ? [newEntry, ...state.substitutionEntries] : [newEntry]);
            setEnabledPresets(prev => [
                {
                    key: createUniqueId('preset-substituicao'),
                    presetId: 'substituicao',
                    substitutionEntryId: newEntry.id
                },
                ...prev
            ]);
            return;
        }

        if (enabledPresetIds.has(selectedPreset)) return;
        setEnabledPresets(prev => [
            { key: createUniqueId(`preset-${selectedPreset}`), presetId: selectedPreset },
            ...prev
        ]);
    };

    const removePreset = (instance: PresetInstance) => {
        const remainingInstances = enabledPresets.filter(item => item.key !== instance.key);
        setEnabledPresets(remainingInstances);

        if (instance.presetId === 'hora_extra' && instance.overtimeEntryId) {
            update(
                'overtimeEntries',
                state.overtimeEntries.filter(entry => entry.id !== instance.overtimeEntryId)
            );
        }
        if (instance.presetId === 'substituicao' && instance.substitutionEntryId) {
            update(
                'substitutionEntries',
                state.substitutionEntries.filter(entry => entry.id !== instance.substitutionEntryId)
            );
        }

        const stillEnabled = remainingInstances.some(item => item.presetId === instance.presetId);
        if (!stillEnabled) {
            clearPreset(instance.presetId);
        }

        if (!selectedPreset) {
            setSelectedPreset(instance.presetId);
        }
    };

    const handlePresetDragStart = (presetKey: string) => {
        if (!reorderMode) return;
        setDraggingPreset(presetKey);
    };

    const handlePresetDragOver = (e: DragEvent<HTMLDivElement>) => {
        if (!reorderMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handlePresetDrop = (targetPresetKey: string) => {
        if (!reorderMode || !draggingPreset || draggingPreset === targetPresetKey) {
            return;
        }

        setEnabledPresets(prev => {
            const fromIndex = prev.findIndex(item => item.key === draggingPreset);
            const toIndex = prev.findIndex(item => item.key === targetPresetKey);
            if (fromIndex < 0 || toIndex < 0) return prev;

            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const handlePresetDragEnd = () => {
        setDraggingPreset(null);
    };

    return {
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
    };
};
