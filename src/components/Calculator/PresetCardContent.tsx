import React from 'react';
import { CalculatorState, CourtConfig, OvertimeEntry, SubstitutionEntry } from '../../types';
import { VacationCard } from './cards/VacationCard';
import { GratificationCard } from './cards/GratificationCard';
import { ThirteenthCard } from './cards/ThirteenthCard';
import { OvertimeCard } from './cards/OvertimeCard';
import { SubstitutionCard } from './cards/SubstitutionCard';
import { LicenseCard } from './cards/LicenseCard';
import { TransportIndemnityCard } from './cards/TransportIndemnityCard';
import { DailiesCard } from './cards/DailiesCard';
import { GaactaCard } from './cards/GaactaCard';
import { PensaoAlimenticiaCard } from './cards/PensaoAlimenticiaCard';
import { SimplePresetFields } from './SimplePresetFields';
import { resolveOvertimeEntry, resolveSubstitutionEntry } from './presetEntryResolvers';
import { UnlinkedPresetEntryNotice } from './UnlinkedPresetEntryNotice';
import { PresetInstance } from './dynamicPayrollForm.helpers';

interface PresetCardContentProps {
    instance: PresetInstance;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    isNovoAQ: boolean;
    competenciaReferencia: string;
    functionKeys: string[];
    updateOvertimeEntry: (id: string, patch: Partial<OvertimeEntry>) => void;
    updateSubstitutionEntry: (id: string, patch: Partial<SubstitutionEntry>) => void;
    courtConfig: CourtConfig;
    calculationReady?: boolean;
    inputState?: CalculatorState;
    onVacationEditingChange?: (editing: boolean) => void;
    onThirteenthEditingChange?: (editing: boolean) => void;
    thirteenthOverview?: React.ReactNode;
}

export const PresetCardContent: React.FC<PresetCardContentProps> = ({
    instance,
    state,
    update,
    styles,
    isNovoAQ,
    competenciaReferencia,
    functionKeys,
    updateOvertimeEntry,
    updateSubstitutionEntry,
    courtConfig,
    calculationReady = false,
    inputState,
    onVacationEditingChange,
    onThirteenthEditingChange,
    thirteenthOverview
}) => {
    const presetId = instance.presetId;

    if (
        presetId === 'aq' ||
        presetId === 'vantagens' ||
        presetId === 'abono' ||
        presetId === 'pre_escolar' ||
        presetId === 'aux_transporte'
    ) {
        return (
            <SimplePresetFields
                presetId={presetId}
                state={state}
                update={update}
                styles={styles}
                isNovoAQ={isNovoAQ}
            />
        );
    }

    if (presetId === 'gratificacao') {
        return <GratificationCard state={state} update={update} styles={styles} courtConfig={courtConfig} competenciaReferencia={competenciaReferencia} />;
    }

    if (presetId === 'indenizacao_transporte') {
        return <TransportIndemnityCard state={state} update={update} styles={styles} competenciaReferencia={competenciaReferencia} courtConfig={courtConfig} />;
    }

    if (presetId === 'ferias') {
        return <VacationCard inputState={inputState} onEditingChange={onVacationEditingChange} calculationReady={calculationReady} state={state} update={update} competenciaReferencia={competenciaReferencia} styles={styles} courtConfig={courtConfig} />;
    }

    if (presetId === 'decimo') {
        return <ThirteenthCard inputState={inputState} onEditingChange={onThirteenthEditingChange} overview={thirteenthOverview} state={state} update={update} competenciaReferencia={competenciaReferencia} styles={styles} courtConfig={courtConfig} />;
    }

    if (presetId === 'hora_extra') {
        const overtimeEntry = resolveOvertimeEntry(instance, state);

        if (!overtimeEntry) {
            return <UnlinkedPresetEntryNotice />;
        }

        return (
            <OvertimeCard
                entry={overtimeEntry}
                updateEntry={updateOvertimeEntry}
                calculationReady={calculationReady}
                grossTotal={state.overtimeCalculatedEntries?.find(item => item.id === overtimeEntry.id)?.heTotal ?? 0}
                functionDetails={state.overtimeCalculatedEntries?.find(item => item.id === overtimeEntry.id)?.detalhamentoPorFuncao}
                functionKeys={functionKeys}
                eligibleFunctionKeys={state.overtimeCalculatedEntries?.find(item => item.id === overtimeEntry.id)?.funcoesSubstituicaoElegiveis ?? []}
                baseItems={state.overtimeCalculatedEntries?.find(item => item.id === overtimeEntry.id)?.composicaoBase}
                baseTotal={state.overtimeCalculatedEntries?.find(item => item.id === overtimeEntry.id)?.baseRemuneracao}
                competenciaReferencia={competenciaReferencia}
                styles={styles}
                courtConfig={courtConfig}
                gaactaAtivo={Boolean(state.gaactaAtivo)}
                gaactaRecesso={Boolean(state.gaactaRecesso)}
            />
        );
    }

    if (presetId === 'substituicao') {
        const substitutionEntry = resolveSubstitutionEntry(instance, state);

        if (!substitutionEntry) {
            return <UnlinkedPresetEntryNotice />;
        }

        return (
            <SubstitutionCard
                entry={substitutionEntry}
                updateEntry={updateSubstitutionEntry}
                calculationReady={calculationReady}
                eligibleFunctionKeys={state.substitutionCalculatedEntries?.find(item => item.id === substitutionEntry.id)?.funcoesSubstituicaoElegiveis}
                functionDetails={state.substitutionCalculatedEntries?.find(item => item.id === substitutionEntry.id)?.detalhamentoPorFuncao}
                functionKeys={functionKeys}
                competenciaReferencia={competenciaReferencia}
                styles={styles}
            />
        );
    }

    if (presetId === 'licenca') {
        return <LicenseCard state={state} update={update} competenciaReferencia={competenciaReferencia} styles={styles} />;
    }

    if (presetId === 'gaacta') {
        return (
            <GaactaCard
                state={state}
                update={update}
                styles={styles}
                courtConfig={courtConfig}
                competenciaReferencia={competenciaReferencia}
            />
        );
    }

    if (presetId === 'diarias') {
        return (
            <DailiesCard
                state={state}
                update={update}
                styles={styles}
                courtConfig={courtConfig}
                competenciaReferencia={competenciaReferencia}
            />
        );
    }

    if (presetId === 'pensao') {
        return (
            <PensaoAlimenticiaCard
                state={state}
                calculationReady={calculationReady}
                update={update}
                styles={styles}
                courtConfig={courtConfig}
                competenciaReferencia={competenciaReferencia}
            />
        );
    }

    return null;
};
