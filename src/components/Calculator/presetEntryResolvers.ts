import { CalculatorState, OvertimeEntry, SubstitutionEntry } from '../../types';
import { PresetInstance } from './dynamicPayrollForm.helpers';

export const resolveOvertimeEntry = (
    instance: PresetInstance,
    state: CalculatorState
): OvertimeEntry | undefined => (
    instance.overtimeEntryId
        ? state.overtimeEntries.find(item => item.id === instance.overtimeEntryId)
        : state.overtimeEntries[0]
);

export const resolveSubstitutionEntry = (
    instance: PresetInstance,
    state: CalculatorState
): SubstitutionEntry | undefined => (
    instance.substitutionEntryId
        ? state.substitutionEntries.find(item => item.id === instance.substitutionEntryId)
        : state.substitutionEntries[0]
);
