import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { PresetGrossSummary } from './PresetGrossSummary';
import { VacationOverview } from './VacationOverview';
import { ThirteenthOverview } from './ThirteenthOverview';
import { DailiesCalculationNotes, DailiesHelp } from './DailiesCalculationNotes';
import { getDailiesPresentation } from './dailiesPresentation';
import { SharedPensionSummary } from './SharedPensionSummary';
import { PresetCardContent } from './PresetCardContent';
import { CalculatorCardHeading } from './CalculatorCardHeading';
import { RubricCardHeading } from './RubricCardHeading';
import { PresetGrossLine, PresetInstance, PredefinedRubricId, MULTI_INSTANCE_PRESETS, roundCurrency } from './dynamicPayrollForm.helpers';
import { CalculatorState, CourtConfig, OvertimeEntry, SubstitutionEntry } from '../../types';

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
    inputState?: CalculatorState;
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
    editor?: { expanded: boolean; toggle: () => void };
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
    inputState,
    update,
    styles,
    isNovoAQ,
    competenciaReferencia,
    functionKeys,
    updateOvertimeEntry,
    updateSubstitutionEntry,
    courtConfig,
    lines,
    calculationReady = false,
    editor
}) => {
    const headerInfo = getPresetHeaderInfo(instance.presetId, courtConfig, presetLabel, instance, state);

    const [vacationEditing, setVacationEditing] = useState(false);
    const [thirteenthEditing, setThirteenthEditing] = useState(false);
    const [dailiesEditing, setDailiesEditing] = useState(false);
    const dailiesPeriodReady = instance.presetId !== 'diarias' || (inputState ?? state).diariasModoDesconto !== 'periodo'
        || Boolean(getDailiesPresentation(inputState ?? state, courtConfig).period);
    const showEditor = !editor || editor.expanded;
    const panelId = `preset-editor-${instance.key}`;
    const cardLines = calculationReady && dailiesPeriodReady ? lines : [];
    const cardAmount = cardLines.find(line => line.cardAmount && line.cardAmount !== 'net')
        ?? cardLines.find(line => line.cardAmount === 'net');
    const net = cardLines.find(line => line.cardAmount === 'net')?.value;
    // Os totais do 13º incluem o adiantamento. O cabeçalho mostra o saldo desta folha.
    const advanceDebit = instance.presetId === 'decimo' ? state.debitoPrimeiraParcela13 ?? 0 : 0;
    const amountForPayroll = (value: number) => advanceDebit ? roundCurrency(value - advanceDebit) : value;
    const repeatable = MULTI_INSTANCE_PRESETS.has(instance.presetId);
    const instanceTitle = repeatable ? `${headerInfo.title} · Instância ${instanceNumber}` : headerInfo.title;
    const remove = {
        label: `Remover ${headerInfo.title}${repeatable ? `, instância ${instanceNumber}` : ''}`,
        onClick: () => removePreset(instance)
    };
    const transport = instance.presetId === 'indenizacao_transporte';
    const hasHelp = Boolean(headerInfo.normBadge) || transport;
    const help = hasHelp ? {
        label: transport ? 'Informações sobre indenização de transporte' : `Informações sobre ${headerInfo.title}`,
        content: <>
            <p className="font-semibold">{headerInfo.title}</p>
            {!transport && instance.presetId !== 'diarias' && <p>{headerInfo.normBadge}</p>}
            {instance.presetId === 'diarias' ? <DailiesHelp config={courtConfig} /> : instance.presetId === 'decimo' ? <>
                <span className="mt-2 block">A 1ª parcela é o adiantamento, sem IR e PSS. Na 2ª parcela, as retenções consideram a remuneração integral e o abatimento do adiantamento, sem PSS sobre FC/CJ.</span>
                <span className="mt-2 block">Use Personalizar cálculo para escolher a composição da remuneração ou informar os valores recebidos.</span>
            </> : instance.presetId === 'ferias' ? <>
                <span className="mt-2 block">O adicional de 1/3 de férias corresponde a um terço da remuneração de referência do servidor no período de usufruto (art. 7º, XVII, da CF/88 c/c art. 76 da Lei nº 8.112/1990).</span>
                <span className="mt-2 block">Use Personalizar cálculo para escolher a composição, informar um valor manual ou ajustar o desconto por recebimento anterior.</span>
            </> : instance.presetId === 'gratificacao' ? <>
                <span className="mt-2 block">A GAE e a GAS correspondem a 35% do vencimento básico, conforme os arts. 16, § 1º, e 17, § 1º, da Lei nº 11.416/2006.</span>
                <span className="mt-2 block">Use Personalizar cálculo para conferir a composição da base e os ajustes aplicados.</span>
            </> : instance.presetId === 'substituicao' ? <span className="mt-2 block">Adicione as funções substituídas e informe os dias correspondentes. Consulte Ver detalhamento do cálculo para conferir a diferença remuneratória, o divisor aplicado e os descontos da simulação.</span> : null}
            {transport && <>
                <span className="mt-2 block">{headerInfo.normBadge || 'Não há norma cadastrada e vigente para esta competência.'}</span>
                <span className="mt-2 block">{courtConfig.transportIndemnity?.info}</span>
                <span className="mt-2 block">{['cjf', 'trf'].some(slug => (courtConfig.orgSlug || '').toLowerCase().startsWith(slug)) ? 'Destinada ao Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal. Exclua férias, licenças, afastamentos e dias usados no cálculo de diárias. É vedado o uso de veículo oficial ou suprimento de fundos para a finalidade.' : 'Destinada ao Oficial de Justiça Avaliador Federal ou servidor designado ad hoc. Exclua afastamentos e demais impedimentos, inclusive dias incompatíveis com diárias.'}</span>
                <span className="mt-2 block">O pagamento depende de comprovação e atestação; este valor é uma simulação.</span>
            </>}
        </>
    } : undefined;

    return (
        <div
            key={instance.key}
            draggable={reorderMode}
            onDragStart={() => handlePresetDragStart(instance.key)}
            onDragOver={handlePresetDragOver}
            onDrop={() => handlePresetDrop(instance.key)}
            onDragEnd={handlePresetDragEnd}
            className={`${editor ? styles.statementRow : `${styles.card} space-y-4`} transition-shadow ${draggingPreset === instance.key ? 'border-secondary/60 shadow-lg' : ''} ${reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
            {editor && <RubricCardHeading
                title={`${presetLabel}${MULTI_INSTANCE_PRESETS.has(instance.presetId) ? ` · Instância ${instanceNumber}` : ''}`}
                presetId={instance.presetId}
                discount={instance.presetId === 'pensao'}
                amount={cardAmount?.cardAmount ? { kind: cardAmount.cardAmount, value: amountForPayroll(cardAmount.value) } : undefined}
                net={net === undefined ? undefined : amountForPayroll(net)}
                notice={instance.presetId === 'indenizacao_transporte' && state.transporteIndenizacaoMemory?.status === 'unavailable'
                    ? 'Valor indisponível nesta competência' : undefined}
                help={help} remove={remove}
                panelId={panelId} expanded={editor.expanded} onToggle={editor.toggle}
            />}
            {!editor && <CalculatorCardHeading help={help} remove={remove}>
                <h3 className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">{instanceTitle}</h3>
            </CalculatorCardHeading>}
            {reorderMode && movePreset && <div className="flex justify-end gap-1">
                <button type="button" disabled={!canMoveUp} onClick={() => movePreset(instance.key, -1)} aria-label={`Mover ${headerInfo.title}, posição ${position + 1}, para cima`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-700"><ArrowUp className="h-5 w-5" /></button>
                <button type="button" disabled={!canMoveDown} onClick={() => movePreset(instance.key, 1)} aria-label={`Mover ${headerInfo.title}, posição ${position + 1}, para baixo`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-700"><ArrowDown className="h-5 w-5" /></button>
            </div>}
            <div id={panelId} hidden={!showEditor} className={showEditor ? `space-y-4 ${editor ? styles.statementEditor : ''}` : 'hidden'}>
                <PresetCardContent
                    instance={instance}
                    calculationReady={calculationReady}
                    inputState={inputState}
                    onVacationEditingChange={setVacationEditing}
                    onThirteenthEditingChange={setThirteenthEditing}
                    onDailiesEditingChange={setDailiesEditing}
                    vacationOverview={instance.presetId === 'ferias' ? <VacationOverview lines={lines} calculationReady={calculationReady} /> : undefined}
                    thirteenthOverview={instance.presetId === 'decimo' ? <ThirteenthOverview lines={lines} calculationReady={calculationReady} /> : undefined}
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

                {!thirteenthEditing && !vacationEditing && !dailiesEditing && <PresetGrossSummary compact={Boolean(editor) || ['hora_extra', 'indenizacao_transporte', 'decimo', 'substituicao', 'ferias', 'diarias'].includes(instance.presetId)} lines={((editor || ['decimo', 'substituicao', 'ferias', 'diarias'].includes(instance.presetId)) && !calculationReady) || !dailiesPeriodReady ? [] : lines}>
                    {calculationReady && dailiesPeriodReady && instance.presetId === 'diarias' && <DailiesCalculationNotes state={state} config={courtConfig} />}
                    {calculationReady && instance.presetId === 'decimo' && state.pensionMemory?.thirteenth && <SharedPensionSummary memory={state.pensionMemory} rubricas={state.rubricasExtras} scope="thirteenth" embedded />}
                </PresetGrossSummary>}
            </div>
        </div>
    );
};
