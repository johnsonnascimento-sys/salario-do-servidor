import type { CalendarDaySelection, TransportIndemnityConfig, TransportIndemnityMemory } from '../../../../types';
import type { IAgencyCalculationParams } from '../types';
import { resolveCalendarDays } from '../../../../utils/calendarDaySelection';

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const getPreviousCompetence = (competence: string): string => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) return '';
  const [year, month] = competence.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
};

export const getTransportServiceCompetence = (config: TransportIndemnityConfig | undefined, payment: string) =>
  config?.competenceMode === 'previous_month' ? getPreviousCompetence(payment) : payment;

export const resolveTransportDates = (input: CalendarDaySelection, latestServiceMonth?: string) =>
  resolveCalendarDays(input, latestServiceMonth, { serviceMonthOnly: input.modo === 'datas', latestMonthLabel: 'último mês de serviço da folha' });

/** Resolves configured validity only; no JMU amount or statutory divisor is assumed. */
export function resolveTransportIndemnity(
  config: TransportIndemnityConfig | undefined,
  competence: string
): TransportIndemnityMemory {
  return resolveTransportIndemnityMonth(config, competence);
}

function resolveTransportIndemnityMonth(
  config: TransportIndemnityConfig | undefined,
  competence: string,
  selectedServiceMonth?: string
): TransportIndemnityMemory {
  const memory: TransportIndemnityMemory = {
    competence, status: 'unavailable', days: 0, eligibleDays: 0, maxDays: 0,
    divisor: 0, fullAmount: 0, amount: 0,
  };
  if (!config?.enabled) return { ...memory, reason: 'Indenização de transporte não configurada ou desabilitada para este órgão.' };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) {
    return { ...memory, reason: 'Informe uma competência válida para a folha.' };
  }

  const isPreviousMonthMode = config.competenceMode === 'previous_month';
  const serviceCompetence = selectedServiceMonth ?? getTransportServiceCompetence(config, competence);
  memory.serviceCompetence = serviceCompetence;
  memory.paymentCompetence = competence;

  const [serviceYear, serviceMonth] = serviceCompetence.split('-').map(Number);
  const maxDays = new Date(Date.UTC(serviceYear, serviceMonth, 0)).getUTCDate();
  memory.maxDays = maxDays;

  const targetCompetence = serviceCompetence;
  const monthStart = `${targetCompetence}-01`;
  const monthEnd = `${targetCompetence}-${maxDays}`;

  if (!Array.isArray(config.versions) || config.versions.some(version =>
    !isCalendarDate(version.validFrom) ||
    (version.validTo != null && (!isCalendarDate(version.validTo) || version.validTo < version.validFrom)) ||
    !Number.isFinite(version.fullAmount) || version.fullAmount <= 0 || !version.reference?.trim() ||
    (version.publicationDate != null && !isCalendarDate(version.publicationDate)) ||
    (version.financialEffectsFrom != null && !isCalendarDate(version.financialEffectsFrom))
  )) {
    return { ...memory, reason: 'Valores e vigências da indenização de transporte precisam ser configurados.' };
  }
  // The deployed legacy shape has all calculation parameters at the top level.
  // Once any version owns its parameters, require every version to be complete;
  // a later top-level edit must never silently change an earlier version.
  const versionedRules = config.versions.some(version => version.divisor !== undefined || version.incidences !== undefined);
  const hasIncidenceFlags = (value: unknown): value is { ir: boolean; pss: boolean; funpresp: boolean } => {
    if (!value || typeof value !== 'object') return false;
    const flags = value as Record<string, unknown>;
    return ['ir', 'pss', 'funpresp'].every(key => typeof flags[key] === 'boolean');
  };
  if (versionedRules && config.versions.some(version =>
    !Number.isInteger(version.divisor) || (version.divisor ?? 0) <= 0 || !hasIncidenceFlags(version.incidences)
  )) {
    return { ...memory, reason: 'Cada vigência precisa de divisor e incidências completos para preservar o histórico.' };
  }

  const getVersionStart = (version: { validFrom: string; financialEffectsFrom?: string }) => {
    return version.financialEffectsFrom || version.validFrom;
  };

  const versions = config.versions.filter(version => {
    const start = getVersionStart(version);
    return start <= monthEnd && (version.validTo == null || version.validTo >= monthStart);
  });

  if (versions.length === 0) {
    const compLabel = isPreviousMonthMode
      ? `o mês de serviço (${serviceCompetence.split('-').reverse().join('/')})`
      : 'esta competência';
    return { ...memory, reason: `Não há valor da indenização de transporte cadastrado para ${compLabel}.` };
  }
  const chronological = [...versions].sort((a, b) => getVersionStart(a).localeCompare(getVersionStart(b)));
  if (chronological.some((version, index) => index > 0 &&
      (chronological[index - 1].validTo == null || chronological[index - 1].validTo! >= getVersionStart(version)))) {
    return { ...memory, reason: 'Há vigências sobrepostas na configuração da indenização de transporte.' };
  }
  // The opt-in monthly convention uses the rule applicable at month end. It
  // does not rewrite the legal effective dates or infer a rate beyond its end.
  const version = config.transitionPolicy === 'latest_in_month'
    ? chronological.find(item => item.validTo == null || item.validTo >= monthEnd)
    : versions.length === 1 ? versions[0] : undefined;
  if (!version) {
    return { ...memory, reason: 'Não há uma única regra aplicável ao fim desta competência; confira as vigências configuradas.' };
  }
  const divisor = versionedRules ? version.divisor : config.divisor;
  const incidences = versionedRules ? version.incidences : config.incidences;
  if (!Number.isInteger(divisor) || (divisor ?? 0) <= 0 || !hasIncidenceFlags(incidences) ||
      incidences.ir !== false || incidences.pss !== false || incidences.funpresp !== false) {
    return { ...memory, reason: 'Configuração incompleta ou incidências incompatíveis com a indenização de transporte nesta vigência.' };
  }
  memory.divisor = divisor!;
  memory.normativeLabel = version.normativeLabel || config.normativeLabel;

  const versionStart = getVersionStart(version);
  const startsWithinMonth = versionStart > monthStart;
  const endsWithinMonth = version.validTo != null && version.validTo < monthEnd;
  if (endsWithinMonth || (startsWithinMonth && config.transitionPolicy !== 'latest_in_month')) {
    return { ...memory, fullAmount: version.fullAmount, validFrom: version.validFrom,
      validTo: version.validTo, reference: version.reference,
      publicationDate: version.publicationDate, financialEffectsFrom: version.financialEffectsFrom,
      reason: 'A vigência muda dentro desta competência. Sem as datas das diligências, não é possível aplicar o valor mensal com segurança.' };
  }
  if (startsWithinMonth) {
    memory.transitionDate = versionStart;
    const dateLabel = versionStart.split('-').reverse().join('/');
    memory.transitionWarning = `Houve alteração de vigência em ${dateLabel}. Nesta simulação, o valor atualizado é aplicado a toda a competência, preservada a data de vigência da norma.`;
  }
  if (version.publicationDate) {
    memory.publicationDate = version.publicationDate;
  }
  if (version.financialEffectsFrom) {
    memory.financialEffectsFrom = version.financialEffectsFrom;
  }
  if (version.publicationDate && version.financialEffectsFrom && version.publicationDate > version.financialEffectsFrom) {
    const pubMonth = version.publicationDate.slice(0, 7);
    const pubBr = version.publicationDate.split('-').reverse().join('/');
    const effBr = version.financialEffectsFrom.split('-').reverse().join('/');
    if (competence < pubMonth || targetCompetence < pubMonth) {
      const refTitle = version.normativeLabel || version.reference;
      memory.retroactiveNote = `${refTitle}: ato publicado no DOU em ${pubBr}, com efeitos financeiros retroativos a ${effBr}.`;
      if (!memory.transitionWarning) {
        memory.transitionWarning = memory.retroactiveNote;
      }
    }
  }
  return {
    ...memory, status: 'zero', fullAmount: version.fullAmount,
    validFrom: version.validFrom, validTo: version.validTo, reference: version.reference,
    publicationDate: version.publicationDate, financialEffectsFrom: version.financialEffectsFrom,
  };
}

function calculateMonth(memory: TransportIndemnityMemory, days: number, ranges?: TransportIndemnityMemory['selectedRanges']): TransportIndemnityMemory {
  if (typeof days !== 'number' || !Number.isFinite(days) || !Number.isInteger(days) || days < 0 || days > memory.maxDays) {
    return { ...memory, status: 'invalid', reason: `Informe dias inteiros entre 0 e ${memory.maxDays}.` };
  }
  const eligibleDays = Math.min(days, memory.divisor);
  // Keep the daily fraction unrounded. Round only the final payable amount.
  const amount = Math.round((memory.fullAmount * eligibleDays / memory.divisor + Number.EPSILON) * 100) / 100;
  return { ...memory, days, eligibleDays, amount,
    ...(ranges && { selectedRanges: ranges }),
    status: days === 0 ? 'zero' : days >= memory.divisor ? 'full' : 'proportional' };
}

/** Counts days supplied by the user, independently of trips, meal benefits or the number of writs. */
export function calculateTransportIndemnity(params: IAgencyCalculationParams): TransportIndemnityMemory {
  const config = params.agencyConfig?.transportIndemnity;
  const payment = params.competencia ?? '';
  const memory = resolveTransportIndemnity(config, payment);
  if (!params.transporteIndenizacaoAtivo) return { ...memory, status: 'inactive', amount: 0 };
  if (params.commissionProfile && !['jmu', 'stm'].includes(params.agencyConfig?.orgSlug ?? params.orgSlug)) {
    return { ...memory, status: 'inactive', amount: 0 };
  }
  if (params.commissionProfile && params.commissionProfile.transportIndemnityAdHoc !== true) {
    return { ...memory, status: 'invalid', amount: 0, reason: 'Confirme a designação ad hoc e a atestação da diligência na JMU.' };
  }

  const input = params.transporteIndenizacaoSelecao;
  if (input?.modo === 'avulsos' && memory.serviceCompetence) {
    const selected = resolveTransportDates(input, memory.serviceCompetence);
    if (selected.error !== undefined) return { ...memory, status: 'invalid', reason: selected.error };

    const months: TransportIndemnityMemory[] = [];
    for (const month of selected.meses) {
      const rule = month.competencia === memory.serviceCompetence ? memory : resolveTransportIndemnityMonth(config, payment, month.competencia);
      if (rule.status === 'unavailable') {
        const label = month.competencia.split('-').reverse().join('/');
        return { ...memory, status: 'invalid', reason: `Mês de serviço ${label}. ${rule.reason}` };
      }
      months.push(calculateMonth(rule, month.dias, month.intervalos));
    }
    if (months.length === 1) return months[0];
    return {
      competence: payment, paymentCompetence: payment, months,
      status: months.every(month => month.status === 'full') ? 'full' : 'proportional',
      days: selected.dias, eligibleDays: months.reduce((sum, month) => sum + month.eligibleDays, 0),
      maxDays: months.reduce((sum, month) => sum + month.maxDays, 0),
      divisor: 0, fullAmount: 0,
      amount: months.reduce((sum, month) => sum + Math.round(month.amount * 100), 0) / 100,
    };
  }

  if (memory.status === 'unavailable') return memory;
  if (input?.modo === 'datas') {
    const selected = resolveTransportDates(input, memory.serviceCompetence);
    if (selected.error !== undefined) return { ...memory, status: 'invalid', reason: selected.error };
    return calculateMonth(memory, selected.dias, selected.meses[0].intervalos);
  }
  return calculateMonth(memory, params.transporteIndenizacaoDias ?? 0);
}
