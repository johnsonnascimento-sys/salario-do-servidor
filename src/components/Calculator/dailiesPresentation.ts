import { CalculatorState, CourtConfig } from '../../types';
import { mapStateToAgencyParams } from '../../services/agency/adapters/stateToParams';
import { enumerateDaysInRange, resolveAssistedAuthorityDailyRate, resolveDailiesDailyRate, resolveDailiesDiscountRules, resolveDailiesEmbarkationAdditional, summarizeDailiesPeriodMode } from '../../utils/dailiesRules';

export const transportLegs = [
    { id: 'afastamento_origem', label: 'Ida: residência ou trabalho → embarque' },
    { id: 'afastamento_destino', label: 'Ida: desembarque → trabalho ou hospedagem' },
    { id: 'retorno_origem', label: 'Volta: trabalho ou hospedagem → embarque' },
    { id: 'retorno_destino', label: 'Volta: desembarque → residência ou trabalho' }
] as const;
export const formatTravelDate = (date: string) => date.split('-').reverse().join('/');
export const formatTravelDates = (dates: string[]) => dates.length ? dates.map(formatTravelDate).join(', ') : 'nenhum';

/** Presentation data uses the same normalized inputs and resolvers as the engine. */
export const getDailiesPresentation = (state: CalculatorState, config?: CourtConfig | null) => {
    const params = mapStateToAgencyParams(state, config?.orgSlug || '', config ?? undefined);
    const isJmu = ['jmu', 'stm'].includes(params.orgSlug);
    const isMagistrate = /juiz|desembargador|magistrado/i.test(state.cargo || '');
    const rules = resolveDailiesDiscountRules(config?.dailies, config?.payrollRules?.transportWorkdays || 22);
    const period = state.diariasModoDesconto === 'periodo'
        ? summarizeDailiesPeriodMode(state.diariasDataInicio, state.diariasDataFim, { ...rules, excludeWeekendsAndHolidays: true, holidays: state.diariasFeriados || [] }) : null;
    const dailyRate = resolveDailiesDailyRate({ dailiesConfig: config?.dailies, cargo: state.cargo, funcao: state.funcao,
        hasCommissionRole: Boolean(state.funcao?.toLowerCase().startsWith('cj')),
        assessoramentoMagistrado: state.diariasAssessoramentoMagistrado, acompanhamentoIntegral: state.diariasAcompanhamentoIntegral,
        autoridadeAssistida: params.diariasAutoridadeAssistida, equipeTrabalho: state.diariasEquipeTrabalho, equipeTrabalhoMaiorCargo: state.diariasEquipeTrabalhoMaiorCargo });
    const additional = resolveDailiesEmbarkationAdditional({ dailiesConfig: config?.dailies, embarkationType: params.diariasEmbarque, trechosTransporte: params.diariasTrechosTransporte });
    const full = resolveDailiesEmbarkationAdditional({ dailiesConfig: config?.dailies, embarkationType: 'completo' });
    const half = resolveDailiesEmbarkationAdditional({ dailiesConfig: config?.dailies, embarkationType: 'metade' });
    const assisted = !isMagistrate && state.diariasAssessoramentoMagistrado
        ? resolveAssistedAuthorityDailyRate(config?.dailies, params.diariasAutoridadeAssistida!, config?.orgSlug, Boolean(state.diariasAcompanhamentoIntegral)) : null;
    return { params, isJmu, isMagistrate, rules, period, dailyRate, additional, full, half, assisted,
        label: config?.dailies?.embarkationLabel?.trim() || 'Adicional de embarque',
        weekdays: period ? enumerateDaysInRange(state.diariasDataInicio, state.diariasDataFim).filter(day => !day.isWeekend) : [] };
};
