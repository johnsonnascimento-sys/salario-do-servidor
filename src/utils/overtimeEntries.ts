import { calculatePss } from '../core/calculations/taxUtils';
import { pickPeriodFromScheduleByReference } from '../components/Calculator/referenceDateUtils';
import { CourtConfig, OvertimeEntry } from '../types';
import { getTablesForPeriod } from './calculations';

type SupportedRegime = 'antigo' | 'migrado' | 'novo_antigo' | 'rpc';

export interface OvertimeCalculationContext {
  periodo: number;
  cargo: string;
  padrao: string;
  funcao: string;
  aqTituloPerc: number;
  aqTreinoPerc: number;
  aqTituloVR: number;
  aqTreinoVR: number;
  recebeAbono: boolean;
  gratEspecificaTipo: '0' | 'gae' | 'gas';
  vpni_lei: number;
  vpni_decisao: number;
  ats: number;
  tabelaPSS: string;
  regimePrev: SupportedRegime;
  pssSobreFC: boolean;
  incidirPSSGrat: boolean;
}

export interface ResolvedOvertimeEntry extends OvertimeEntry {
  competenciaRef: string;
  resolvedPeriod: number;
  calculatedHeVal50: number;
  calculatedHeVal100: number;
  calculatedHeTotal: number;
  heVal50: number;
  heVal100: number;
  heTotal: number;
  usedManualGross: boolean;
}

const normalizePercent = (value: number) => (value > 1 ? value / 100 : value);

const parseCompetenciaRef = (value?: string) => {
  const normalized = String(value || '').trim();
  const match = normalized.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const year = Number(match[2]);
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12) {
    return null;
  }

  return { month, year };
};

const resolveEntryPeriod = (
  config: CourtConfig,
  defaultPeriod: number,
  competenciaRef?: string
) => {
  const parsed = parseCompetenciaRef(competenciaRef);
  if (!parsed) {
    return defaultPeriod;
  }

  const resolved = pickPeriodFromScheduleByReference(
    [...(config.adjustment_schedule || [])],
    parsed.year,
    parsed.month
  );

  return resolved ?? defaultPeriod;
};

const getManualGrossOverride = (entry: OvertimeEntry) => {
  if (!entry.excluirIR) {
    return 0;
  }

  const manualValue = Number(entry.valorBrutoManual || 0);
  return Number.isFinite(manualValue) && manualValue > 0 ? manualValue : 0;
};

export const calculateResolvedOvertimeEntries = (
  context: OvertimeCalculationContext,
  config: CourtConfig,
  entries: OvertimeEntry[],
  options?: { defaultCompetenciaRef?: string }
): ResolvedOvertimeEntry[] => {
  const payrollRules = config.payrollRules;
  if (!payrollRules) {
    return entries.map((entry, index) => ({
      ...entry,
      id: entry.id || `he-${index}`,
      competenciaRef: String(entry.competenciaRef || options?.defaultCompetenciaRef || '').trim(),
      resolvedPeriod: context.periodo,
      calculatedHeVal50: 0,
      calculatedHeVal100: 0,
      calculatedHeTotal: 0,
      heVal50: 0,
      heVal100: 0,
      heTotal: 0,
      usedManualGross: false,
    }));
  }

  const noFunctionCode = config.careerCatalog?.noFunctionCode ?? '';

  return entries.map((entry, index) => {
    const competenciaRef = String(entry.competenciaRef || options?.defaultCompetenciaRef || '').trim();
    const resolvedPeriod = (entry.isEA || entry.excluirIR)
      ? resolveEntryPeriod(config, context.periodo, competenciaRef)
      : context.periodo;
    const { salario, funcoes, valorVR } = getTablesForPeriod(resolvedPeriod, config);
    const baseVencimento = salario[context.cargo]?.[context.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;
    const funcaoValor = context.funcao === noFunctionCode ? 0 : (funcoes[context.funcao] || 0);

    const aqTituloVal = resolvedPeriod >= 1
      ? valorVR * context.aqTituloVR
      : baseVencimento * normalizePercent(context.aqTituloPerc);
    const aqTreinoVal = resolvedPeriod >= 1
      ? valorVR * context.aqTreinoVR
      : baseVencimento * normalizePercent(context.aqTreinoPerc);

    const gratVal = context.gratEspecificaTipo === 'gae' || context.gratEspecificaTipo === 'gas'
      ? baseVencimento * payrollRules.specificGratificationRate
      : 0;

    let baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
      funcaoValor + gratVal + (context.vpni_lei || 0) +
      (context.vpni_decisao || 0) + (context.ats || 0);

    if (context.recebeAbono) {
      let baseForPSS = baseHE - aqTreinoVal;
      if (!context.pssSobreFC) baseForPSS -= funcaoValor;
      if (!context.incidirPSSGrat) baseForPSS -= gratVal;

      const pssTable = config.historico_pss?.[context.tabelaPSS];
      const teto = pssTable?.teto_rgps || 0;
      const usaTeto = context.regimePrev === 'migrado' || context.regimePrev === 'rpc';

      if (pssTable) {
        if (usaTeto) {
          baseForPSS = Math.min(baseForPSS, teto);
        }
        baseHE += calculatePss(baseForPSS, pssTable);
      }
    }

    const valorHora = payrollRules.overtimeMonthHours > 0
      ? baseHE / payrollRules.overtimeMonthHours
      : 0;
    const qtd50 = Math.max(0, Number(entry.qtd50 || 0));
    const qtd100 = Math.max(0, Number(entry.qtd100 || 0));
    const calculatedHeVal50 = valorHora * 1.5 * qtd50;
    const calculatedHeVal100 = valorHora * 2.0 * qtd100;
    const calculatedHeTotal = calculatedHeVal50 + calculatedHeVal100;

    const manualGrossOverride = getManualGrossOverride(entry);
    let heVal50 = calculatedHeVal50;
    let heVal100 = calculatedHeVal100;
    let heTotal = calculatedHeTotal;

    if (manualGrossOverride > 0) {
      heTotal = manualGrossOverride;
      if (calculatedHeTotal > 0) {
        const factor = manualGrossOverride / calculatedHeTotal;
        heVal50 = calculatedHeVal50 * factor;
        heVal100 = calculatedHeVal100 * factor;
      } else if (qtd50 > 0 && qtd100 <= 0) {
        heVal50 = manualGrossOverride;
        heVal100 = 0;
      } else {
        heVal50 = 0;
        heVal100 = manualGrossOverride;
      }
    }

    return {
      ...entry,
      id: entry.id || `he-${index}`,
      competenciaRef,
      resolvedPeriod,
      calculatedHeVal50,
      calculatedHeVal100,
      calculatedHeTotal,
      heVal50,
      heVal100,
      heTotal,
      usedManualGross: manualGrossOverride > 0,
    };
  });
};

export const buildOvertimeCreditLabel = (
  entry: Pick<ResolvedOvertimeEntry, 'isEA' | 'excluirIR' | 'competenciaRef'>,
  includeCompetencia: boolean
) => {
  const baseLabel = entry.excluirIR
    ? 'INDENIZAÇÃO - SERVIÇO EXTRAORDINÁRIO (EXCLUÍDO IR)'
    : entry.isEA
      ? 'SERVIÇO EXTRAORDINÁRIO (IR EA)'
      : 'SERVIÇO EXTRAORDINÁRIO (IR MENSAL)';

  if (!includeCompetencia || !entry.competenciaRef) {
    return baseLabel;
  }

  return `${baseLabel} - ${entry.competenciaRef}`;
};
