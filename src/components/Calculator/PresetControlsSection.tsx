import React from 'react';
import { GripVertical, Plus } from 'lucide-react';
import { PredefinedRubricId, getPresetPickerLabel } from './dynamicPayrollForm.helpers';

interface PresetOption {
    id: PredefinedRubricId;
    label: string;
}

interface PresetControlsSectionProps {
    styles: Record<string, string>;
    selectedPreset: PredefinedRubricId | '';
    setSelectedPreset: (value: PredefinedRubricId | '') => void;
    availablePresets: PresetOption[];
    includePreset: () => void;
    reorderMode: boolean;
    setReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
    enabledPresetCount: number;
    multiInstanceHintLabel: string;
}

export const PresetControlsSection: React.FC<PresetControlsSectionProps> = ({
    styles,
    selectedPreset,
    setSelectedPreset,
    availablePresets,
    includePreset,
    reorderMode,
    setReorderMode,
    enabledPresetCount,
    multiInstanceHintLabel
}) => (
    <>
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
                    disabled={enabledPresetCount < 2 && !reorderMode}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700 shrink-0"
                >
                    <GripVertical className="w-4 h-4" />
                    {reorderMode ? 'Concluir ordem' : 'Reordenar cards'}
                </button>
            </div>
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                Cards que podem ser adicionados mais de uma vez: {multiInstanceHintLabel}.
            </p>
        </div>

        {reorderMode && (
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Arraste os cards para reorganizar a ordem de exibição.
            </p>
        )}

        {enabledPresetCount === 0 && (
            <p className="text-body text-neutral-400 italic pt-1">
                Nenhuma rubrica pré-definida adicionada.
            </p>
        )}
    </>
);
