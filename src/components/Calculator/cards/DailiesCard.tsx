import React, { useMemo } from 'react';
import { Plane } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import {
    enumerateDaysInRange,
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

    const normativeInfo = dailiesConfig?.normativeInfo;
    const embarkationLabel = dailiesConfig?.embarkationLabel?.trim() || 'Adicional de embarque';

    const userHolidays = state.diariasFeriados || [];

    const discountRules = useMemo(
        () => resolveDailiesDiscountRules(dailiesConfig, transportWorkdays),
        [dailiesConfig, transportWorkdays]
    );
    const periodDiscountRules = useMemo(
        () => ({ ...discountRules, excludeWeekendsAndHolidays: true, holidays: userHolidays }),
        [discountRules, userHolidays]
    );
    const isMagistrate = useMemo(() => {
        const norm = (state.cargo || '').toLowerCase();
        return norm.includes('juiz') || norm.includes('desembargador') || norm.includes('magistrado');
    }, [state.cargo]);

    const dailyRate = useMemo(
        () => resolveDailiesDailyRate({
            dailiesConfig,
            cargo: state.cargo,
            funcao: state.funcao,
            hasCommissionRole: Boolean(state.funcao && state.funcao.toLowerCase().startsWith('cj')),
            assessoramentoMagistrado: Boolean(state.diariasAssessoramentoMagistrado)
        }),
        [dailiesConfig, state.cargo, state.funcao, state.diariasAssessoramentoMagistrado]
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

    const rangeDays = useMemo(() => {
        if (!state.diariasDataInicio || !state.diariasDataFim) return [];
        return enumerateDaysInRange(state.diariasDataInicio, state.diariasDataFim);
    }, [state.diariasDataInicio, state.diariasDataFim]);

    const weekdaysInRange = useMemo(() => rangeDays.filter(d => !d.isWeekend), [rangeDays]);

    const toggleHolidayDate = (isoDate: string) => {
        const current = new Set(state.diariasFeriados || []);
        if (current.has(isoDate)) {
            current.delete(isoDate);
        } else {
            current.add(isoDate);
        }
        update('diariasFeriados', Array.from(current).sort());
    };

    const clearHolidayDates = () => {
        update('diariasFeriados', []);
    };

    const handleModeChange = (mode: 'periodo' | 'manual') => {
        update('diariasModoDesconto', mode);

        if (mode === 'periodo') {
            update('diariasDiasDescontoAlimentacao', 0);
            update('diariasDiasDescontoTransporte', 0);
            return;
        }

        update('diariasDataInicio', '');
        update('diariasDataFim', '');
        update('diariasFeriados', []);
    };

    const handleStartDateChange = (nextStartDate: string) => {
        update('diariasDataInicio', nextStartDate);
        const effectiveEnd = isEndBeforeStart(nextStartDate, state.diariasDataFim) ? nextStartDate : state.diariasDataFim;
        if (isEndBeforeStart(nextStartDate, state.diariasDataFim)) {
            update('diariasDataFim', nextStartDate);
        }
        if (state.diariasFeriados && state.diariasFeriados.length > 0) {
            const filtered = state.diariasFeriados.filter(d => d >= nextStartDate && (!effectiveEnd || d <= effectiveEnd));
            if (filtered.length !== state.diariasFeriados.length) {
                update('diariasFeriados', filtered);
            }
        }
    };

    const handleEndDateChange = (nextEndDate: string) => {
        let effectiveEnd = nextEndDate;
        if (isEndBeforeStart(state.diariasDataInicio, nextEndDate)) {
            effectiveEnd = state.diariasDataInicio;
            update('diariasDataFim', state.diariasDataInicio);
        } else {
            update('diariasDataFim', nextEndDate);
        }
        if (state.diariasFeriados && state.diariasFeriados.length > 0) {
            const filtered = state.diariasFeriados.filter(d => (!state.diariasDataInicio || d >= state.diariasDataInicio) && d <= effectiveEnd);
            if (filtered.length !== state.diariasFeriados.length) {
                update('diariasFeriados', filtered);
            }
        }
    };

    return (
        <div className={styles.card}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className={styles.sectionTitle}>
                    <Plane className="w-4 h-4" /> Diárias
                </h3>
                {normativeInfo && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[11px] font-medium leading-tight">
                        <span>🏛️</span>
                        <span>
                            {normativeInfo.branchRuleLabel || normativeInfo.generalRuleLabel || 'Regulamentação PJU'}
                            {normativeInfo.branchRuleLabel && normativeInfo.generalRuleLabel && (
                                <span className="text-amber-700/80 dark:text-amber-300/80 font-normal"> (c/c {normativeInfo.generalRuleLabel})</span>
                            )}
                        </span>
                    </div>
                )}
            </div>

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
                                <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-body-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300 space-y-2">
                                    {hasValidDateRange
                                        ? (
                                            <>
                                                <div>
                                                    <p>Quantidade de diárias no período (calendário): {periodTravelQty}.</p>
                                                    <p>Quantidade de diárias pagas no período: {paidDailiesQty}.</p>
                                                    {periodSummary?.halfDailyApplied ? (
                                                        <p>
                                                            Retorno em {periodSummary.returnDateIsBusinessDay ? 'dia útil' : periodSummary.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary.returnDate)}): meia diária aplicada ({formatCurrencyBr(halfDailyValue)}).
                                                        </p>
                                                    ) : (
                                                        <p>
                                                            Retorno em {periodSummary?.returnDateIsBusinessDay ? 'dia útil' : periodSummary?.returnDateIsWeekend ? 'fim de semana' : 'feriado'} ({formatIsoDatePtBr(periodSummary!.returnDate)}), mas a regra de meia diária está desativada.
                                                        </p>
                                                    )}
                                                </div>

                                                {weekdaysInRange.length > 0 ? (
                                                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/80 space-y-1.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                                                Feriados e pontos facultativos na viagem
                                                            </span>
                                                            {(state.diariasFeriados || []).length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={clearHolidayDates}
                                                                    className="text-[11px] text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 underline cursor-pointer font-medium"
                                                                >
                                                                    Limpar marcados ({(state.diariasFeriados || []).length})
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-tight">
                                                            Sábados e domingos já são excluídos automaticamente dos descontos. Clique nos dias úteis que foram feriado ou ponto facultativo na sua localidade:
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {weekdaysInRange.map((day) => {
                                                                const isHoliday = (state.diariasFeriados || []).includes(day.isoDate);
                                                                const isReturnDay = day.isoDate === periodSummary?.returnDate;
                                                                return (
                                                                    <button
                                                                        key={day.isoDate}
                                                                        type="button"
                                                                        onClick={() => toggleHolidayDate(day.isoDate)}
                                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer border ${
                                                                            isHoliday
                                                                                ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700 shadow-xs'
                                                                                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-700/70'
                                                                        }`}
                                                                        title={isHoliday ? 'Clique para desmarcar feriado' : 'Clique para marcar como feriado/ponto facultativo'}
                                                                    >
                                                                        <span>{day.weekdayLabel}, {day.formattedDate}</span>
                                                                        {isHoliday ? (
                                                                            <span className="text-[10px] bg-amber-600 dark:bg-amber-500 text-white font-bold px-1 rounded-xs">Feriado</span>
                                                                        ) : (
                                                                            isReturnDay && <span className="text-[10px] text-neutral-400 dark:text-neutral-500">(retorno)</span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic pt-1 border-t border-neutral-200 dark:border-neutral-700/80">
                                                        O período selecionado compreende apenas finais de semana (já excluídos automaticamente dos descontos).
                                                    </p>
                                                )}
                                            </>
                                        )
                                        : 'Preencha início e fim para calcular automaticamente a quantidade de diárias.'}
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
                            <label className={styles.label}>{embarkationLabel}</label>
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

                        {!isMagistrate && (
                            <div className="pt-0.5">
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={state.diariasAssessoramentoMagistrado}
                                        onChange={e => update('diariasAssessoramentoMagistrado', e.target.checked)}
                                    />
                                    <span>Viagem em assessoramento direto a magistrado (diária a 80% do STF)</span>
                                </label>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pl-6 pt-0.5 leading-relaxed">
                                    Aplica o percentual especial de 80% da diária de Ministro do STF quando o servidor viaja para prestar assistência direta a magistrado (art. 6º, § 1º, da Resolução CNJ nº 73/2009).
                                </p>
                            </div>
                        )}

                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-body-xs text-neutral-600 dark:text-neutral-300 space-y-1">
                            <p>Os valores de diárias seguem a tabela vigente e não acompanham o mês/ano selecionado.</p>
                            <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                                Valor unitário da diária: {dailyRate > 0 ? formatCurrencyBr(dailyRate) : 'R$ 0,00'}
                            </p>
                            {state.diariasAssessoramentoMagistrado && !isMagistrate && (
                                <p className="text-amber-800 dark:text-amber-300 font-medium">
                                    ⭐ Diária calculada com percentual especial de 80% por assessoramento direto a magistrado (Res. CNJ 73/2009).
                                </p>
                            )}
                            <p>Desconto automático de auxílios: fins de semana são desconsiderados automaticamente.</p>
                            {(state.diariasFeriados || []).length > 0 ? (
                                <p>Feriados e pontos facultativos indicados: {formatDateList(state.diariasFeriados)}.</p>
                            ) : (
                                <p>Nenhum feriado ou ponto facultativo indicado na viagem.</p>
                            )}
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
                            <p>Diária de referência do Ministro do STF: {ministerPerDiemValue > 0 ? formatCurrencyBr(ministerPerDiemValue) : 'não configurada'}.</p>
                            {normativeInfo?.notes && normativeInfo.notes.length > 0 && (
                                <div className="pt-1 text-[11px] text-neutral-500 border-t border-neutral-200/50 dark:border-neutral-700/50">
                                    {normativeInfo.notes.map((note, idx) => (
                                        <p key={idx}>• {note}</p>
                                    ))}
                                </div>
                            )}
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
