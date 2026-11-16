import { useEffect, useMemo, useState } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { calculateDailies, DailiesResult } from '../../../services/agency/engine/modules/dailiesCalculations';
import { mapStateToAgencyParams } from '../../../services/agency/adapters/stateToParams';

/** Draft-only invocation of the official module; never writes payroll or snapshots. */
export const useDailiesPreview = (state: CalculatorState, config: CourtConfig | null | undefined, enabled: boolean) => {
    const token = useMemo(() => ({ state, config, enabled }), [state, config, enabled]);
    const [completed, setCompleted] = useState<{ token: typeof token; result?: DailiesResult; error?: string } | null>(null);
    useEffect(() => {
        if (!enabled || !config?.dailies) return;
        let cancelled = false;
        void calculateDailies(mapStateToAgencyParams(state, config.orgSlug || '', config)).then(
            result => { if (!cancelled) setCompleted({ token, result }); },
            error => { if (!cancelled) setCompleted({ token, error: error instanceof Error ? error.message : 'Não foi possível calcular a prévia.' }); }
        );
        return () => { cancelled = true; };
    }, [token]);
    if (!enabled) return { loading: false };
    if (!config?.dailies) return { loading: false, error: 'Aguarde o carregamento da configuração de diárias.' };
    return completed?.token === token ? { ...completed, loading: false } : { loading: true };
};
