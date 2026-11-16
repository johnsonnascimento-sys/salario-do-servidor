import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, GripVertical, Info, Trash2 } from 'lucide-react';
import { PresetGrossSummary } from './PresetGrossSummary';
import { SharedPensionSummary } from './SharedPensionSummary';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossLine, PresetInstance, PredefinedRubricId, MULTI_INSTANCE_PRESETS } from './dynamicPayrollForm.helpers';
import { CalculatorState, CourtConfig, OvertimeEntry, SubstitutionEntry } from '../../types';
import { resolveGaactaRule } from '../../services/agency/engine/modules/gaactaCalculations';

interface PresetInstanceCardProps {
    instance: PresetInstance;
    presetLabel: string;
    position?: number;
    instanceNumber?: number;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    movePreset?: (key: string, direction: -1 | 1) => void;
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
            return {
                title: 'Gratificação por Atividades de Alta Complexidade',
                normBadge: rule ? `${rule.reference} • ${(rule.percentage * 100).toLocaleString('pt-BR')}%` : undefined
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
                title: 'Licença Compensatória',
                normBadge: isJMU ? 'Res. STM Nº 376/2025 • Revogada pela Res. 397/2026' : 'Regulamentação PJU'
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
                title: 'Gratificação Específica (GAE / GAS)',
                normBadge: 'Lei 11.416/06, arts. 16 e 17'
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
        case 'pensao':
            return {
                title: 'Pensão Alimentícia',
                normBadge: 'Decisão Judicial / Acordo'
            };
        default:
            return { title: fallbackLabel };
    }
};

export const PresetInstanceCard: React.FC<PresetInstanceCardProps> = ({
    instance,
    presetLabel,
    position = 0,
    instanceNumber = 1,
    canMoveUp = false,
    canMoveDown = false,
    movePreset,
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
            className={`${styles.card} space-y-4 transition-shadow ${draggingPreset === instance.key ? 'border-secondary/60 shadow-lg' : ''} ${reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-2">
                <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
                    {reorderMode && <GripVertical className="w-4 h-4 text-neutral-400" />}
                    <h3 className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">
                        {headerInfo.title}{MULTI_INSTANCE_PRESETS.has(instance.presetId) ? ` · Instância ${instanceNumber}` : ''}
                    </h3>
                    {headerInfo.normBadge && !['gaacta', 'hora_extra', 'indenizacao_transporte'].includes(instance.presetId) && (
                        <span className="text-body-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded">
                            {headerInfo.normBadge}
                        </span>
                    )}
                    {['gaacta', 'hora_extra'].includes(instance.presetId) && (
                        <details className="relative">
                            <summary aria-label={`Informações sobre ${headerInfo.title}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:text-neutral-300 dark:hover:bg-neutral-700"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold">i</span></summary>
                            <div className="absolute left-0 top-full z-20 mt-1 w-72 max-w-[min(18rem,80vw)] rounded-xl border border-neutral-200 bg-white p-4 text-body-xs text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                                <p className="font-semibold">{headerInfo.title}</p>
                                <p className="mt-2">{headerInfo.normBadge || 'Não há norma cadastrada e vigente para esta competência.'}</p>
                            </div>
                        </details>
                    )}
                    {instance.presetId === 'indenizacao_transporte' && (
                        <span ref={infoRef} className="relative inline-flex" onMouseEnter={() => setInfoOpen(true)} onMouseLeave={() => setInfoOpen(false)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setInfoOpen(false); }} onPointerDown={e => e.stopPropagation()}>
                            <button type="button" aria-label="Informações sobre indenização de transporte" aria-expanded={infoOpen} aria-controls={`info-${instance.key}`} aria-describedby={infoOpen ? `info-${instance.key}` : undefined} onFocus={() => setInfoOpen(true)} onClick={e => { e.stopPropagation(); setInfoOpen(true); }} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded p-2 text-neutral-500 hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                                <Info className="h-4 w-4" />
                            </button>
                            {infoOpen && <span id={`info-${instance.key}`} role="tooltip" className="fixed left-4 right-4 top-1/3 z-tooltip sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-72 rounded-lg border border-neutral-200 bg-white p-3 text-body-xs normal-case tracking-normal text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                                <span className="block font-semibold">{headerInfo.title}</span>
                                <span className="mt-2 block">{headerInfo.normBadge || 'Não há norma cadastrada e vigente para esta competência.'}</span>
                                <span className="mt-2 block">{courtConfig.transportIndemnity?.info}</span>
                                <span className="mt-2 block">{['cjf', 'trf'].some(slug => (courtConfig.orgSlug || '').toLowerCase().startsWith(slug)) ? 'Destinada ao Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal. Exclua férias, licenças, afastamentos e dias usados no cálculo de diárias. É vedado o uso de veículo oficial ou suprimento de fundos para a finalidade.' : 'Destinada ao Oficial de Justiça Avaliador Federal ou servidor designado ad hoc. Exclua afastamentos e demais impedimentos, inclusive dias incompatíveis com diárias.'}</span>
                                <span className="mt-2 block">O pagamento depende de comprovação e atestação; este valor é uma simulação.</span>
                            </span>}
                        </span>
                    )}

                </div>
                <div className="flex shrink-0 items-start">
                <button
                    type="button"
                    onClick={() => removePreset(instance)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-neutral-500 hover:text-error-500 p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                    aria-label={`Remover ${headerInfo.title}${MULTI_INSTANCE_PRESETS.has(instance.presetId) ? `, instância ${instanceNumber}` : ''}`}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                </div>
                {reorderMode && movePreset && <div className="col-span-2 flex justify-end gap-1">
                        <button type="button" disabled={!canMoveUp} onClick={() => movePreset(instance.key, -1)} aria-label={`Mover ${headerInfo.title}, posição ${position + 1}, para cima`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-700"><ArrowUp className="h-5 w-5" /></button>
                        <button type="button" disabled={!canMoveDown} onClick={() => movePreset(instance.key, 1)} aria-label={`Mover ${headerInfo.title}, posição ${position + 1}, para baixo`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-700"><ArrowDown className="h-5 w-5" /></button>
                </div>}
            </div>

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

            <PresetGrossSummary compact={['gaacta', 'hora_extra', 'indenizacao_transporte'].includes(instance.presetId)} lines={lines}>
                {calculationReady && instance.presetId === 'decimo' && state.pensionMemory?.thirteenth && <SharedPensionSummary memory={state.pensionMemory} rubricas={state.rubricasExtras} scope="thirteenth" embedded />}
            </PresetGrossSummary>
        </div>
    );
};
