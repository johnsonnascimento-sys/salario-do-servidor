import React, { useEffect, useRef, useState } from 'react';
import { GripVertical, Info, Trash2 } from 'lucide-react';
import { PresetGrossSummary } from './PresetGrossSummary';
import { SharedPensionSummary } from './SharedPensionSummary';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossLine, PresetInstance, PredefinedRubricId, MULTI_INSTANCE_PRESETS } from './dynamicPayrollForm.helpers';
import { CalculatorState, CourtConfig, OvertimeEntry, SubstitutionEntry } from '../../types';
import { resolveGaactaRule } from '../../services/agency/engine/modules/gaactaCalculations';

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
    calculationReady?: boolean;
}

const getPresetHeaderInfo = (
    presetId: PredefinedRubricId,
    courtConfig: CourtConfig,
    fallbackLabel: string,
    instance?: PresetInstance,
    state?: CalculatorState
): { title: string; normBadge?: string } => {
    const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
    const isJMU = orgSlug === 'jmu' || orgSlug === 'stm';
    const defaultDivisor = courtConfig?.payrollRules?.overtimeMonthHours || (isJMU ? 175 : 200);

    switch (presetId) {
        case 'gaacta': {
            const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
            const monthIndex = months.indexOf((state?.mesRef || '').toUpperCase()) + 1;
            const competence = state && monthIndex > 0 ? `${state.anoRef}-${String(monthIndex).padStart(2, '0')}` : '';
            const rule = resolveGaactaRule(courtConfig, competence);
            const defaultBadge = isJMU ? 'Res. STM Nº 397/2026 • 15%' : 'PJU • 15%';
            return {
                title: 'Gratificação por Atividades de Alta Complexidade',
                normBadge: rule ? `${rule.reference} • ${(rule.percentage * 100).toLocaleString('pt-BR')}%` : defaultBadge
            };
        }
        case 'hora_extra': {
            const entry = instance?.overtimeEntryId
                ? state?.overtimeEntries?.find(e => e.id === instance.overtimeEntryId)
                : state?.overtimeEntries?.[0];
            const divisor = entry?.divisor && entry.divisor > 0 ? entry.divisor : defaultDivisor;
            return {
                title: 'Serviço Extraordinário (HE)',
                normBadge: isJMU ? `Res. STM Nº 374/2025 • Divisor ${divisor}` : `Res. CJF Nº 4/2008 • Divisor ${divisor}`
            };
        }
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
        case 'indenizacao_transporte':
            return { title: 'Indenização de Transporte', normBadge: state?.transporteIndenizacaoMemory?.normativeLabel || (state?.transporteIndenizacaoMemory?.status === 'unavailable' ? undefined : courtConfig.transportIndemnity?.normativeLabel) };
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
    lines,
    calculationReady = false
}) => {
    const headerInfo = getPresetHeaderInfo(instance.presetId, courtConfig, presetLabel, instance, state);
    const [infoOpen, setInfoOpen] = useState(false);
    const infoRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (!infoOpen || typeof document === 'undefined') return;
        const outside = (event: PointerEvent) => { if (!infoRef.current?.contains(event.target as Node)) setInfoOpen(false); };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setInfoOpen(false); };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
    }, [infoOpen]);

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
                    {instance.presetId === 'indenizacao_transporte' && (
                        <span ref={infoRef} className="relative inline-flex" onMouseEnter={() => setInfoOpen(true)} onMouseLeave={() => setInfoOpen(false)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setInfoOpen(false); }} onPointerDown={e => e.stopPropagation()}>
                            <button type="button" aria-label="Informações sobre indenização de transporte" aria-expanded={infoOpen} aria-controls={`info-${instance.key}`} aria-describedby={infoOpen ? `info-${instance.key}` : undefined} onFocus={() => setInfoOpen(true)} onClick={e => { e.stopPropagation(); setInfoOpen(true); }} className="rounded p-1 text-neutral-500 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                                <Info className="h-4 w-4" />
                            </button>
                            {infoOpen && <span id={`info-${instance.key}`} role="tooltip" className="fixed left-4 right-4 top-1/3 z-tooltip sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-72 rounded-lg border border-neutral-200 bg-white p-3 text-body-xs normal-case tracking-normal text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                                {courtConfig.transportIndemnity?.info}
                            </span>}
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

            <PresetGrossSummary lines={lines}>
                {calculationReady && instance.presetId === 'decimo' && state.pensionMemory?.thirteenth && <SharedPensionSummary memory={state.pensionMemory} rubricas={state.rubricasExtras} scope="thirteenth" embedded />}
            </PresetGrossSummary>
        </div>
    );
};
