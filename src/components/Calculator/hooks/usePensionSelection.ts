import { useEffect } from 'react';
import type { IAgencyCalculationParams } from '../../../services/agency/engine/types';
import type { PensionParticipation } from '../../../types/pension';
import { buildPensionContext, type PensionContext } from '../../../services/agency/engine/modules/pensionContext';
import { selectPensionRegime } from '../PensionRegimeSelect';

export type PensionSelectionPatch = Partial<Pick<IAgencyCalculationParams,
    'regimePrev' | 'funprespParticipacao' | 'funprespAliq' | 'funprespBaseIntegral' | 'funprespVinculadaInicio'>>;

export const usePensionSelection = ({ params, context, onApply, tipo = 'mensal', normalize = true }: {
    params: IAgencyCalculationParams;
    context: PensionContext | null;
    onApply: (patch: PensionSelectionPatch) => void;
    tipo?: 'mensal' | '13';
    normalize?: boolean;
}) => {
    const incompatible = Boolean(context && context.regimePrev === params.regimePrev && !context.allowed.includes(params.funprespParticipacao));
    useEffect(() => {
        // A restored draft or salary change may invalidate the previous choice.
        // Clear only the simulated participation; never enroll in another modality.
        if (normalize && incompatible) onApply({ funprespParticipacao: 'nao' });
    }, [normalize, incompatible, onApply]);
    return {
        incompatible,
        handleRegimeChange: (value: string) => {
            if (!context) return;
            const regimePrev = selectPensionRegime(params.regimePrev, value);
            if (regimePrev === params.regimePrev) return;
            const next = buildPensionContext({ ...params, regimePrev }, context.base, context.componentes, tipo);
            onApply(next.allowed.includes(params.funprespParticipacao)
                ? { regimePrev } : { regimePrev, funprespParticipacao: 'nao' });
        },
        handleParticipationChange: (value: PensionParticipation) => {
            if (!context || !context.allowed.includes(value)) return;
            // Required linked fields and rate are edited inline and validated by the engine.
            onApply({ funprespParticipacao: value });
        },
    };
};
