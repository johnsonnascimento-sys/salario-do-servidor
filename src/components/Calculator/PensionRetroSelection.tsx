import React from 'react';
import type { PensionRetroEntry } from '../../types/pension';
import type { IAgencyCalculationParams } from '../../services/agency/engine/types';
import type { PensionContext } from '../../services/agency/engine/modules/pensionContext';
import { historicalPensionParams, resolveHistoricalPensionContext } from '../../services/agency/engine/modules/pensionSelectionContext';
import { usePensionSelection, type PensionSelectionPatch } from './hooks/usePensionSelection';
import { PensionParticipationSelect } from './PensionParticipationSelect';
import { PensionRegimeSelect } from './PensionRegimeSelect';

interface Props {
    entry: PensionRetroEntry;
    params?: IAgencyCalculationParams;
    context: PensionContext | null;
    error?: string | null;
    fallbackRegime: IAgencyCalculationParams['regimePrev'];
    fallbackParticipation: IAgencyCalculationParams['funprespParticipacao'];
    styles: Record<string, string>;
    onApply: (patch: Partial<PensionRetroEntry>) => void;
}

const ReadySelection: React.FC<Props & { params: IAgencyCalculationParams }> = ({ entry, params, context, error, styles, onApply }) => {
    const historical = historicalPensionParams(params, entry);
    const apply = (patch: PensionSelectionPatch) => {
        const changes: Partial<PensionRetroEntry> = {};
        if ('regimePrev' in patch) changes.regimePrev = patch.regimePrev;
        if ('funprespParticipacao' in patch) changes.participacao = patch.funprespParticipacao;
        if ('funprespAliq' in patch) changes.aliquotaNormal = patch.funprespAliq;
        if ('funprespBaseIntegral' in patch) changes.salarioParticipacaoVinculado = patch.funprespBaseIntegral;
        if ('funprespVinculadaInicio' in patch) changes.inicioVinculado = patch.funprespVinculadaInicio;
        onApply(changes);
    };
    const selection = usePensionSelection({ params: historical, context, onApply: apply, tipo: entry.tipo ?? 'mensal', normalize: false });
    return <>
        <PensionRegimeSelect className={styles.input} labelClassName={styles.label} label="Regime na competência"
            value={historical.regimePrev} disabled={!context} onChange={selection.handleRegimeChange} />
        <PensionParticipationSelect className={styles.input} labelClassName={styles.label} label="Participação na competência"
            value={historical.funprespParticipacao} disabled={!context} allowed={context?.allowed}
            unavailableReasons={context?.unavailableReasons} onChange={selection.handleParticipationChange} />
        {!context && <p className="md:col-span-3 text-body-xs" role="status">{error || resolveHistoricalPensionContext(params, entry).error || 'Aguarde a atualização do contexto previdenciário desta competência.'}</p>}
    </>;
};

/** Each historical competence uses its own eligibility context. */
export const PensionRetroSelection: React.FC<Props> = props => {
    if (!props.params) return <>
        <PensionRegimeSelect className={props.styles.input} labelClassName={props.styles.label} label="Regime na competência"
            value={props.entry.regimePrev ?? props.fallbackRegime} disabled onChange={() => {}} />
        <PensionParticipationSelect className={props.styles.input} labelClassName={props.styles.label} label="Participação na competência"
            value={props.entry.participacao ?? props.fallbackParticipation} disabled onChange={() => {}} />
        <p className="md:col-span-3 text-body-xs" role="status">Aguarde os dados previdenciários. Informe a competência, a tabela PSS e a remuneração integral elegível corrigida para escolher o regime e a participação.</p>
    </>;
    return <ReadySelection {...props} params={props.params} />;
};
