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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.12)] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-700 px-3 py-2.5 transition-all">
            {/* Header da barra mobile: Resultado Líquido e versão */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Resultado Líquido</p>
                    <p className="text-xl font-black text-neutral-800 dark:text-white tracking-tight brand-gradient-text leading-tight" aria-live="polite">
                        {calculationReady ? formatCurrency(liquido) : resultMessage}
                    </p>
                </div>
                <div className="flex items-center">
                    <VersionBadge />
                </div>
            </div>

            {/* Ações do rodapé diretamente visíveis */}
            <div className="grid grid-cols-5 gap-1.5 pt-2">
                <button
                    type="button"
                    onClick={onClearCalculator}
                    className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 py-2 px-1 rounded-xl transition-all duration-200 disabled:opacity-50 flex flex-col items-center justify-center gap-1 font-semibold text-[11px] active:scale-95 touch-manipulation"
                    title="Limpar calculadora"
                >
                    <RotateCcw size={17} />
                    <span className="truncate">Limpar</span>
                </button>

                <button
                    type="button"
                    onClick={onOpenPayslips}
                    className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 py-2 px-1 rounded-xl transition-all duration-200 disabled:opacity-50 flex flex-col items-center justify-center gap-1 font-semibold text-[11px] active:scale-95 touch-manipulation"
                    title="Meus holerites"
                >
                    <User size={17} />
                    <span className="truncate">Holerites</span>
                </button>

                <button
                    type="button"
                    onClick={onSavePayslip}
                    disabled={!calculationReady || savingPayslip}
                    className="bg-secondary-500/10 hover:bg-secondary-500 hover:text-white text-secondary-600 dark:text-secondary-400 py-2 px-1 rounded-xl transition-all duration-200 disabled:opacity-50 flex flex-col items-center justify-center gap-1 font-semibold text-[11px] active:scale-95 touch-manipulation"
                    title="Salvar na minha área"
                >
                    <Save size={17} />
                    <span className="truncate">{savingPayslip ? 'Salvando' : 'Salvar'}</span>
                </button>

                <button
                    type="button"
                    onClick={onExportPDF}
                    disabled={!calculationReady}
                    className="bg-error-500/10 hover:bg-error-500 hover:text-white text-error-600 dark:text-error-400 py-2 px-1 rounded-xl transition-all duration-200 disabled:opacity-50 flex flex-col items-center justify-center gap-1 font-semibold text-[11px] active:scale-95 touch-manipulation"
                    title="Exportar PDF"
                >
                    <FileText size={17} />
                    <span className="truncate">PDF</span>
                </button>

                <button
                    type="button"
                    onClick={onExportExcel}
                    disabled={!calculationReady}
                    className="bg-success-500/10 hover:bg-success-500 hover:text-white text-success-600 dark:text-success-400 py-2 px-1 rounded-xl transition-all duration-200 disabled:opacity-50 flex flex-col items-center justify-center gap-1 font-semibold text-[11px] active:scale-95 touch-manipulation"
                    title="Exportar Excel"
                >
                    <TableIcon size={17} />
                    <span className="truncate">Excel</span>
                </button>
            </div>
        </div>
    );
};
