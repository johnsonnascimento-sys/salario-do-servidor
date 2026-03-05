import { CalculatorState, CourtConfig, OvertimeEntry } from '../types';
import { calculatePss } from '../core/calculations/taxUtils';
import { getTablesForPeriod } from './calculations';
import { pickPeriodFromScheduleByReference, toReferenceMonthIndex } from '../components/Calculator/referenceDateUtils';

export interface OvertimeEntryGross {
  id: string;
  heVal50: number;
  heVal100: number;
  heTotal: number;
}

const roundCurrency = (value: number) => Math.round((value || 0) * 100) / 100;

const resolveEntryPeriod = (
  courtConfig: CourtConfig,
  entry: OvertimeEntry,
  fallbackPeriod: number,
  fallbackMonthLabel: string,
  fallbackYear: number
) => {
  const mes = Number(entry.competenciaMes || toReferenceMonthIndex(fallbackMonthLabel) || 1);
  const ano = Number(entry.competenciaAno || fallbackYear || new Date().getFullYear());

  const bySchedule = pickPeriodFromScheduleByReference(
    courtConfig.adjustment_schedule || [],
    ano,
    mes
  );

  return bySchedule ?? fallbackPeriod;
};

const buildEntryContext = (entry: OvertimeEntry, state: CalculatorState) => {
  const snapshot = entry.usarDadosCompetencia ? entry.competenciaSnapshot : undefined;

  return {
    cargo: snapshot?.cargo || state.cargo,
    padrao: snapshot?.padrao || state.padrao,
    funcao: snapshot?.funcao || state.funcao,
    aqTituloPerc: snapshot?.aqTituloPerc ?? state.aqTituloPerc,
    aqTreinoPerc: snapshot?.aqTreinoPerc ?? state.aqTreinoPerc,
    aqTituloVR: snapshot?.aqTituloVR ?? state.aqTituloVR,
    aqTreinoVR: snapshot?.aqTreinoVR ?? state.aqTreinoVR,
    recebeAbono: snapshot?.recebeAbono ?? state.recebeAbono,
    gratEspecificaTipo: snapshot?.gratEspecificaTipo || state.gratEspecificaTipo,
    vpni_lei: snapshot?.vpni_lei ?? state.vpni_lei,
    vpni_decisao: snapshot?.vpni_decisao ?? state.vpni_decisao,
    ats: snapshot?.ats ?? state.ats,
    regimePrev: snapshot?.regimePrev || state.regimePrev,
    tabelaPSS: snapshot?.tabelaPSS || state.tabelaPSS,
    pssSobreFC: snapshot?.pssSobreFC ?? state.pssSobreFC,
    incidirPSSGrat: snapshot?.incidirPSSGrat ?? state.incidirPSSGrat,
  };
};

export const calculateOvertimeEntryGross = (
  entry: OvertimeEntry,
  state: CalculatorState,
  courtConfig: CourtConfig
): OvertimeEntryGross => {
  const payrollRules = courtConfig.payrollRules;
  if (!payrollRules?.overtimeMonthHours) {
    return { id: entry.id, heVal50: 0, heVal100: 0, heTotal: 0 };
  }

  const period = resolveEntryPeriod(courtConfig, entry, state.periodo, state.mesRef, state.anoRef);
  const tables = getTablesForPeriod(period, courtConfig);
  const context = buildEntryContext(entry, state);

  const baseVencimento = tables.salario?.[context.cargo]?.[context.padrao] || 0;
  const gaj = baseVencimento * (payrollRules.gajRate || 0);

  const noFunctionCode = courtConfig.careerCatalog?.noFunctionCode || '';
  const funcaoValor = context.funcao && context.funcao !== noFunctionCode
    ? (tables.funcoes?.[context.funcao] || 0)
    : 0;

  const valorVR = tables.valorVR || 0;
  const aqTituloVal = period >= 1
    ? valorVR * (context.aqTituloVR || 0)
    : baseVencimento * (context.aqTituloPerc || 0);
  const aqTreinoVal = period >= 1
    ? valorVR * (context.aqTreinoVR || 0)
    : baseVencimento * (context.aqTreinoPerc || 0);

  const gratVal = context.gratEspecificaTipo === 'gae' || context.gratEspecificaTipo === 'gas'
    ? baseVencimento * (payrollRules.specificGratificationRate || 0)
    : 0;

  let baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal
    + (context.vpni_lei || 0) + (context.vpni_decisao || 0) + (context.ats || 0);

  if (context.recebeAbono) {
    let baseForPSS = baseHE;
    baseForPSS -= aqTreinoVal;
    if (!context.pssSobreFC) baseForPSS -= funcaoValor;
    if (!context.incidirPSSGrat) baseForPSS -= gratVal;

    const pssTable = courtConfig.historico_pss?.[context.tabelaPSS];
    const teto = pssTable?.teto_rgps || 0;
    const usaTeto = context.regimePrev === 'migrado' || context.regimePrev === 'rpc';
    if (pssTable) {
      if (usaTeto) {
        baseForPSS = Math.min(baseForPSS, teto);
      }
      baseHE += calculatePss(baseForPSS, pssTable);
    }
  }

  const valorHora = baseHE / payrollRules.overtimeMonthHours;
  const heVal50 = roundCurrency(valorHora * 1.5 * Math.max(0, Number(entry.qtd50 || 0)));
  const heVal100 = roundCurrency(valorHora * 2.0 * Math.max(0, Number(entry.qtd100 || 0)));

  return {
    id: entry.id,
    heVal50,
    heVal100,
    heTotal: roundCurrency(heVal50 + heVal100)
  };
};

export const calculateOvertimeEntriesGross = (
  entries: OvertimeEntry[],
  state: CalculatorState,
  courtConfig: CourtConfig
) => entries.map((entry) => calculateOvertimeEntryGross(entry, state, courtConfig));
