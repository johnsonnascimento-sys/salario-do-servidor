import { useState, type ReactNode } from 'react';
import { formatCurrency } from '../../utils/calculations';
import { calculateAtsPercentage, type getAtsCalculationContext } from '../../services/agency/engine/modules/atsCalculations';

const stepButtonClass = 'min-h-11 min-w-11 rounded-lg border border-neutral-300 font-semibold disabled:opacity-50 dark:border-neutral-700';

interface Props {
    id: string;
    percentual?: number;
    context: ReturnType<typeof getAtsCalculationContext>;
    onChange: (percentual: number | undefined) => void;
    fixedValueField: ReactNode;
    styles: Record<string, string>;
}

export function AtsValueFields({ id, percentual, context, onChange, fixedValueField, styles }: Props) {
    const [draft, setDraft] = useState<string | null>(null);
    const { limit, basicSalary } = context;
    const percentageMode = percentual !== undefined;
    const result = percentageMode ? calculateAtsPercentage(percentual, context) : undefined;
    const changeBy = (step: number) => {
        if (limit === undefined || percentual === undefined) return;
        const current = Number.isFinite(percentual) ? percentual : 0;
        const next = Math.round((current + step) * 100) / 100;
        setDraft(null);
        onChange(Math.min(limit, Math.max(0, next)));
    };

    return <div className="space-y-3">
        <div>
            <label htmlFor={`ats-mode-${id}`} className={styles.label}>Como informar o ATS</label>
            <select id={`ats-mode-${id}`} className={styles.input} value={percentageMode ? 'percentual' : 'fixo'}
                onChange={event => {
                    setDraft(null);
                    onChange(event.target.value === 'percentual' ? 0 : undefined);
                }}>
                <option value="fixo">Valor fixo (R$)</option>
                <option value="percentual" disabled={limit === undefined && !percentageMode}>Percentual (%)</option>
            </select>
        </div>
        {percentageMode ? <div className="space-y-2">
            <label htmlFor={`ats-percentual-${id}`} className={styles.label}>Percentual adquirido (%)</label>
            <div className="flex items-center gap-2">
                <button type="button" aria-label="Diminuir percentual de ATS" className={stepButtonClass}
                    disabled={limit === undefined || percentual <= 0} onClick={() => changeBy(-1)}>−</button>
                <input id={`ats-percentual-${id}`} inputMode="decimal" maxLength={12} className={`${styles.input} min-w-0`}
                    aria-invalid={Boolean(result?.error)} aria-describedby={`ats-details-${id}`}
                    value={draft ?? String(percentual).replace('.', ',')}
                    onChange={event => {
                        const value = event.target.value;
                        if (!/^\d*(?:[,.]\d{0,2})?$/.test(value)) return;
                        setDraft(value);
                        const parsed = Number(value.replace(',', '.'));
                        onChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    onBlur={() => setDraft(null)} />
                <button type="button" aria-label="Aumentar percentual de ATS" className={stepButtonClass}
                    disabled={limit === undefined || percentual >= limit} onClick={() => changeBy(1)}>+</button>
            </div>
            <div id={`ats-details-${id}`} className="space-y-1 text-body-xs">
                {limit !== undefined && <p>Limite: {limit.toLocaleString('pt-BR')}%.</p>}
                {basicSalary !== undefined && basicSalary > 0 && <p>Vencimento básico: {formatCurrency(basicSalary)}</p>}
                {result?.error && <p role="alert" className="text-error-700 dark:text-error-300">{result.error}</p>}
                {result?.amount !== undefined && <output aria-label="Valor calculado do ATS" className="block font-semibold">
                    ATS calculado: {formatCurrency(result.amount)}
                </output>}
            </div>
        </div> : fixedValueField}
    </div>;
}
