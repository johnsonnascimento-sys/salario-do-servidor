import React from 'react';
import { CalculatorState } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface Props {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
}

export const TransportIndemnityCard: React.FC<Props> = ({ state, update, competenciaReferencia, styles }) => {
    const memory = state.transporteIndenizacaoMemory;
    const maxDays = memory?.maxDays || 31;
    const status = memory?.status === 'full' ? 'Integral' : memory?.status === 'proportional' ? 'Proporcional' : 'Sem valor a receber';
    return <div className={`${styles.innerBox} space-y-3`}>
        <p className="text-body-sm text-neutral-600 dark:text-neutral-300">Competência da folha: <strong>{competenciaReferencia}</strong></p>
        {memory && memory.status !== 'unavailable' && memory.status !== 'invalid' ? <>
            <p className="text-body-sm text-neutral-600 dark:text-neutral-300">Valor integral aplicável: <strong>{formatCurrency(memory.fullAmount)}</strong></p>
            {memory.validFrom && <p className="text-body-xs text-neutral-500">Vigência a partir de {memory.validFrom.split('-').reverse().join('/')}{memory.validTo ? ` até ${memory.validTo.split('-').reverse().join('/')}` : ''}; considere apenas dias elegíveis dentro da vigência.</p>}
        </> : <p role="status" className="text-body-sm text-warning-700">{memory?.reason || 'Não há configuração aplicável para esta competência.'}</p>}
        <div>
            <label htmlFor="transporte-indenizacao-dias" className={styles.label}>Dias de serviço externo no mês</label>
            <input id="transporte-indenizacao-dias" type="number" min="0" max={maxDays} step="1" inputMode="numeric" className={styles.input}
                value={state.transporteIndenizacaoDias || ''} placeholder="0"
                onChange={e => {
                    const raw = e.target.value;
                    if (raw === '') { update('transporteIndenizacaoDias', 0); return; }
                    if (!/^\d+$/.test(raw)) return;
                    const value = Number(raw);
                    if (Number.isSafeInteger(value) && value <= maxDays) update('transporteIndenizacaoDias', value);
                }} />
        </div>
        <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Conte os dias em que houve diligência externa, e não a quantidade de mandados. Várias diligências na mesma data contam como um dia.</p>
        <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Considere apenas dias elegíveis, excluindo afastamentos e demais impedimentos, inclusive os dias incompatíveis com diárias. O pagamento depende de comprovação e atestação; este valor é uma simulação.</p>
        {memory && !['unavailable', 'invalid', 'inactive'].includes(memory.status) && <p className="text-body-sm font-semibold" role="status">{status}</p>}
    </div>;
};
