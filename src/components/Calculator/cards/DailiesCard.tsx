import React, { useMemo } from 'react';
import { Plane } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import {
    enumerateDaysInRange,
    resolveDailiesDailyRate,
    resolveDailiesDiscountRules,
    summarizeDailiesPeriodMode,
    resolveAssistedAuthorityDailyRate,
    resolveDailiesEmbarkationAdditional,
    DiariasAutoridadeAssistida
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
const CJF_TRANSPORTE_TRECHOS = [
    {
        id: 'afastamento_origem',
        group: 'I - No afastamento da sede (ida)',
        label: 'Do local de trabalho ou residência até o local de embarque'
    },
    {
        id: 'afastamento_destino',
        group: 'I - No afastamento da sede (ida)',
        label: 'Do local de desembarque até o local de trabalho ou hospedagem'
    },
    {
        id: 'retorno_origem',
        group: 'II - No retorno à sede (volta)',
        label: 'Do local de trabalho ou hospedagem até o local de embarque'
    },
    {
        id: 'retorno_destino',
        group: 'II - No retorno à sede (volta)',
        label: 'Do local de desembarque até o local de trabalho ou residência'
    }
] as const;

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

    const isJmu = useMemo(() => Boolean(
        courtConfig?.orgSlug === 'jmu' ||
        courtConfig?.orgSlug === 'stm' ||
        dailiesConfig?.branchId === 'jmu' ||
        dailiesConfig?.branchId === 'stm' ||
        dailiesConfig?.orgSlug === 'jmu' ||
        dailiesConfig?.orgSlug === 'stm' ||
        normativeInfo?.localRuleLabel?.includes('STM') ||
        normativeInfo?.localRuleLabel?.includes('JMU') ||
        normativeInfo?.branchRuleLabel?.includes('STM') ||
        normativeInfo?.branchRuleLabel?.includes('JMU')
    ), [courtConfig?.orgSlug, dailiesConfig?.branchId, dailiesConfig?.orgSlug, normativeInfo?.localRuleLabel, normativeInfo?.branchRuleLabel]);

    const effectiveAutoridade: DiariasAutoridadeAssistida = useMemo(() => {
        if (isJmu) {
            return (state.diariasAutoridadeAssistida === 'juiz_federal' || state.diariasAutoridadeAssistida === 'juiz_militar')
                ? 'juiz_federal'
                : 'ministro_stm';
        }
        if (state.diariasAutoridadeAssistida === 'ministro_cjf' || state.diariasAutoridadeAssistida === 'ministro_stm') {
            return 'ministro_cjf';
        }
        if (state.diariasAutoridadeAssistida === 'juiz_federal' || state.diariasAutoridadeAssistida === 'juiz_militar') {
            return 'juiz_federal';
        }
        return 'desembargador_trf';
    }, [isJmu, state.diariasAutoridadeAssistida]);

    const teamCargoOptions = useMemo(() => {
        const options: Array<{ id: string; label: string; rate: number }> = [];
        const cjRate = resolveDailiesDailyRate({
            dailiesConfig,
            cargo: 'Analista Judiciário',
            funcao: 'CJ-4',
            hasCommissionRole: true,
        });
        const analistaRate = resolveDailiesDailyRate({
            dailiesConfig,
            cargo: 'Analista Judiciário',
        });
        const tecnicoRate = resolveDailiesDailyRate({
            dailiesConfig,
            cargo: 'Técnico Judiciário',
        });

        options.push({
            id: 'cj',
            label: isJmu ? 'Cargo em Comissão (CJ)' : 'Cargo em Comissão (CJ-1 a CJ-4)',
            rate: cjRate,
        });
        options.push({
            id: 'analista',
            label: 'Analista Judiciário',
            rate: analistaRate,
        });
        if (state.cargo && state.cargo.toLowerCase().includes('auxiliar')) {
            options.push({
                id: 'tecnico',
                label: 'Técnico Judiciário',
                rate: tecnicoRate,
            });
        }
        return options;
    }, [dailiesConfig, isJmu, state.cargo]);

    const defaultTeamCargo = useMemo(() => {
        const isAnalista = state.cargo && state.cargo.toLowerCase().includes('analista');
        return isAnalista ? 'cj' : 'analista';
    }, [state.cargo]);

    const activeTeamCargo = state.diariasEquipeTrabalhoMaiorCargo || defaultTeamCargo;
    const selectedTeamOption = teamCargoOptions.find(o => o.id === activeTeamCargo) || teamCargoOptions[0];

    const dailyRate = useMemo(
        () => resolveDailiesDailyRate({
            dailiesConfig,
            cargo: state.cargo,
            funcao: state.funcao,
            hasCommissionRole: Boolean(state.funcao && state.funcao.toLowerCase().startsWith('cj')),
            assessoramentoMagistrado: Boolean(state.diariasAssessoramentoMagistrado),
            acompanhamentoIntegral: Boolean(state.diariasAcompanhamentoIntegral),
            autoridadeAssistida: effectiveAutoridade,
            equipeTrabalho: Boolean(state.diariasEquipeTrabalho),
            equipeTrabalhoMaiorCargo: activeTeamCargo
        }),
        [
            dailiesConfig,
            state.cargo,
            state.funcao,
            state.diariasAssessoramentoMagistrado,
            state.diariasAcompanhamentoIntegral,
            effectiveAutoridade,
            state.diariasEquipeTrabalho,
            activeTeamCargo
        ]
    );

    const assistedAuthorityInfo = useMemo(() => {
        if (!state.diariasAssessoramentoMagistrado || isMagistrate) return null;
        return resolveAssistedAuthorityDailyRate(
            dailiesConfig,
            effectiveAutoridade,
            courtConfig?.orgSlug,
            Boolean(state.diariasAcompanhamentoIntegral)
        );
    }, [dailiesConfig, state.diariasAssessoramentoMagistrado, state.diariasAcompanhamentoIntegral, effectiveAutoridade, isMagistrate, courtConfig?.orgSlug]);

    const embarkationValues = useMemo(() => {
        const full = resolveDailiesEmbarkationAdditional({ dailiesConfig, embarkationType: 'completo' });
        const half = resolveDailiesEmbarkationAdditional({ dailiesConfig, embarkationType: 'metade' });
        const quarter = Math.round((full / 4) * 100) / 100;
        return { full, half, quarter };
    }, [dailiesConfig]);

    const selectedTrechos = useMemo<string[]>(() => {
        if (Array.isArray(state.diariasTrechosTransporte)) {
            return state.diariasTrechosTransporte;
        }
        if (state.diariasEmbarque === 'completo') {
            return CJF_TRANSPORTE_TRECHOS.map(t => t.id);
        }
        if (state.diariasEmbarque === 'metade') {
            return ['afastamento_origem', 'afastamento_destino'];
        }
        return [];
    }, [state.diariasTrechosTransporte, state.diariasEmbarque]);

    const currentEmbarkationValue = useMemo(() => {
        return resolveDailiesEmbarkationAdditional({
            dailiesConfig,
            embarkationType: state.diariasEmbarque,
            trechosTransporte: !isJmu ? selectedTrechos : undefined
        });
    }, [dailiesConfig, state.diariasEmbarque, isJmu, selectedTrechos]);

    const handleToggleTrecho = (trechoId: string) => {
        const next = new Set(selectedTrechos);
        if (next.has(trechoId)) {
            next.delete(trechoId);
        } else {
            next.add(trechoId);
        }
        const nextArr = CJF_TRANSPORTE_TRECHOS.map(t => t.id).filter(id => next.has(id));
        update('diariasTrechosTransporte', nextArr);

        if (nextArr.length === 4) {
            update('diariasEmbarque', 'completo');
        } else if (nextArr.length === 2) {
            update('diariasEmbarque', 'metade');
        } else if (nextArr.length === 0) {
            update('diariasEmbarque', 'nenhum');
        } else {
            update('diariasEmbarque', 'metade');
        }
    };

    const handleSelectAllTrechos = (mode: 'todos' | 'nenhum' | 'ida' | 'volta') => {
        let nextArr: string[] = [];
        let nextEmbarque: 'nenhum' | 'metade' | 'completo' = 'nenhum';
        if (mode === 'todos') {
            nextArr = CJF_TRANSPORTE_TRECHOS.map(t => t.id);
            nextEmbarque = 'completo';
        } else if (mode === 'ida') {
            nextArr = ['afastamento_origem', 'afastamento_destino'];
            nextEmbarque = 'metade';
        } else if (mode === 'volta') {
            nextArr = ['retorno_origem', 'retorno_destino'];
            nextEmbarque = 'metade';
        }
        update('diariasTrechosTransporte', nextArr);
        update('diariasEmbarque', nextEmbarque);
    };

    const embarkationPercentDescription = useMemo(() => {
        if (dailiesConfig?.embarkationDescription?.trim()) {
            return dailiesConfig.embarkationDescription.trim();
        }
        if (isJmu) {
            return 'Ato Normativo STM nº 799/2024 (art. 8º): adicional de 40% da diária de Ministro do STM para ida e volta e 20% para apenas ida ou volta.';
        }
        return 'Resolução CJF nº 340/2015 (art. 17): adicional de transporte para cobrir despesas de deslocamento de 80% sobre a diária básica de Analista Judiciário (equivalente a 44% da diária de Ministro do STF) para ida e volta e metade (22%) para apenas ida ou volta.';
    }, [dailiesConfig?.embarkationDescription, isJmu]);

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
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <h3 className={styles.sectionTitle}>
                    <Plane className="w-4 h-4" /> Diárias
                </h3>
                {normativeInfo && (
                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {normativeInfo.localRuleLabel || normativeInfo.branchRuleLabel || normativeInfo.generalRuleLabel || 'Regulamentação PJU'}
                        {(normativeInfo.localRuleLabel || normativeInfo.branchRuleLabel) && normativeInfo.generalRuleLabel && (
                            <span className="font-normal text-gray-400 dark:text-gray-500"> (c/c {normativeInfo.generalRuleLabel})</span>
                        )}
                    </span>
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

                        {isJmu ? (
                            <div>
                                <label className={styles.label}>{embarkationLabel}</label>
                                <select
                                    className={styles.input}
                                    value={state.diariasEmbarque}
                                    onChange={e => update('diariasEmbarque', e.target.value)}
                                >
                                    <option value="nenhum">Nenhum (R$ 0,00)</option>
                                    <option value="metade">
                                        Metade (ida ou volta){embarkationValues.half > 0 ? ` - ${formatCurrencyBr(embarkationValues.half)}` : ''}
                                    </option>
                                    <option value="completo">
                                        Completo (ida e volta){embarkationValues.full > 0 ? ` - ${formatCurrencyBr(embarkationValues.full)}` : ''}
                                    </option>
                                </select>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                                    {embarkationPercentDescription}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className={styles.label}>{embarkationLabel}</label>
                                    <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                        Res. CJF 340/2015 • Anexo
                                    </span>
                                </div>

                                <p className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    Assinale os trechos realizados <strong>sem veículo oficial</strong> (art. 17, § 2º). Cada trecho dá direito a 25% do adicional ({formatCurrencyBr(embarkationValues.quarter)}):
                                </p>

                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllTrechos('todos')}
                                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors border ${
                                            selectedTrechos.length === 4
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                        }`}
                                    >
                                        Todos (100% • Completo)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllTrechos('ida')}
                                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors border ${
                                            selectedTrechos.length === 2 && selectedTrechos.includes('afastamento_origem') && selectedTrechos.includes('afastamento_destino')
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                        }`}
                                    >
                                        Apenas Ida (50%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllTrechos('volta')}
                                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors border ${
                                            selectedTrechos.length === 2 && selectedTrechos.includes('retorno_origem') && selectedTrechos.includes('retorno_destino')
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                        }`}
                                    >
                                        Apenas Volta (50%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectAllTrechos('nenhum')}
                                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors border ${
                                            selectedTrechos.length === 0
                                                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                                        }`}
                                    >
                                        Nenhum (0%)
                                    </button>
                                </div>

                                <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5 bg-neutral-50/50 dark:bg-neutral-900/50">
                                    <div>
                                        <span className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                                            I - No afastamento da sede (ida)
                                        </span>
                                        <div className="space-y-1.5 pl-1">
                                            {CJF_TRANSPORTE_TRECHOS.slice(0, 2).map(trecho => {
                                                const isChecked = selectedTrechos.includes(trecho.id);
                                                return (
                                                    <label key={trecho.id} className="flex items-start gap-2 text-[12px] text-neutral-700 dark:text-neutral-300 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleTrecho(trecho.id)}
                                                        />
                                                        <div className="flex-1 flex items-center justify-between gap-1">
                                                            <span>{trecho.label}</span>
                                                            <span className={`text-[11px] font-mono whitespace-nowrap ${isChecked ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                                                +25% ({formatCurrencyBr(embarkationValues.quarter)})
                                                            </span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                        <span className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                                            II - No retorno à sede (volta)
                                        </span>
                                        <div className="space-y-1.5 pl-1">
                                            {CJF_TRANSPORTE_TRECHOS.slice(2, 4).map(trecho => {
                                                const isChecked = selectedTrechos.includes(trecho.id);
                                                return (
                                                    <label key={trecho.id} className="flex items-start gap-2 text-[12px] text-neutral-700 dark:text-neutral-300 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                                                            checked={isChecked}
                                                            onChange={() => handleToggleTrecho(trecho.id)}
                                                        />
                                                        <div className="flex-1 flex items-center justify-between gap-1">
                                                            <span>{trecho.label}</span>
                                                            <span className={`text-[11px] font-mono whitespace-nowrap ${isChecked ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-neutral-400 dark:text-neutral-500'}`}>
                                                                +25% ({formatCurrencyBr(embarkationValues.quarter)})
                                                            </span>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-[12px]">
                                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                                        Total do adicional ({selectedTrechos.length} de 4 trechos):
                                    </span>
                                    <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                                        {formatCurrencyBr(currentEmbarkationValue)}
                                    </span>
                                </div>

                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                    {embarkationPercentDescription}
                                </p>
                            </div>
                        )}

                        {!isMagistrate && (
                            <div className="pt-0.5 space-y-3">
                                {/* Equipe de Trabalho */}
                                <div className="space-y-2">
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={Boolean(state.diariasEquipeTrabalho)}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                update('diariasEquipeTrabalho', checked);
                                                if (checked) {
                                                    if (!state.diariasEquipeTrabalhoMaiorCargo) {
                                                        update('diariasEquipeTrabalhoMaiorCargo', defaultTeamCargo);
                                                    }
                                                    update('diariasAssessoramentoMagistrado', false);
                                                    update('diariasAcompanhamentoIntegral', false);
                                                }
                                            }}
                                        />
                                        <span>
                                            {isJmu
                                                ? 'Deslocamento em equipe de trabalho (art. 8º do Ato STM 799/2024)'
                                                : 'Deslocamento em equipe de trabalho (art. 10, § 1º da Res. CJF 340/2015 c/c art. 6º, § 2º da Res. CNJ 73/2009)'}
                                        </span>
                                    </label>

                                    {state.diariasEquipeTrabalho && (
                                        <div className="pl-6 space-y-1.5">
                                            <label htmlFor="diariasEquipeTrabalhoMaiorCargo" className="block text-caption font-medium text-neutral-700 dark:text-neutral-300">
                                                Maior valor da diária entre os membros da equipe:
                                            </label>
                                            <select
                                                id="diariasEquipeTrabalhoMaiorCargo"
                                                className={styles.input}
                                                value={activeTeamCargo}
                                                onChange={e => update('diariasEquipeTrabalhoMaiorCargo', e.target.value)}
                                            >
                                                {teamCargoOptions.map((opt) => (
                                                    <option key={opt.id} value={opt.id}>
                                                        {opt.label} — {formatCurrencyBr(opt.rate)}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                {isJmu
                                                    ? 'O servidor que se deslocar em equipe de trabalho receberá diária correspondente ao maior valor da diária atribuído entre os servidores membros da equipe (art. 8º do Ato Normativo STM nº 799/2024).'
                                                    : 'O servidor que se deslocar em equipe de trabalho receberá diária equivalente ao maior valor pago entre os demais servidores membros da equipe (art. 10, § 1º da Resolução CJF nº 340/2015 c/c art. 6º, § 2º da Resolução CNJ nº 73/2009).'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Assessoramento / Segurança a Magistrado */}
                                <div className="space-y-2">
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.diariasAssessoramentoMagistrado}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                update('diariasAssessoramentoMagistrado', checked);
                                                if (checked) {
                                                    update('diariasEquipeTrabalho', false);
                                                } else {
                                                    update('diariasAcompanhamentoIntegral', false);
                                                }
                                            }}
                                        />
                                        <span>
                                            {isJmu
                                                ? 'Viagem em assessoramento direto a magistrado (art. 9º do Ato STM 799/2024)'
                                                : 'Viagem em assessoramento direto / segurança a magistrado (art. 10, § 3º da Res. CJF 340/2015)'}
                                        </span>
                                    </label>

                                    {state.diariasAssessoramentoMagistrado && (
                                        <div className="pl-6 space-y-2">
                                            <div className="space-y-1.5">
                                                <label htmlFor="diariasAutoridadeAssistida" className="block text-caption font-medium text-neutral-700 dark:text-neutral-300">
                                                    Autoridade assistida:
                                                </label>
                                                <select
                                                    id="diariasAutoridadeAssistida"
                                                    className={styles.input}
                                                    value={effectiveAutoridade}
                                                    onChange={e => update('diariasAutoridadeAssistida', e.target.value as DiariasAutoridadeAssistida)}
                                                >
                                                    {isJmu ? (
                                                        <>
                                                            <option value="ministro_stm">Ministro do STM (base 100% do STF)</option>
                                                            <option value="juiz_federal">Juiz Federal da Justiça Militar / Substituto (base 95% do STM)</option>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <option value="desembargador_trf">Desembargador Federal / Membro do TRF (base 95% do STF)</option>
                                                            <option value="juiz_federal">Juiz Federal / Juiz Federal Substituto (base 95% do TRF = 90,25% do STF)</option>
                                                            <option value="ministro_cjf">Ministro / Membro do Conselho da Justiça Federal (CJF)</option>
                                                        </>
                                                    )}
                                                </select>
                                            </div>

                                            <label className="flex items-start gap-2 cursor-pointer text-caption text-neutral-700 dark:text-neutral-300 pt-1">
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500 dark:bg-neutral-800"
                                                    checked={Boolean(state.diariasAcompanhamentoIntegral)}
                                                    onChange={e => update('diariasAcompanhamentoIntegral', e.target.checked)}
                                                />
                                                <span>
                                                    {isJmu
                                                        ? 'Exigido acompanhamento em tempo integral e hospedagem no mesmo local (art. 9º, § 1º do Ato STM 799/2024 — diária a 90%)'
                                                        : 'Exigido acompanhamento em tempo integral e hospedagem no mesmo local (art. 6º, § 5º da Res. CNJ 73/2009 — diária a 90%)'}
                                                </span>
                                            </label>

                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                                {state.diariasAcompanhamentoIntegral ? (
                                                    isJmu
                                                        ? 'O servidor faz jus a 90% do valor da diária atribuído à autoridade assistida (art. 9º, § 1º do Ato Normativo STM nº 799/2024 c/c art. 6º, § 5º da Resolução CNJ nº 73/2009).'
                                                        : 'O servidor faz jus a 90% do valor da diária atribuído à autoridade assistida (art. 6º, § 5º da Resolução CNJ nº 73/2009 c/c Resolução CJF nº 340/2015).'
                                                ) : (
                                                    isJmu
                                                        ? 'O servidor faz jus a 80% do valor da diária atribuído à autoridade assistida (art. 9º do Ato Normativo STM nº 799/2024 c/c art. 6º, § 4º da Resolução CNJ nº 73/2009).'
                                                        : 'O servidor faz jus a 80% do valor da diária atribuído à autoridade assistida (art. 10, § 3º da Resolução CJF nº 340/2015 c/c art. 6º, § 4º da Resolução CNJ nº 73/2009).'
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-body-xs text-neutral-600 dark:text-neutral-300 space-y-1">
                            <p>Os valores de diárias seguem a tabela vigente e não acompanham o mês/ano selecionado.</p>
                            <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                                Valor unitário da diária: {dailyRate > 0 ? formatCurrencyBr(dailyRate) : 'R$ 0,00'}
                            </p>
                            {state.diariasAssessoramentoMagistrado && !isMagistrate && assistedAuthorityInfo && (
                                <p className="text-amber-800 dark:text-amber-300 font-medium">
                                    ⭐ Diária a {Math.round((assistedAuthorityInfo.percentage ?? 0.8) * 100)}% da autoridade assistida ({assistedAuthorityInfo.authorityLabel}: {formatCurrencyBr(assistedAuthorityInfo.authorityRate)} → servidor: {formatCurrencyBr(assistedAuthorityInfo.serverRate)}).
                                </p>
                            )}
                            {state.diariasEquipeTrabalho && !isMagistrate && selectedTeamOption && (
                                <p className="text-blue-800 dark:text-blue-300 font-medium">
                                    ⭐ Diária equiparada por equipe de trabalho ({selectedTeamOption.label}: {formatCurrencyBr(dailyRate)}) {isJmu ? 'conforme art. 8º do Ato STM 799/2024' : 'conforme art. 10, § 1º da Res. CJF 340/2015 c/c art. 6º, § 2º da Res. CNJ 73/2009'}.
                                </p>
                            )}
                            <p>
                                {embarkationLabel}: {isJmu ? (
                                    state.diariasEmbarque === 'completo'
                                        ? `Completo (${formatCurrencyBr(embarkationValues.full)})`
                                        : state.diariasEmbarque === 'metade'
                                            ? `Metade (${formatCurrencyBr(embarkationValues.half)})`
                                            : 'Nenhum'
                                ) : (
                                    selectedTrechos.length > 0
                                        ? `${selectedTrechos.length} de 4 trechos (${formatCurrencyBr(currentEmbarkationValue)})`
                                        : 'Nenhum (0 trechos)'
                                )}.
                            </p>
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
