export type CalculatorRestoreSource = 'blank' | 'savedPayslip' | 'navigationRestore' | 'draft';

export interface CalculatorRestoreSnapshot {
  calculatorState?: unknown;
}

export interface CalculatorNavigationState {
  startBlank?: boolean;
  restoreSnapshot?: CalculatorRestoreSnapshot;
}
