import type { CalculatorState } from '../types';
import type { PayslipResultRow } from '../types/user';
import { groupPayslipRowsForDisplay } from './payslipRows';

export const getPayrollPresentation = (
    state: CalculatorState,
    resultRows: PayslipResultRow[],
    dailiesResultRows: PayslipResultRow[] = [],
) => {
    const dailyRows = new Set(dailiesResultRows);
    const payrollRows = groupPayslipRowsForDisplay(resultRows.filter(row => !dailyRows.has(row)), state);
    const dailiesRows = groupPayslipRowsForDisplay(resultRows.filter(row => dailyRows.has(row)), state);
    const credits = (rows: PayslipResultRow[]) => rows.filter(row => row.type === 'C').reduce((sum, row) => sum + row.value, 0);
    const debits = (rows: PayslipResultRow[]) => rows.filter(row => row.type === 'D').reduce((sum, row) => sum + row.value, 0);
    const payrollCredits = credits(payrollRows);
    const payrollDebits = debits(payrollRows);

    return {
        payrollRows,
        dailiesRows,
        payrollCredits,
        payrollDebits,
        payrollNet: payrollCredits - payrollDebits,
        dailiesCredits: credits(dailiesRows),
        dailiesDebits: debits(dailiesRows),
        dailiesNet: dailiesRows.length > 0 ? state.diariasValorTotal : 0,
        hasDailies: dailiesRows.length > 0,
        totalNet: state.liquido,
    };
};
