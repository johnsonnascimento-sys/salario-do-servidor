import type { CalculatorState, CourtConfig } from '../types';

/** Defaults apply only to an explicit selection, never when restoring a snapshot. */
export const getGratificationSelectionPatch = (
    tipo: string,
    config?: CourtConfig,
): Partial<CalculatorState> => {
    if (tipo !== '0' && tipo !== 'gae' && tipo !== 'gas') return {};
    const patch: Partial<CalculatorState> = { gratEspecificaTipo: tipo };
    if (tipo === 'gae' || tipo === 'gas') {
        const configured = config?.payrollRules?.specificGratificationPssDefaults?.[tipo];
        if (typeof configured === 'boolean') patch.incidirPSSGrat = configured;
    }
    return patch;
};
