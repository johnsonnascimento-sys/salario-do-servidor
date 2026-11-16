
import React from 'react';
import { FileText } from 'lucide-react';
import { CalculatorState } from '../../types';

interface ObservationsSectionProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
}

export const ObservationsSection: React.FC<ObservationsSectionProps> = ({ state, update, styles }) => {
    return (
        <section id="observacoes" tabIndex={-1} className={`${styles.card} scroll-mt-24`}>
            <h3 id="calculator-notes-label" className={styles.sectionTitle}>
                <FileText className="h-4 w-4" /> Observações / Notas
            </h3>
            <textarea
                aria-labelledby="calculator-notes-label"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-body-lg h-24 placeholder-neutral-400 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-y p-4 outline-none transition-all"
                placeholder="Digite aqui anotações sobre este cálculo para sair na impressão..."
                value={state.observacoes}
                onChange={e => update('observacoes', e.target.value)}
            />
        </section>
    );
};
