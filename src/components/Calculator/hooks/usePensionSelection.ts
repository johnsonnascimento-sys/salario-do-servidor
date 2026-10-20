import { useState } from 'react';
import type { IAgencyCalculationParams } from '../../../services/agency/engine/types';
import type { PensionParticipation } from '../../../types/pension';
import { buildPensionContext, type PensionContext } from '../../../services/agency/engine/modules/pensionContext';
import { calculateComplementaryPension } from '../../../services/agency/engine/modules/pensionCalculations';
import { selectPensionRegime } from '../PensionRegimeSelect';

export type PensionSelectionPatch = Partial<Pick<IAgencyCalculationParams,
    'regimePrev' | 'funprespParticipacao' | 'funprespAliq' | 'funprespBaseIntegral' | 'funprespVinculadaInicio'>>;

// Validate the requested selection independently of unrelated additional contributions.
export const validatePensionSelection = (params: IAgencyCalculationParams, context: PensionContext, patch: PensionSelectionPatch, tipo: 'mensal' | '13' = 'mensal') => {
    const candidate = { ...params, ...patch, funprespFacul: 0, funprespFaculValor: 0, funprespRevisarOpcoes: false };
    if (!context.allowed.includes(candidate.funprespParticipacao)) return 'Escolha uma participação disponível para este enquadramento.';
    if (candidate.funprespParticipacao === 'nao') return null;
    try {
        calculateComplementaryPension(candidate, context.base, context.base, tipo);
        return null;
    } catch (error) {
        return error instanceof Error ? error.message : 'Confira os dados da participação.';
    }
};

export const usePensionSelection = ({ params, context, onApply, tipo = 'mensal', autoResolve = true }: {
    params: IAgencyCalculationParams;
    context: PensionContext | null;
    onApply: (patch: PensionSelectionPatch) => void;
    tipo?: 'mensal' | '13';
    autoResolve?: boolean;
}) => {
    const [proposedRegime, setProposedRegime] = useState<IAgencyCalculationParams['regimePrev'] | null>(null);
    const [requested, setRequested] = useState(false);
    const [dismissed, setDismissed] = useState<string | null>(null);
    const key = JSON.stringify([params.regimePrev, params.funprespParticipacao, context?.base, context?.teto, context?.allowed]);
    const incompatible = Boolean(context && !context.allowed.includes(params.funprespParticipacao));
    let candidateContext = context;
    const candidateParams = { ...params, regimePrev: proposedRegime ?? params.regimePrev };
    if (context && proposedRegime) candidateContext = buildPensionContext(candidateParams, context.base, context.componentes, tipo);
    const cancel = () => { setProposedRegime(null); setRequested(false); setDismissed(key); };
    const dialog = candidateContext && (proposedRegime || requested || (autoResolve && incompatible && dismissed !== key)) ? {
        params: candidateParams, context: candidateContext, tipo,
        isRegimeChange: Boolean(proposedRegime),
        onCancel: cancel,
        onConfirm: (patch: PensionSelectionPatch) => {
            // Recheck using the current context, never a context from an earlier salary/configuration.
            if (validatePensionSelection(candidateParams, candidateContext!, patch, tipo)) return;
            onApply({ ...patch, regimePrev: candidateParams.regimePrev });
            setProposedRegime(null); setRequested(false); setDismissed(null);
        },
    } : null;
    return {
        dialog, incompatible,
        reopen: () => { setDismissed(null); setRequested(true); },
        handleRegimeChange: (value: string) => {
            if (!context) return;
            const regimePrev = selectPensionRegime(params.regimePrev, value);
            if (regimePrev === params.regimePrev) return;
            const next = buildPensionContext({ ...params, regimePrev }, context.base, context.componentes, tipo);
            if (next.allowed.includes(params.funprespParticipacao)) onApply({ regimePrev });
            else { setProposedRegime(regimePrev); setDismissed(null); }
        },
        handleParticipationChange: (value: PensionParticipation) => {
            if (!context || !context.allowed.includes(value)) return;
            const patch = { funprespParticipacao: value };
            if (!validatePensionSelection(params, context, patch, tipo)) onApply(patch);
            else { setRequested(true); setDismissed(null); }
        },
    };
};
