import React from 'react';
import { CalculatorState, CourtConfig } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { formatTravelDate, formatTravelDates, getDailiesPresentation } from './dailiesPresentation';

export const DailiesHelp: React.FC<{ config: CourtConfig }> = ({ config }) => {
    const info = config.dailies?.normativeInfo;
    const norms = [...new Set([info?.localRuleLabel, info?.branchRuleLabel, info?.generalRuleLabel].filter(Boolean))];
    return <>
        {norms.map(norm => <span key={norm} className="mt-2 block">{norm}</span>)}
        {!norms.length && <span className="mt-2 block">Regulamentação do órgão selecionado.</span>}
        <span className="mt-2 block">Os valores seguem a tabela vigente de diárias e não acompanham o mês/ano selecionado na folha.</span>
        <span className="mt-2 block">Use Personalizar cálculo para ajustar o adicional, feriados, condições da viagem, descontos de auxílios e benefícios fornecidos. Sábados, domingos e feriados indicados são excluídos dos descontos automáticos de auxílios, sem excluir as diárias da viagem.</span>
        <span className="mt-2 block">O desconto de auxílio-transporte é proporcional ao valor do benefício após a cota-parte.</span>
        {config.dailies?.embarkationDescription && <span className="mt-2 block">{config.dailies.embarkationDescription}</span>}
        {info?.notes?.map((note, index) => <span key={index} className="mt-2 block">{note}</span>)}
    </>;
};

export const DailiesCalculationNotes: React.FC<{ state: CalculatorState; config: CourtConfig }> = ({ state, config }) => {
    const { rules, period, dailyRate, assisted } = getDailiesPresentation(state, config);
    return <div className="space-y-2 pt-3 text-body-xs text-neutral-600 dark:text-neutral-300" aria-label="Memória da viagem">
        <p>Diária unitária: {formatCurrency(dailyRate)}.</p>
        {assisted && <p>Autoridade assistida: {assisted.authorityLabel}. Referência: {formatCurrency(assisted.authorityRate)}; percentual aplicado: {((assisted.percentage || 0) * 100).toLocaleString('pt-BR')}%.</p>}
        {period && <>
            <p>Período: {formatTravelDate(state.diariasDataInicio)} a {formatTravelDate(state.diariasDataFim)}. Dias de calendário: {period.totalDays.toLocaleString('pt-BR')}; diárias pagas: {period.payableDays.toLocaleString('pt-BR')}.</p>
            <p>Retorno: {formatTravelDate(period.returnDate)} ({period.returnDateIsBusinessDay ? 'dia útil' : period.returnDateIsWeekend ? 'fim de semana' : 'feriado'}). {period.halfDailyApplied ? 'Meia diária aplicada.' : 'Sem meia diária.'} {period.halfDiscountApplied ? 'Meio desconto de auxílios aplicado quando selecionado.' : 'Sem meio desconto de auxílios.'}</p>
            <p>Dias considerados para desconto: {period.discountDays.toLocaleString('pt-BR')}; dias excluídos: {period.excludedDays.toLocaleString('pt-BR')}.</p>
            <p>Fins de semana excluídos dos descontos: {formatTravelDates(period.weekendExcludedDates)}.</p>
            <p>Feriados excluídos dos descontos: {formatTravelDates(period.holidayExcludedDates)}.</p>
        </>}
        <p>Feriados e pontos facultativos indicados: {formatTravelDates(state.diariasFeriados || [])}.</p>
        <p>Divisores: auxílio-alimentação {rules.foodDivisor} dias; auxílio-transporte {rules.transportDivisor} dias.</p>
        <p>Diária de referência do Ministro do STF: {config.dailies?.derivedFromMinister?.ministerPerDiem ? formatCurrency(config.dailies.derivedFromMinister.ministerPerDiem) : 'não configurada'}.</p>
        <p>Os valores seguem a tabela vigente de diárias, independentemente da competência da folha.</p>
    </div>;
};
