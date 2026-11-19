import React, { useRef } from 'react';
import { ChevronDown, Download, FileText, RotateCcw, Save, Table as TableIcon, User } from 'lucide-react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface ActionFooterProps {
    state: CalculatorState;
    onExportPDF: () => void;
    onExportExcel: () => void;
    onSavePayslip?: () => void;
    onOpenPayslips?: () => void;
    savingPayslip?: boolean;
    onClearCalculator?: () => void;
    calculationReady?: boolean;
    resultMessage?: string;
    resultLabel?: string;
    errorDetail?: string | null;
}

export const ActionFooter: React.FC<ActionFooterProps> = ({
    state, onExportPDF, onExportExcel, onSavePayslip, onOpenPayslips, savingPayslip,
    onClearCalculator, calculationReady = true, resultMessage = 'Calculando...',
    resultLabel = 'Líquido do holerite', errorDetail,
}) => {
    const exportMenu = useRef<HTMLDetailsElement>(null);
    const exportFile = (action: () => void) => {
        if (exportMenu.current) {
            exportMenu.current.open = false;
            exportMenu.current.querySelector('summary')?.focus();
        }
        action();
    };
    const buttonClass = 'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-body-sm font-semibold text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-700 disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:outline-secondary-300';

    return (
        <div data-calculator-results-bar className="calculator-result-dock sticky bottom-0 z-50 hidden shrink-0 border-t border-neutral-200 bg-white px-5 py-3 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 min-[960px]:block">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0" aria-live="polite" aria-atomic="true">
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-300">{resultLabel}</p>
                    <p className={calculationReady ? 'text-h3 font-bold tabular-nums tracking-tight' : 'text-body font-semibold'}>
                        {calculationReady ? formatCurrency(state.liquido) : resultMessage}
                    </p>
                    {!calculationReady && errorDetail && <p role="alert" className="mt-1 max-w-md break-words text-body-sm text-neutral-600 dark:text-neutral-300">{errorDetail}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onClearCalculator} className={buttonClass}><RotateCcw size={18} aria-hidden="true" />Limpar</button>
                    <button type="button" onClick={onOpenPayslips} className={buttonClass}><User size={18} aria-hidden="true" />Holerites</button>
                    <button type="button" title="Salvar na minha área" onClick={onSavePayslip} disabled={savingPayslip || !calculationReady} className={buttonClass}>
                        <Save size={18} aria-hidden="true" />{savingPayslip ? 'Salvando...' : 'Salvar'}
                    </button>
                    <details ref={exportMenu} className="relative" onKeyDown={event => {
                        if (event.key === 'Escape' && exportMenu.current) {
                            exportMenu.current.open = false;
                            exportMenu.current.querySelector('summary')?.focus();
                        }
                    }}>
                        <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border px-4 py-2 text-body-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary-700 dark:focus-visible:outline-secondary-300 ${calculationReady
                            ? 'border-secondary-800 bg-secondary-800 text-white hover:bg-secondary-900'
                            : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}>
                            <Download size={18} aria-hidden="true" />Exportar<ChevronDown size={16} aria-hidden="true" />
                        </summary>
                        <div className="absolute bottom-full right-0 mb-3 w-52 space-y-1 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-800 shadow-xl dark:border-neutral-600 dark:bg-neutral-800 dark:text-white">
                            <button type="button" title="Exportar PDF/Holerite" onClick={() => exportFile(onExportPDF)} disabled={!calculationReady} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-body font-semibold hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-700"><FileText size={18} aria-hidden="true" />PDF / Holerite</button>
                            <button type="button" title="Exportar Excel" onClick={() => exportFile(onExportExcel)} disabled={!calculationReady} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-body font-semibold hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-700"><TableIcon size={18} aria-hidden="true" />Excel</button>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
};
