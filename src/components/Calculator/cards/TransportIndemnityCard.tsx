import React from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface Props {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatServiceCompetence = (comp?: string): string => {
    if (!comp || !/^\d{4}-(0[1-9]|1[0-2])$/.test(comp)) return '';
    const [year, month] = comp.split('-').map(Number);
    return `${MONTH_NAMES[month - 1]}/${year}`;
};

const formatDateBr = (date?: string | null): string => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
    return date.split('-').reverse().join('/');
};

export const TransportIndemnityCard: React.FC<Props> = ({ state, update, competenciaReferencia, styles, courtConfig }) => {
    const memory = state.transporteIndenizacaoMemory;
    const maxDays = memory?.maxDays || 31;
    const status = memory?.status === 'full' ? 'Integral' : memory?.status === 'proportional' ? 'Proporcional' : 'Sem valor a receber';
    const isDualCompetence = Boolean(memory?.serviceCompetence && memory.serviceCompetence !== memory.competence);
    const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
    const isCJF = orgSlug === 'cjf' || orgSlug.startsWith('trf');

    return (
        <div className={`${styles.innerBox} space-y-3`}>
            {isDualCompetence ? (
                <div className="space-y-1">
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
                        Mês da folha de pagamento: <strong>{competenciaReferencia}</strong>
                    </p>
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
                        Mês de execução do serviço externo: <strong>{formatServiceCompetence(memory?.serviceCompetence)}</strong>
                    </p>
                    <p className="text-body-xs text-neutral-500">
                        O pagamento é efetuado no mês seguinte ao da execução do serviço (art. 56 da Resolução CJF nº 4/2008).
                    </p>
                </div>
            ) : (
                <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
                    Competência da folha: <strong>{competenciaReferencia}</strong>
                </p>
            )}

            {isCJF ? (
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                    Destinado a Analista Judiciário, Área Judiciária, especialidade Oficial de Justiça Avaliador Federal (art. 54 da Resolução CJF nº 4/2008 c/c Portaria CJF nº 182/2026).
                </p>
            ) : (
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                    Destinado a Oficial de Justiça Avaliador Federal ou servidor designado como oficial de justiça ad hoc (ATN STM nº 212/2017).
                </p>
            )}

            {memory && memory.status !== 'unavailable' && memory.status !== 'invalid' ? (
                <>
                    <p className="text-body-sm text-neutral-600 dark:text-neutral-300">
                        Valor integral aplicável: <strong>{formatCurrency(memory.fullAmount)}</strong>
                    </p>
                    {memory.validFrom && (
                        <p className="text-body-xs text-neutral-500">
                            Vigência a partir de {formatDateBr(memory.validFrom)}{memory.validTo ? ` até ${formatDateBr(memory.validTo)}` : ''}.
                        </p>
                    )}
                    {memory.transitionWarning && (
                        <p role="status" className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-body-sm text-warning-700 dark:border-warning-700 dark:bg-warning-950 dark:text-warning-200">
                            {memory.transitionWarning}
                        </p>
                    )}
                </>
            ) : (
                <p role="status" className="text-body-sm text-warning-700">
                    {memory?.reason || 'Não há configuração aplicável para esta competência.'}
                </p>
            )}

            <div>
                <label htmlFor="transporte-indenizacao-dias" className={styles.label}>
                    Dias de serviço externo no mês{isDualCompetence ? ` (${formatServiceCompetence(memory?.serviceCompetence)})` : ''}
                </label>
                <input
                    id="transporte-indenizacao-dias"
                    type="number"
                    min="0"
                    max={maxDays}
                    step="1"
                    inputMode="numeric"
                    className={styles.input}
                    value={state.transporteIndenizacaoDias || ''}
                    placeholder="0"
                    onChange={e => {
                        const raw = e.target.value;
                        if (raw === '') { update('transporteIndenizacaoDias', 0); return; }
                        if (!/^\d+$/.test(raw)) return;
                        const value = Number(raw);
                        if (Number.isSafeInteger(value) && value <= maxDays) update('transporteIndenizacaoDias', value);
                    }}
                />
            </div>

            <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                Conte os dias em que houve diligência externa, e não a quantidade de mandados. Várias diligências na mesma data contam como um dia.
            </p>

            {isCJF ? (
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                    Considere apenas dias de efetivo serviço externo, excluindo férias, licenças e demais afastamentos, ainda que considerados em lei como de efetivo exercício (art. 56, parágrafo único). Não computar dias que servirem de base ao cálculo de diárias (art. 55, § 2º). É vedado suprimento de fundos ou uso de veículo oficial para a finalidade (art. 57). A prestação dos serviços depende de atestação pelo titular da unidade (art. 56); este valor é uma simulação.
                </p>
            ) : (
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">
                    Considere apenas dias elegíveis, excluindo afastamentos e demais impedimentos, inclusive os dias incompatíveis com diárias. O pagamento depende de comprovação e atestação; este valor é uma simulação.
                </p>
            )}

            {memory && !['unavailable', 'invalid', 'inactive'].includes(memory.status) && (
                <p className="text-body-sm font-semibold" role="status">
                    {status}
                </p>
            )}
        </div>
    );
};
