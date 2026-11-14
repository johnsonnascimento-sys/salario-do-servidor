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
    courtConfig
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
        return <VacationCard state={state} update={update} competenciaReferencia={competenciaReferencia} styles={styles} courtConfig={courtConfig} />;
    }

    if (presetId === 'decimo') {
        return <ThirteenthCard state={state} update={update} competenciaReferencia={competenciaReferencia} styles={styles} courtConfig={courtConfig} />;
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
                functionKeys={functionKeys}
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
                update={update}
                styles={styles}
                courtConfig={courtConfig}
                competenciaReferencia={competenciaReferencia}
            />
        );
    }

    return null;
};
