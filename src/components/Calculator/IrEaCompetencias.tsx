import React from 'react';

interface Props {
    value?: string[];
    onChange: (value: string[]) => void;
    styles: any;
}

/** Collect original months without inferring them from the payment reference. */
export const IrEaCompetencias: React.FC<Props> = ({ value = [], onChange, styles }) => (
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
        <button type="button" className="text-body-xs font-semibold underline" onClick={() => onChange([...value, ''])}>Adicionar competência original</button>
    </fieldset>
);
