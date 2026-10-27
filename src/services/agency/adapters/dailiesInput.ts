import type { CalculatorState } from '../../../types';
import type { DailiesInput } from '../dailies';
import type { IAgencyCalculationParams } from '../engine/types';

const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
export function dailiesInputFromState(state: CalculatorState, orgSlug = 'jmu'): DailiesInput {
  const competence = `${state.anoRef}-${String(months.indexOf(state.mesRef) + 1).padStart(2, '0')}`;
  if (state.dailiesInput) return { ...state.dailiesInput, org_slug: orgSlug, competence };
  return legacyDailiesInput({ ...state, orgSlug, competencia: competence } as unknown as IAgencyCalculationParams,
    { auxAlimentacao: state.auxAlimentacao, auxTransporte: state.auxTransporteValor });
}

/** Translate saved inputs, never legacy monetary tables or historical dates. */
export function legacyDailiesInput(params: IAgencyCalculationParams, benefits: { auxAlimentacao: number; auxTransporte: number }): DailiesInput {
  if (params.dailiesInput) return { ...params.dailiesInput, org_slug: params.orgSlug, competence: params.competencia || params.dailiesInput.competence };
  return {
    org_slug: params.orgSlug, competence: params.competencia || '',
    category: params.funcao?.toLowerCase().startsWith('cj') ? 'cj' : params.cargo,
    mode: params.diariasModoDesconto === 'periodo' ? 'period' : 'quantity',
    start_date: params.diariasDataInicio || undefined, end_date: params.diariasDataFim || undefined,
    quantity: params.diariasQtd,
    food_deduction_days_quantity: params.diariasDiasDescontoAlimentacao,
    transport_deduction_days_quantity: params.diariasDiasDescontoTransporte,
    deduction_days_quantity: params.diariasDiasDescontoAlimentacao === params.diariasDiasDescontoTransporte
      ? params.diariasDiasDescontoAlimentacao : undefined,
    circumstances: { supplied_lodging: params.diariasExtHospedagem, supplied_meals: params.diariasExtAlimentacao,
      supplied_transport: params.diariasExtTransporte, boarding: params.diariasEmbarque !== 'nenhum',
      boarding_legs: params.diariasEmbarque === 'metade' ? 1 : 2 },
    benefits: { meals_monthly: benefits.auxAlimentacao, transport_monthly: benefits.auxTransporte, currency: 'BRL' },
  };
}
