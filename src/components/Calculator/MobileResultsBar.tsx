import React from 'react';
import { FileText, RotateCcw, Save, Table as TableIcon, User } from 'lucide-react';
import { VersionBadge } from '../ui/VersionBadge';
import { formatCurrency } from '../../utils/calculations';

interface MobileResultsBarProps {
    liquido: number;
    onExportPDF: () => void;
    onExportExcel: () => void;
    onSavePayslip?: () => void;
    onOpenPayslips?: () => void;
    onClearCalculator?: () => void;
    calculationReady?: boolean;
    resultMessage?: string;
    savingPayslip?: boolean;
}

export const MobileResultsBar: React.FC<MobileResultsBarProps> = ({
    liquido,
    onExportPDF,
    onExportExcel,
    onSavePayslip,
    onOpenPayslips,
    onClearCalculator,
    calculationReady = true,
    resultMessage = 'Calculando...',
    savingPayslip = false,
}) => {
    return (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 w-full max-w-full overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-700 shadow-[0_-4px_12px_rgba(0,0,0,0.12)] px-3 py-2.5">
            {/* Linha superior: Resultado Líquido e versão */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Resultado Líquido
                    </p>
                    <p
                        className="text-lg font-black text-neutral-800 dark:text-white tracking-tight brand-gradient-text leading-tight truncate"
                        aria-live="polite"
                    >
                        {calculationReady ? formatCurrency(liquido) : resultMessage}
                    </p>
                </div>
                <div className="shrink-0">
                    <VersionBadge />
                </div>
            </div>

            {/* Ações organizadas em 2 linhas fluidas: 100% responsivo, sem transbordo lateral */}
            <div className="space-y-1.5 pt-2">
                {/* Linha de ações secundárias: 3 colunas bem distribuídas */}
                <div className="grid grid-cols-3 gap-1.5">
                    <button
                        type="button"
                        onClick={onClearCalculator}
                        className="min-w-0 flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 py-2 px-2 rounded-xl transition-all duration-150 disabled:opacity-50 text-body-xs font-semibold active:scale-95 touch-manipulation"
                        title="Limpar calculadora"
                    >
                        <RotateCcw size={15} className="shrink-0" />
                        <span className="truncate">Limpar</span>
                    </button>

                    <button
                        type="button"
                        onClick={onOpenPayslips}
                        className="min-w-0 flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 py-2 px-2 rounded-xl transition-all duration-150 disabled:opacity-50 text-body-xs font-semibold active:scale-95 touch-manipulation"
                        title="Meus holerites"
                    >
                        <User size={15} className="shrink-0" />
                        <span className="truncate">Holerites</span>
                    </button>

                    <button
                        type="button"
                        onClick={onSavePayslip}
                        disabled={!calculationReady || savingPayslip}
                        className="min-w-0 flex items-center justify-center gap-1.5 bg-secondary-500/10 hover:bg-secondary-500 hover:text-white text-secondary-600 dark:text-secondary-400 py-2 px-2 rounded-xl transition-all duration-150 disabled:opacity-50 text-body-xs font-semibold active:scale-95 touch-manipulation"
                        title="Salvar na minha área"
                    >
                        <Save size={15} className="shrink-0" />
                        <span className="truncate">{savingPayslip ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                </div>

                {/* Linha de exportação principal: 2 botões destacados e fáceis de tocar */}
                <div className="grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        onClick={onExportPDF}
                        disabled={!calculationReady}
                        className="min-w-0 flex items-center justify-center gap-2 bg-error-500/10 hover:bg-error-500 hover:text-white text-error-600 dark:text-error-400 py-2.5 px-3 rounded-xl transition-all duration-150 disabled:opacity-50 text-body-xs font-bold uppercase tracking-wider active:scale-95 touch-manipulation"
                        title="Exportar PDF"
                    >
                        <FileText size={16} className="shrink-0" />
                        <span className="truncate">Exportar PDF</span>
                    </button>

                    <button
                        type="button"
                        onClick={onExportExcel}
                        disabled={!calculationReady}
                        className="min-w-0 flex items-center justify-center gap-2 bg-success-500/10 hover:bg-success-500 hover:text-white text-success-600 dark:text-success-400 py-2.5 px-3 rounded-xl transition-all duration-150 disabled:opacity-50 text-body-xs font-bold uppercase tracking-wider active:scale-95 touch-manipulation"
                        title="Exportar Excel"
                    >
                        <TableIcon size={16} className="shrink-0" />
                        <span className="truncate">Exportar Excel</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
