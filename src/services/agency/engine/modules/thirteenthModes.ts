import type { SecondThirteenthMode } from '../../../../types';

/** Undefined mode retains the historical amount/selection encoding. */
export const resolveSecondThirteenthMode = (
    explicitMode: SecondThirteenthMode | undefined,
    amount: number,
    manualAdvance: boolean,
    november: boolean
): SecondThirteenthMode => {
    if (explicitMode !== undefined) {
        if (!['excluir', 'automatico', 'manual'].includes(explicitMode)) {
            throw new Error('Modo de cálculo da 2ª parcela do 13º inválido.');
        }
        return november && explicitMode === 'excluir' ? 'automatico' : explicitMode;
    }
    if (manualAdvance && amount > 1) return 'manual';
    return november || amount > 0 ? 'automatico' : 'excluir';
};

/** Shared gross preview; final withholding remains in calculateThirteenth. */
export const automaticSecondThirteenthAmount = (base: number, advance: number, manualAdvance: boolean): number =>
    manualAdvance ? Math.round(Math.max(0, base - advance) * 100) / 100 : base / 2;
