import type { TransportIndemnityConfig, TransportIndemnityMemory } from '../../../../types';
import type { IAgencyCalculationParams } from '../types';

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** Resolves configured validity only; no JMU amount or statutory divisor is assumed. */
export function resolveTransportIndemnity(
  config: TransportIndemnityConfig | undefined,
  competence: string
): TransportIndemnityMemory {
  const memory: TransportIndemnityMemory = {
    competence, status: 'unavailable', days: 0, eligibleDays: 0, maxDays: 0,
    divisor: 0, fullAmount: 0, amount: 0,
  };
  if (!config?.enabled) return { ...memory, reason: 'Indenização de transporte não configurada ou desabilitada para este órgão.' };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) {
    return { ...memory, reason: 'Informe uma competência válida para a folha.' };
  }
  const [year, month] = competence.split('-').map(Number);
  const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${competence}-01`;
  const monthEnd = `${competence}-${maxDays}`;
  memory.maxDays = maxDays;
  if (!Array.isArray(config.versions) || config.versions.some(version =>
    !isCalendarDate(version.validFrom) ||
    (version.validTo != null && (!isCalendarDate(version.validTo) || version.validTo < version.validFrom)) ||
    !Number.isFinite(version.fullAmount) || version.fullAmount <= 0 || !version.reference?.trim()
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
  const versions = config.versions.filter(version =>
    version.validFrom <= monthEnd && (version.validTo == null || version.validTo >= monthStart)
  );
  // A single monthly quantity cannot allocate days between two legal rates.
  if (versions.length !== 1) {
    return { ...memory, reason: versions.length === 0
      ? 'Não há valor da indenização de transporte cadastrado para esta competência.'
      : 'Esta competência contém mais de uma vigência. A quantidade mensal de dias não permite separar os valores.' };
  }
  const version = versions[0];
  const divisor = versionedRules ? version.divisor : config.divisor;
  const incidences = versionedRules ? version.incidences : config.incidences;
  if (!Number.isInteger(divisor) || (divisor ?? 0) <= 0 || !hasIncidenceFlags(incidences) ||
      incidences.ir !== false || incidences.pss !== false || incidences.funpresp !== false) {
    return { ...memory, reason: 'Configuração incompleta ou incidências incompatíveis com a indenização de transporte nesta vigência.' };
  }
  memory.divisor = divisor!;
  memory.normativeLabel = version.normativeLabel || config.normativeLabel;
  if (version.validFrom > monthStart || (version.validTo != null && version.validTo < monthEnd)) {
    return { ...memory, fullAmount: version.fullAmount, validFrom: version.validFrom,
      validTo: version.validTo, reference: version.reference,
      reason: 'A vigência muda dentro desta competência. Sem as datas das diligências, não é possível aplicar o valor mensal com segurança.' };
  }
  return {
    ...memory, status: 'zero', fullAmount: version.fullAmount,
    validFrom: version.validFrom, validTo: version.validTo, reference: version.reference,
  };
}

/** Counts days supplied by the user, independently of trips, meal benefits or the number of writs. */
export function calculateTransportIndemnity(params: IAgencyCalculationParams): TransportIndemnityMemory {
  const memory = resolveTransportIndemnity(params.agencyConfig?.transportIndemnity, params.competencia ?? '');
  if (!params.transporteIndenizacaoAtivo) return { ...memory, status: 'inactive', amount: 0 };
  if (memory.status === 'unavailable') return memory;
  const days = params.transporteIndenizacaoDias ?? 0;
  if (typeof days !== 'number' || !Number.isFinite(days) || !Number.isInteger(days) || days < 0 || days > memory.maxDays) {
    return { ...memory, status: 'invalid', reason: `Informe dias inteiros entre 0 e ${memory.maxDays}.` };
  }
  const eligibleDays = Math.min(days, memory.divisor);
  // Keep the daily fraction unrounded. Round only the final payable amount.
  const amount = Math.round((memory.fullAmount * eligibleDays / memory.divisor + Number.EPSILON) * 100) / 100;
  return { ...memory, days, eligibleDays, amount,
    status: days === 0 ? 'zero' : days >= memory.divisor ? 'full' : 'proportional' };
}
