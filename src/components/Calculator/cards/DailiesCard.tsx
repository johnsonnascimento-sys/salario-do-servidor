import React, { useMemo } from 'react';
import { Plane } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import {
    resolveDailiesDailyRate,
    resolveDailiesDiscountRules,
    summarizeDailiesPeriodMode
} from '../../../utils/dailiesRules';

interface DailiesCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    courtConfig?: CourtConfig | null;
}

const toNonNegativeNumber = (value: string) => Math.max(0, Number(value) || 0);
const formatIsoDatePtBr = (isoDate: string) => {
    const [year, month, day] = isoDate.split('-');
    if (!year || !month || !day) return isoDate;
    return `${day}/${month}/${year}`;
};
const formatDateList = (dates: string[]) => (
    dates.length > 0 ? dates.map(formatIsoDatePtBr).join(', ') : 'nenhum'
);
const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const formatCurrencyBr = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const DailiesCard: React.FC<DailiesCardProps> = ({ state, update, styles, courtConfig }) => {
    const dailiesConfig = courtConfig?.dailies;
    const transportWorkdays = Number(courtConfig?.payrollRules?.transportWorkdays || 22);
    const isPeriodMode = state.diariasModoDesconto === 'periodo';

    const discountRules = useMemo(
        () => resolveDailiesDiscountRules(dailiesConfig, transportWorkdays),
        [dailiesConfig, transportWorkdays]
    );
    const periodDiscountRules = useMemo(
        () => ({ ...discountRules, excludeWeekendsAndHolidays: true }),
        [discountRules]
    );
    const dailyRate = useMemo(
        () => resolveDailiesDailyRate({
            dailiesConfig,
            cargo: state.cargo,
            hasCommissionRole: Boolean(state.funcao && state.funcao.toLowerCase().startsWith('cj'))
        }),
        [dailiesConfig, state.cargo, state.funcao]
    );

    const periodSummary = useMemo(() => (
        summarizeDailiesPeriodMode(state.diariasDataInicio, state.diariasDataFim, periodDiscountRules)
    ), [state.diariasDataInicio, state.diariasDataFim, periodDiscountRules]);

    const periodTravelDays = periodSummary?.totalDays ?? Math.max(0, state.diariasQtd || 0);
    const paidDailiesQty = periodSummary?.payableDays ?? periodTravelDays;
    const automaticDiscountDays = periodSummary?.discountDays ?? paidDailiesQty;
    const hasValidDateRange = periodSummary !== null;
    const ldoCapEnabled = Boolean(dailiesConfig?.ldoCap?.enabled);
    const ldoCapValue = Number(dailiesConfig?.ldoCap?.perDiemLimit || 0);
    const ministerPerDiemValue = Number(dailiesConfig?.derivedFromMinister?.ministerPerDiem || 0);
    const halfDailyValue = periodSummary?.halfDailyApplied ? dailyRate / 2 : 0;
    const halfFoodDiscountValue = periodSummary?.halfDiscountApplied && state.diariasDescontarAlimentacao
        ? (state.auxAlimentacao / discountRules.foodDivisor) * 0.5
        : 0;
    const halfTransportDiscountValue = periodSummary?.halfDiscountApplied && state.diariasDescontarTransporte
        ? (state.auxTransporteValor / discountRules.transportDivisor) * 0.5
        : 0;
    const configuredHolidayDates = useMemo(
        () =>
            Array.from(new Set((discountRules.holidays || []).filter(isIsoDate)))
                .sort((a, b) => a.localeCompare(b)),
        [discountRules.holidays]
    );
    const holidayYears = useMemo(
        () => Array.from(new Set(configuredHolidayDates.map((date) => date.slice(0, 4)))).sort(),
        [configuredHolidayDates]
    );
    const holidayYearsLabel = holidayYears.length > 0 ? holidayYears.join(', ') : 'sem ano definido';
    const holidayCalendarLabel =
        discountRules.holidayCalendarLabel?.trim() ||
        `Calendário oficial de feriados cadastrado no painel (${holidayYearsLabel})`;

    const handleModeChange = (mode: 'periodo' | 'manual') => {
        update('diariasModoDesconto', mode);

        if (mode === 'periodo') {
            update('diariasDiasDescontoAlimentacao', 0);
            update('diariasDiasDescontoTransporte', 0);
            return;
        }

        update('diariasDataInicio', '');
        update('diariasDataFim', '');
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Plane className="w-4 h-4" /> Diárias
            </h3>

            <div className="space-y-6">
                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Diárias de viagem</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="radio"
                                    name="diarias_modo_lancamento"
                                    className={styles.checkbox}
                                    checked={isPeriodMode}
                                    onChange={() => handleModeChange('periodo')}
                                />
                                <span>Lançar por datas</span>
                            </label>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="radio"
                                    name="diarias_modo_lancamento"
                                    className={styles.checkbox}
                                    checked={!isPeriodMode}
                                    onChange={() => handleModeChange('manual')}
                                />
                                <span>Lançar por quantidade de diárias</span>
                            </label>
                        </div>

                        {isPeriodMode ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Data de início</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={state.diariasDataInicio}
                                            onChange={e => update('diariasDataInicio', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>Data de fim</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={state.diariasDataFim}
                                            onChange={e => update('diariasDataFim', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-body-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300">
                                    {hasValidDateRange
                                        ? (
                                            <>
                                                <p>Quantidade de diárias no período (calendário): {periodTravelDays}.</p>
                                                <p>Quantidade de diárias pagas no período: {paidDailiesQty}.</p>
                                                {periodSummary?.halfDailyApplied ? (
                                                    <p>
                                                        Retorno em {periodSummary.returnDateIsBusinessDay ? 'dia útil' : periodSummary.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary.returnDate)}): meia diária aplicada ({formatCurrencyBr(halfDailyValue)}).
                                                    </p>
                                                ) : (
                                                    <p>
                                                        Retorno em {periodSummary?.returnDateIsBusinessDay ? 'dia útil' : periodSummary?.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary!.returnDate)}), mas regra de meia diária está desativada.
                                                    </p>
                                                )}
                                            </>
                                        )
                                        : 'Preencha início e fim para calcular automaticamente a quantidade de diárias.'}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className={styles.label}>Quantidade de diárias</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    className={styles.input}
                                    value={state.diariasQtd || ''}
                                    onChange={e => update('diariasQtd', toNonNegativeNumber(e.target.value))}
                                    placeholder="0"
                                    data-calculator="true"
                                />
                            </div>
                        )}

                        <div>
                            <label className={styles.label}>Adicional de embarque</label>
                            <select
                                className={styles.input}
                                value={state.diariasEmbarque}
                                onChange={e => update('diariasEmbarque', e.target.value)}
                            >
                                <option value="nenhum">Nenhum</option>
                                <option value="metade">Metade (ida ou volta)</option>
                                <option value="completo">Completo (ida e volta)</option>
                            </select>
                        </div>

                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-body-xs text-neutral-600 dark:text-neutral-300 space-y-1">
                            <p>Valores de diárias seguem a tabela vigente e não acompanham o mês/ano selecionado.</p>
                            <p>{holidayCalendarLabel} usado no desconto automático por datas.</p>
                            <p>Datas de feriados oficiais cadastradas: {formatDateList(configuredHolidayDates)}.</p>
                            <p>Divisor do auxílio-alimentação: {discountRules.foodDivisor} dias</p>
                            <p>Divisor do auxílio-transporte: {discountRules.transportDivisor} dias</p>
                            <p>
                                Regra de retorno:
                                {discountRules.halfDailyOnBusinessReturnDay ? ' meia diária ativa em qualquer dia' : ' meia diária inativa'} e
                                {discountRules.halfDiscountOnBusinessReturnDay ? ' meio desconto de auxílios apenas em dia útil' : ' meio desconto de auxílios inativo'}.
                            </p>
                            {ldoCapEnabled && ldoCapValue > 0 && (
                                <p>
                                    Teto LDO por diária: {formatCurrencyBr(ldoCapValue)}
                                </p>
                            )}
                            <p>Diária do ministro: {ministerPerDiemValue > 0 ? formatCurrencyBr(ministerPerDiemValue) : 'não configurada'}.</p>
                        </div>
                    </div>
                </div>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Descontos internos</h4>
                    <div className="space-y-4">
                        <div className="flex gap-4 flex-wrap">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.diariasDescontarAlimentacao}
                                    onChange={e => update('diariasDescontarAlimentacao', e.target.checked)}
                                />
                                <span>Descontar auxílio-alimentação</span>
                            </label>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.diariasDescontarTransporte}
                                    onChange={e => update('diariasDescontarTransporte', e.target.checked)}
                                />
                                <span>Descontar auxílio-transporte</span>
                            </label>
                        </div>

                        {isPeriodMode ? (
                            <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-body-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300">
                                {hasValidDateRange
                                    ? (
                                        periodSummary
                                            ? (
                                                <>
                                                    <p>Dias usados no desconto: {automaticDiscountDays}.</p>
                                                    <p>Dias não descontados por finais de semana e feriados: {periodSummary.excludedDays}.</p>
                                                    {periodSummary.halfDiscountApplied ? (
                                                        <p>
                                                            Retorno em dia útil ({formatIsoDatePtBr(periodSummary.returnDate)}): meio desconto de auxílios aplicado
                                                            {state.diariasDescontarAlimentacao ? ` | alimentação: ${formatCurrencyBr(halfFoodDiscountValue)}` : ''}
                                                            {state.diariasDescontarTransporte ? ` | transporte: ${formatCurrencyBr(halfTransportDiscountValue)}` : ''}.
                                                        </p>
                                                    ) : (
                                                        !periodSummary.returnDateIsBusinessDay && (
                                                            <p>
                                                                Retorno em {periodSummary.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary.returnDate)}): sem desconto de auxílios no dia do retorno.
                                                            </p>
                                                        )
                                                    )}
                                                    <p>Finais de semana considerados para não desconto: {formatDateList(periodSummary.weekendExcludedDates)}.</p>
                                                    <p>Feriados considerados para não desconto: {formatDateList(periodSummary.holidayExcludedDates)}.</p>
                                                </>
                                            )
                                            : `Dias usados no desconto: ${automaticDiscountDays}.`
                                    )
                                    : 'Preencha início e fim para calcular automaticamente os dias de desconto.'}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-body-xs text-neutral-600 dark:text-neutral-300">
                                    No modo por quantidade, os dias de desconto dos auxílios devem ser informados manualmente.
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Dias para desconto do auxílio-alimentação</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            className={styles.input}
                                            value={state.diariasDiasDescontoAlimentacao || ''}
                                            onChange={e => update('diariasDiasDescontoAlimentacao', toNonNegativeNumber(e.target.value))}
                                            placeholder="0"
                                            data-calculator="true"
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>Dias para desconto do auxílio-transporte</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            className={styles.input}
                                            value={state.diariasDiasDescontoTransporte || ''}
                                            onChange={e => update('diariasDiasDescontoTransporte', toNonNegativeNumber(e.target.value))}
                                            placeholder="0"
                                            data-calculator="true"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Auxílios recebidos no deslocamento (glosa)</h4>
                    <div className="space-y-2">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.diariasExtHospedagem}
                                onChange={e => update('diariasExtHospedagem', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Hospedagem fornecida
                        </label>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.diariasExtAlimentacao}
                                onChange={e => update('diariasExtAlimentacao', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Alimentação fornecida
                        </label>

                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.diariasExtTransporte}
                                onChange={e => update('diariasExtTransporte', e.target.checked)}
                                className={styles.checkbox}
                            />
                            Transporte fornecido
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
