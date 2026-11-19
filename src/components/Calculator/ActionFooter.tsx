import React, { useRef } from 'react';
import { ChevronDown, Download, FileText, RotateCcw, Save, Table as TableIcon, User } from 'lucide-react';
import { CalculatorState } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { VersionBadge } from '../ui/VersionBadge';

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
    const buttonClass = 'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-body font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50';

    return (
        <div data-calculator-results-bar className="hidden min-[960px]:block fixed bottom-0 left-0 right-0 bg-secondary-950 border-t border-secondary-800 py-3 px-6 z-50 text-white shadow-xl">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                <div className="min-w-0" aria-live="polite" aria-atomic="true">
                    <p className="text-body text-secondary-100">{resultLabel}</p>
                    <p className={calculationReady ? 'text-h2 font-bold tabular-nums' : 'text-body font-semibold'}>
                        {calculationReady ? formatCurrency(state.liquido) : resultMessage}
                    </p>
                    {!calculationReady && errorDetail && <p role="alert" className="mt-1 max-w-md break-words text-body text-secondary-100">{errorDetail}</p>}
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
                        <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border px-4 py-3 text-body font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${calculationReady
                            ? 'border-white bg-white text-secondary-900'
                            : 'border-secondary-400 text-secondary-100 hover:bg-white/10'}`}>
                            <Download size={18} aria-hidden="true" />Exportar<ChevronDown size={16} aria-hidden="true" />
                        </summary>
                        <div className="absolute bottom-full right-0 mb-3 w-52 space-y-1 rounded-xl border border-neutral-200 bg-white p-2 text-neutral-800 shadow-xl dark:border-neutral-600 dark:bg-neutral-800 dark:text-white">
                            <button type="button" title="Exportar PDF/Holerite" onClick={() => exportFile(onExportPDF)} disabled={!calculationReady} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-body font-semibold hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-700"><FileText size={18} aria-hidden="true" />PDF / Holerite</button>
                            <button type="button" title="Exportar Excel" onClick={() => exportFile(onExportExcel)} disabled={!calculationReady} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-body font-semibold hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-700"><TableIcon size={18} aria-hidden="true" />Excel</button>
                        </div>
                    </details>
                    <VersionBadge />
                </div>
            </div>
        </div>
    );
};
