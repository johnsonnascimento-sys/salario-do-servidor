import { useEffect, useMemo, useState } from 'react';
import type { CalculatorState, CourtConfig } from '../../../types';
import type { ThirteenthReference, ThirteenthCalculationMemory } from '../../../types/thirteenth';
import { AgencyCalculationEngine } from '../../../services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../../../services/agency/adapters/stateToParams';
import { buildThirteenthReference } from '../../../services/agency/engine/modules/thirteenthLedger';
import { calculateBase } from '../../../services/agency/engine/modules/baseCalculations';
import { calculateDeductions } from '../../../services/agency/engine/modules/deductionsCalculations';

interface Preview {
    reference?: ThirteenthReference;
    memory?: ThirteenthCalculationMemory;
    error?: string;
    loading: boolean;
}

/** Draft-only engine invocation. Never writes to the payroll, persistence or exports. */
export const useThirteenthPreview = (state: CalculatorState, config: CourtConfig | undefined, enabled: boolean): Preview => {
    const token = useMemo(() => ({ state, config, enabled }), [state, config, enabled]);
    const [completed, setCompleted] = useState<{ token: typeof token; preview: Preview } | null>(null);
    useEffect(() => {
        if (!enabled || !config) return;
        let cancelled = false;
        void (async () => {
            let reference: ThirteenthReference | undefined;
            try {
                const params = mapStateToAgencyParams(state, config.orgSlug || '', config);
                const deductions = await calculateDeductions(await calculateBase(params), params);
                reference = await buildThirteenthReference({ ...params, abonoPermanencia: params.recebeAbono ? deductions.pss : 0 });
                const result = await new AgencyCalculationEngine().calculateTotal(params);
                if (!cancelled) setCompleted({ token, preview: { reference, memory: result.breakdown.thirteenthMemory, loading: false } });
            } catch (error) {
                if (!cancelled) setCompleted({ token, preview: { reference, loading: false,
                    error: error instanceof Error ? error.message : 'Não foi possível calcular a prévia. Revise as entradas.' } });
            }
        })();
        return () => { cancelled = true; };
    }, [token]);
    if (!enabled) return { loading: false };
    if (!config) return { loading: false, error: 'Aguarde o carregamento da configuração para conferir o 13º.' };
    return completed?.token === token ? completed.preview : { loading: true };
};
