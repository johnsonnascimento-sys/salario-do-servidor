import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { PresetGrossSummary } from './PresetGrossSummary';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossLine, PresetInstance, MULTI_INSTANCE_PRESETS } from './dynamicPayrollForm.helpers';
import { CalculatorState, CourtConfig, OvertimeEntry, SubstitutionEntry } from '../../types';

interface PresetInstanceCardProps {
    instance: PresetInstance;
    presetLabel: string;
    reorderMode: boolean;
    draggingPreset: string | null;
    handlePresetDragStart: (key: string) => void;
    handlePresetDragOver: (event: React.DragEvent<HTMLElement>) => void;
    handlePresetDrop: (targetKey: string) => void;
    handlePresetDragEnd: () => void;
    removePreset: (instance: PresetInstance) => void;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    isNovoAQ: boolean;
    competenciaReferencia: string;
    functionKeys: string[];
    updateOvertimeEntry: (id: string, patch: Partial<OvertimeEntry>) => void;
    updateSubstitutionEntry: (id: string, patch: Partial<SubstitutionEntry>) => void;
    courtConfig: CourtConfig;
    lines: PresetGrossLine[];
}

export const PresetInstanceCard: React.FC<PresetInstanceCardProps> = ({
    instance,
    presetLabel,
    reorderMode,
    draggingPreset,
    handlePresetDragStart,
    handlePresetDragOver,
    handlePresetDrop,
    handlePresetDragEnd,
    removePreset,
    state,
    update,
    styles,
    isNovoAQ,
    competenciaReferencia,
    functionKeys,
    updateOvertimeEntry,
    updateSubstitutionEntry,
    courtConfig,
    lines
}) => (
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
                <span className="px-2.5 py-1 rounded-full text-body-xs font-bold bg-primary/10 text-primary">{presetLabel}</span>
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
                aria-label={`Remover ${presetLabel}`}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>

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

        <PresetGrossSummary lines={lines} />
    </div>
);
