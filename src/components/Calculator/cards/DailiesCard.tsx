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
    competenciaReferencia: string;
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
const isEndBeforeStart = (startDate: string, endDate: string) =>
    isIsoDate(startDate) && isIsoDate(endDate) && endDate < startDate;

export const DailiesCard: React.FC<DailiesCardProps> = ({ state, update, styles, courtConfig, competenciaReferencia }) => {
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

    const periodTravelQty = periodSummary?.totalDays ?? Math.max(0, state.diariasQtd || 0);
    const paidDailiesQty = periodSummary?.payableDays ?? periodTravelQty;
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
    const configuredHolidayDates = useMemo<string[]>(() => {
        const dates = (discountRules.holidays || []) as unknown[];
        const isoDates = dates.filter((date): date is string => typeof date === 'string' && isIsoDate(date));
        return Array.from(new Set(isoDates)).sort((a, b) => a.localeCompare(b));
    }, [discountRules.holidays]);
    const holidayYears = useMemo(
        () => Array.from(new Set(configuredHolidayDates.map((date) => date.slice(0, 4)))).sort(),
        [configuredHolidayDates]
    );
    const holidayYearsLabel = holidayYears.length > 0 ? holidayYears.join(', ') : 'sem ano definido';
    const holidayCalendarLabel =
        discountRules.holidayCalendarLabel?.trim() ||
        `Calendario oficial de feriados cadastrado no painel (${holidayYearsLabel})`;

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

    const handleStartDateChange = (nextStartDate: string) => {
        update('diariasDataInicio', nextStartDate);
        if (isEndBeforeStart(nextStartDate, state.diariasDataFim)) {
            update('diariasDataFim', nextStartDate);
        }
    };

    const handleEndDateChange = (nextEndDate: string) => {
        if (isEndBeforeStart(state.diariasDataInicio, nextEndDate)) {
            update('diariasDataFim', state.diariasDataInicio);
            return;
        }
        update('diariasDataFim', nextEndDate);
    };

    return (
        <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Plane className="w-4 h-4" /> Diarias
            </h3>

            <div className="space-y-6">
                <div>
                    <label className={styles.label}>Competencia da rubrica (MM/AAAA) - informativo</label>
                    <input type="text" className={styles.input} value={competenciaReferencia} readOnly />
                </div>

                <div className={styles.innerBox}>
                    <h4 className={styles.innerBoxTitle}>Diarias de viagem</h4>
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
                                <span>Lancar por datas</span>
                            </label>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="radio"
                                    name="diarias_modo_lancamento"
                                    className={styles.checkbox}
                                    checked={!isPeriodMode}
                                    onChange={() => handleModeChange('manual')}
                                />
                                <span>Lancar por quantidade de diarias</span>
                            </label>
                        </div>

                        {isPeriodMode ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Data de inicio</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={state.diariasDataInicio}
                                            max={state.diariasDataFim || undefined}
                                            onChange={e => handleStartDateChange(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className={styles.label}>Data de fim</label>
                                        <input
                                            type="date"
                                            className={styles.input}
                                            value={state.diariasDataFim}
                                            min={state.diariasDataInicio || undefined}
                                            onChange={e => handleEndDateChange(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-body-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300">
                                    {hasValidDateRange
                                        ? (
                                            <>
                                                <p>Quantidade de diarias no periodo (calendario): {periodTravelQty}.</p>
                                                <p>Quantidade de diarias pagas no periodo: {paidDailiesQty}.</p>
                                                {periodSummary?.halfDailyApplied ? (
                                                    <p>
                                                        Retorno em {periodSummary.returnDateIsBusinessDay ? 'dia util' : periodSummary.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary.returnDate)}): meia diaria aplicada ({formatCurrencyBr(halfDailyValue)}).
                                                    </p>
                                                ) : (
                                                    <p>
                                                        Retorno em {periodSummary?.returnDateIsBusinessDay ? 'dia util' : periodSummary?.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary!.returnDate)}), mas regra de meia diaria esta desativada.
                                                    </p>
                                                )}
                                            </>
                                        )
                                        : 'Preencha inicio e fim para calcular automaticamente a quantidade de diarias.'}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className={styles.label}>Quantidade de diarias</label>
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
                            <p>Valores de diarias seguem a tabela vigente e nao acompanham o mes/ano selecionado.</p>
                            <p>{holidayCalendarLabel} usado no desconto automatico por datas.</p>
                            <p>Datas de feriados oficiais cadastradas: {formatDateList(configuredHolidayDates)}.</p>
                            <p>Divisor do auxilio-alimentacao: {discountRules.foodDivisor} dias</p>
                            <p>Divisor do auxilio-transporte: {discountRules.transportDivisor} dias</p>
                            <p>
                                Regra de retorno:
                                {discountRules.halfDailyOnBusinessReturnDay ? ' meia diaria ativa em qualquer dia' : ' meia diaria inativa'} e
                                {discountRules.halfDiscountOnBusinessReturnDay ? ' meio desconto de auxilios apenas em dia util' : ' meio desconto de auxilios inativo'}.
                            </p>
                            {ldoCapEnabled && ldoCapValue > 0 && (
                                <p>
                                    Teto LDO por diaria: {formatCurrencyBr(ldoCapValue)}
                                </p>
                            )}
                            <p>Diaria do ministro: {ministerPerDiemValue > 0 ? formatCurrencyBr(ministerPerDiemValue) : 'nao configurada'}.</p>
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
                                <span>Descontar auxilio-alimentacao</span>
                            </label>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.diariasDescontarTransporte}
                                    onChange={e => update('diariasDescontarTransporte', e.target.checked)}
                                />
                                <span>Descontar auxilio-transporte</span>
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
                                                    <p>Dias nao descontados por finais de semana e feriados: {periodSummary.excludedDays}.</p>
                                                    {periodSummary.halfDiscountApplied ? (
                                                        <p>
                                                            Retorno em dia util ({formatIsoDatePtBr(periodSummary.returnDate)}): meio desconto de auxilios aplicado
                                                            {state.diariasDescontarAlimentacao ? ` | alimentacao: ${formatCurrencyBr(halfFoodDiscountValue)}` : ''}
                                                            {state.diariasDescontarTransporte ? ` | transporte: ${formatCurrencyBr(halfTransportDiscountValue)}` : ''}.
                                                        </p>
                                                    ) : (
                                                        !periodSummary.returnDateIsBusinessDay && (
                                                            <p>
                                                                Retorno em {periodSummary.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary.returnDate)}): sem desconto de auxilios no dia do retorno.
                                                            </p>
                                                        )
                                                    )}
                                                    <p>Finais de semana considerados para nao desconto: {formatDateList(periodSummary.weekendExcludedDates)}.</p>
                                                    <p>Feriados considerados para nao desconto: {formatDateList(periodSummary.holidayExcludedDates)}.</p>
                                                </>
                                            )
                                            : `Dias usados no desconto: ${automaticDiscountDays}.`
                                    )
                                    : 'Preencha inicio e fim para calcular automaticamente os dias de desconto.'}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-body-xs text-neutral-600 dark:text-neutral-300">
                                    No modo por quantidade, os dias de desconto dos auxilios devem ser informados manualmente.
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Dias para desconto do auxilio-alimentacao</label>
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
                                        <label className={styles.label}>Dias para desconto do auxilio-transporte</label>
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
                    <h4 className={styles.innerBoxTitle}>Auxilios recebidos no deslocamento (glosa)</h4>
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
                            Alimentacao fornecida
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
