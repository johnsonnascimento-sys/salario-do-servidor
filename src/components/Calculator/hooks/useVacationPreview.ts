import { useEffect, useMemo, useState } from 'react';
import type { CalculatorState, CourtConfig } from '../../../types';
import type { VacationResult } from '../../../services/agency/engine/modules/vacationCalculations';
import { AgencyCalculationEngine } from '../../../services/agency/engine/AgencyCalculationEngine';
import { mapStateToAgencyParams } from '../../../services/agency/adapters/stateToParams';

interface Preview {
    values?: Partial<CalculatorState>;
    result?: VacationResult;
    loading: boolean;
    error?: string;
}

/** Isolated draft calculation: never writes to payroll inputs or saved results. */
export const useVacationPreview = (state: CalculatorState, config: CourtConfig | undefined, enabled: boolean): Preview => {
    const token = useMemo(() => ({ state, config, enabled }), [state, config, enabled]);
    const [completed, setCompleted] = useState<{ token: typeof token; preview: Preview } | null>(null);
    useEffect(() => {
        if (!enabled || !config) return;
        let cancelled = false;
        void (async () => {
            try {
                const params = mapStateToAgencyParams(state, config.orgSlug || '', config);
                const { breakdown: b } = await new AgencyCalculationEngine().calculateTotal(params);
                if (!cancelled) setCompleted({ token, preview: {
                    loading: false,
                    values: { vencimento: b.vencimento, gaj: b.gaj, aqTituloValor: b.aqTitulo,
                        aqTreinoValor: b.aqTreino, gratEspecificaValor: b.gratEspecifica,
                        abonoPermanencia: b.abono, pssMensal: b.pss },
                    result: { value: b.feriasConstitucional || 0, irFerias: b.impostoFerias || 0,
                        descontoAntecipacao: b.feriasDesconto || 0 }
                } });
            } catch (error) {
                if (!cancelled) setCompleted({ token, preview: { loading: false,
                    error: error instanceof Error ? error.message : 'Não foi possível calcular a prévia.' } });
            }
        })();
        return () => { cancelled = true; };
    }, [token]);
    if (!enabled) return { loading: false };
    if (!config) return { loading: false, error: 'Aguarde o carregamento da configuração para conferir as férias.' };
    return completed?.token === token ? completed.preview : { loading: true };
};
