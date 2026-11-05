import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { PresetGrossSummary } from './PresetGrossSummary';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossLine, PresetInstance, PredefinedRubricId, MULTI_INSTANCE_PRESETS } from './dynamicPayrollForm.helpers';
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

const getPresetHeaderInfo = (
    presetId: PredefinedRubricId,
    courtConfig: CourtConfig,
    fallbackLabel: string
): { title: string; normBadge?: string } => {
    const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
    const isJMU = orgSlug === 'jmu' || orgSlug === 'stm';
    const divisor = courtConfig?.payrollRules?.overtimeMonthHours || (isJMU ? 175 : 200);

    switch (presetId) {
        case 'gaacta':
            return {
                title: 'Gratificação por Atividades de Alta Complexidade',
                normBadge: 'Res. STM Nº 397/2026 • 15%'
            };
        case 'hora_extra':
            return {
                title: 'Serviço Extraordinário (HE)',
                normBadge: isJMU ? `Res. STM Nº 374/2025 • Divisor ${divisor}` : `Res. CJF Nº 4/2008 • Divisor ${divisor}`
            };
        case 'ferias':
            return {
                title: 'Férias (1/3 Constitucional)',
                normBadge: 'CF/88, art. 7º, XVII'
            };
        case 'decimo':
            return {
                title: 'Gratificação Natalina (13º Salário)',
                normBadge: 'Lei 8.112/90'
            };
        case 'licenca':
            return {
                title: 'Licença Compensatória'
            };
        case 'substituicao':
            return {
                title: 'Substituição de Função',
                normBadge: 'Lei 8.112/90, art. 38'
            };
        case 'diarias': {
            const normInfo = courtConfig?.dailies?.normativeInfo;
            const normBadge = normInfo?.localRuleLabel || normInfo?.branchRuleLabel || normInfo?.generalRuleLabel || 'Regulamentação PJU';
            return {
                title: 'Diárias de Viagem',
                normBadge
            };
        }
        case 'gratificacao':
            return {
                title: 'Gratificação Específica (GAE / GAS)'
            };
        case 'vantagens':
            return {
                title: 'Vantagens Pessoais'
            };
        case 'abono':
            return {
                title: 'Abono de Permanência',
                normBadge: 'EC 41/2003'
            };
        case 'pre_escolar':
            return {
                title: 'Auxílio Pré-Escolar'
            };
        case 'aux_transporte':
            return {
                title: 'Auxílio Transporte'
            };
        default:
            return { title: fallbackLabel };
    }
};

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
}) => {
    const headerInfo = getPresetHeaderInfo(instance.presetId, courtConfig, presetLabel);

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
                <div className="flex items-center gap-2 flex-wrap">
                    {reorderMode && <GripVertical className="w-4 h-4 text-neutral-400" />}
                    <span className="text-body-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
                        {headerInfo.title}
                    </span>
                    {headerInfo.normBadge && (
                        <span className="text-body-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded">
                            {headerInfo.normBadge}
                        </span>
                    )}
                    {MULTI_INSTANCE_PRESETS.has(instance.presetId) && (
                        <span className="px-2 py-0.5 rounded-full text-label font-bold uppercase tracking-wide bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                            Múltiplo
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => removePreset(instance)}
                    className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                    aria-label={`Remover ${headerInfo.title}`}
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
};
