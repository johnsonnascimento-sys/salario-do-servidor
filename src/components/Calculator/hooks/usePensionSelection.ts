import { useEffect } from 'react';
import type { IAgencyCalculationParams } from '../../../services/agency/engine/types';
import type { PensionParticipation } from '../../../types/pension';
import { buildPensionContext, type PensionContext } from '../../../services/agency/engine/modules/pensionContext';
import { selectPensionRegime } from '../PensionRegimeSelect';
import { buildRateOptions } from '../dynamicPayrollForm.helpers';

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
            const patch: PensionSelectionPatch = { funprespParticipacao: value };
            if (value !== 'nao' && value !== params.funprespParticipacao) {
                const config = params.agencyConfig?.previdenciaComplementar;
                const rule = value === 'patrocinado' ? config?.sponsoredRate : config?.linkedRate;
                const options = rule ? buildRateOptions(rule.min, rule.max, rule.step) : [];
                const permitted = (rate: number | undefined) => Boolean(rule && Number.isFinite(rate) &&
                    rate! >= rule.min && rate! <= rule.max && Number.isFinite(rule.step) && rule.step > 0 &&
                    Math.abs((rate! - rule.min) / rule.step - Math.round((rate! - rule.min) / rule.step)) <= 1e-6 &&
                    options.some(option => Math.abs(option - rate!) < 1e-9));
                if (!permitted(params.funprespAliq)) {
                    const suggested = value === 'patrocinado' ? config?.sponsoredRate.defaultRpc : rule?.min;
                    if (permitted(suggested)) patch.funprespAliq = suggested;
                }
            }
            // Apply the configured rate with the explicit choice, before recalculating.
            // Loading saved simulations never replaces their chosen rate.
            onApply(patch);
        },
    };
};
