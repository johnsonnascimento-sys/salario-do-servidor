import React from 'react';
import { ArrowDown, Plus, Trash2, AlertCircle } from 'lucide-react';

interface Props {
    value?: string[];
    onChange: (value: string[]) => void;
    styles: any;
}

/** Collect original months without inferring them from the payment reference. */
export const IrEaCompetencias: React.FC<Props> = ({ value = [], onChange, styles }) => {
    const scrollToIrEa = () => {
        if (typeof document === 'undefined') return;
        const target = document.getElementById('apuracao-ir-ea');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('ring-2', 'ring-primary-500', 'transition-all', 'duration-500');
            setTimeout(() => {
                target.classList.remove('ring-2', 'ring-primary-500');
            }, 2000);
        }
    };

    return (
        <fieldset className="space-y-3 rounded-2xl border border-neutral-200/90 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-900/40 p-4">
            <legend className={styles.label}>Competências originais do IR-EA</legend>
            <p className="text-body-xs text-neutral-600 dark:text-neutral-400">Informe todos os meses a que esta parcela se refere.</p>
            {value.length === 0 && (
                <div role="status" className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-body-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Revise esta parcela EA e informe as competências de origem para calcular o RRA.</span>
                </div>
            )}
            {value.length > 0 && (
                <div className="space-y-2">
                    {value.map((month, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <label className="flex-1">
                                <span className="sr-only">Competência original {index + 1}</span>
                                <input
                                    type="month"
                                    className={styles.input}
                                    value={month}
                                    required
                                    onChange={event => onChange(value.map((item, i) => i === index ? event.target.value : item))}
                                />
                            </label>
                            <button
                                type="button"
                                title={`Remover competência ${index + 1}`}
                                aria-label={`Remover competência ${index + 1}`}
                                onClick={() => onChange(value.filter((_, i) => i !== index))}
                                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-error-300 dark:hover:border-error-700 bg-white dark:bg-neutral-800 hover:bg-error-50 dark:hover:bg-error-950/40 text-neutral-400 hover:text-error-600 dark:hover:text-error-400 transition-all shrink-0 cursor-pointer shadow-xs"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <button
                    type="button"
                    onClick={() => onChange([...value, ''])}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/15 transition-all text-body-xs font-bold uppercase tracking-wider shadow-xs cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar competência original</span>
                </button>
                <button
                    type="button"
                    onClick={scrollToIrEa}
                    className="inline-flex items-center gap-1 text-body-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                >
                    <span>Ver Apuração do IR-EA</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                Esta parcela será apurada conjuntamente pelas regras de RRA (Lei 7.713/88).
            </p>
        </fieldset>
    );
};
