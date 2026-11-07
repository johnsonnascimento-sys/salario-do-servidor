import React from 'react';
import { ArrowDown } from 'lucide-react';

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
        <fieldset className="space-y-2 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <legend className={styles.label}>Competências originais do IR-EA</legend>
            <p className="text-body-xs">Informe todos os meses a que esta parcela se refere.</p>
            {value.length === 0 && <p role="status" className="text-body-xs text-warning-700 dark:text-warning-300">Revise esta parcela EA e informe as competências para calcular.</p>}
            {value.map((month, index) => <div key={index} className="flex items-center gap-2">
                <label className="flex-1"><span className="sr-only">Competência original {index + 1}</span>
                    <input type="month" className={styles.input} value={month} required onChange={event => onChange(value.map((item, i) => i === index ? event.target.value : item))} />
                </label>
                <button type="button" className="text-body-xs underline" onClick={() => onChange(value.filter((_, i) => i !== index))}>Remover mês {index + 1}</button>
            </div>)}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <button type="button" className="text-body-xs font-semibold underline" onClick={() => onChange([...value, ''])}>Adicionar competência original</button>
                <button
                    type="button"
                    onClick={scrollToIrEa}
                    className="inline-flex items-center gap-1 text-body-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                >
                    <span>Ver Apuração do IR-EA</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                </button>
            </div>
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                Esta parcela será apurada conjuntamente pelas regras de RRA (Lei 7.713/88).
            </p>
        </fieldset>
    );
};
