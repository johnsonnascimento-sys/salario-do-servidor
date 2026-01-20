
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
        <section className={`${styles.card} mt-8`}>
            <h3 className={styles.sectionTitle}>
                <FileText className="h-4 w-4" /> Observações / Notas
            </h3>
            <textarea
                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm h-24 placeholder-slate-400 focus:border-secondary focus:ring-2 focus:ring-secondary/20 resize-none p-4 outline-none transition-all"
                placeholder="Digite aqui anotações sobre este cálculo para sair na impressão..."
                value={state.observacoes}
                onChange={e => update('observacoes', e.target.value)}
            />
        </section>
    );
};
