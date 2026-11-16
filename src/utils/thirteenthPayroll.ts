import type { CalculatorState } from '../types';
import type { ThirteenthPayrollInput, ThirteenthEntry } from '../types/thirteenth';
import { resolveSecondThirteenthMode } from '../services/agency/engine/modules/thirteenthModes';

export type ParcelSelection = boolean | 'mixed';
const combined = (cargo: boolean, fc: boolean, hasFunction: boolean): ParcelSelection =>
    hasFunction && cargo !== fc ? 'mixed' : cargo || (hasFunction && fc);

export const thirteenthSelection = (state: CalculatorState, hasFunction: boolean) => {
    const november = state.tipoCalculo === 'nov';
    const forceFirst = ['jan', 'jun', 'nov'].includes(state.tipoCalculo);
    if (state.thirteenthPayroll) {
        const second = november || state.thirteenthPayroll.secondSelected;
        return { first: forceFirst || second || state.thirteenthPayroll.firstSelected, second };
    }
    return {
        first: forceFirst || combined(state.adiant13Venc > 0, state.adiant13FC > 0, hasFunction),
        second: november || combined(
            resolveSecondThirteenthMode(state.segunda13ModoVenc, state.segunda13Venc, state.manualAdiant13, false) !== 'excluir',
            resolveSecondThirteenthMode(state.segunda13ModoFC, state.segunda13FC, state.manualAdiant13, false) !== 'excluir', hasFunction)
    };
};

/** Deliberate conversion only: opening a saved payslip must not write this object. */
export const createThirteenthPayroll = (input: CalculatorState, calculated: CalculatorState, hasFunction: boolean): ThirteenthPayrollInput => {
    if (input.thirteenthPayroll) return {
        ...input.thirteenthPayroll,
        advances: input.thirteenthPayroll.advances.map(row => ({ ...row })),
        secondEntries: input.thirteenthPayroll.secondEntries.map(row => ({ ...row }))
    };
    const selection = thirteenthSelection(input, hasFunction);
    const rows = (first: boolean): ThirteenthEntry[] => [false, ...(hasFunction || input.adiant13FC > 0 || input.segunda13FC > 0 ? [true] : [])].map(fc => ({
        id: `legacy-${first ? 'first' : 'second'}-${fc ? 'fc' : 'cargo'}`,
        target: fc ? 'grupo:funcao' : 'grupo:cargo',
        description: first ? (fc ? 'Adiantamento FC/CJ' : 'Adiantamento do cargo efetivo') : (fc ? '2ª parcela FC/CJ' : '2ª parcela do cargo efetivo'),
        amount: first
            ? (fc ? (input.manualAdiant13 ? input.adiant13FC : calculated.adiant13FC) : (input.manualAdiant13 ? input.adiant13Venc : calculated.adiant13Venc))
            : (fc ? calculated.segunda13FC : calculated.segunda13Venc),
        origin: 'legacy'
    }));
    const manualSecond = [false, ...(hasFunction ? [true] : [])].some(fc => resolveSecondThirteenthMode(
        fc ? input.segunda13ModoFC : input.segunda13ModoVenc,
        fc ? input.segunda13FC : input.segunda13Venc, input.manualAdiant13, input.tipoCalculo === 'nov') === 'manual');
    return {
        version: 1, firstSelected: selection.first !== false || selection.second !== false,
        secondSelected: selection.second !== false,
        firstMode: input.manualAdiant13 ? 'informado' : 'automatico',
        secondMode: manualSecond ? 'manual' : 'automatico',
        advances: rows(true), secondEntries: rows(false)
    };
};
