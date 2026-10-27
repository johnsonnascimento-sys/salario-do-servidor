import type { IAgencyCalculationParams } from '../types';
import type { PensionParticipation } from '../../../../types/pension';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';
import { buildComplementaryBase, getPensionEligibility, requirePensionTable, type PensionComponents } from './pensionCalculations';

export { getPensionEligibility } from './pensionCalculations';

export interface PensionContext {
    base: number;
    teto: number;
    regimePrev: IAgencyCalculationParams['regimePrev'];
    allowed: PensionParticipation[];
    unavailableReasons: Partial<Record<PensionParticipation, string>>;
    componentes: Record<string, number>;
}

/** Explicit historical bases must be supplied together with the original competence/table/regime. */
export const buildPensionContext = (
    params: IAgencyCalculationParams, base: number, componentes: Record<string, number> = {}, tipo: 'mensal' | '13' = 'mensal',
): PensionContext => {
    const table = requirePensionTable(params);
    Object.entries(componentes).forEach(([name, value]) => {
        if (!Number.isFinite(value)) throw new Error(`Previdência: componente ${name} inválido.`);
    });
    return { base, teto: table.teto_rgps, regimePrev: params.regimePrev, componentes,
        ...getPensionEligibility(params.regimePrev, base, table.teto_rgps, tipo, !!params.agencyConfig?.previdenciaComplementar?.enabled) };
};

export interface MonthlyPensionContext extends PensionContext {
    baseRppsIntegral: number;
    salaryComponents: PensionComponents;
}

/** Shared composition for deductions and eligibility; never validates the current participation or its elected salary/rate. */
export const calculateMonthlyPensionContext = async (params: IAgencyCalculationParams): Promise<MonthlyPensionContext> => {
    const config = params.agencyConfig;
    if (!config) throw new Error('agencyConfig is required for JMU calculations.');
    const rules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const vencimento = salario[params.cargo]?.[params.padrao];
    if (!Number.isFinite(vencimento) || vencimento < 0) throw new Error('Previdência: base salarial indisponível ou inválida.');
    const gaj = vencimento * rules.gajRate;
    const aqTitulo = params.periodo >= 1 ? valorVR * params.aqTituloVR : vencimento * normalizeAQPercent(params.aqTituloPerc);
    const aqTreino = params.periodo >= 1 ? valorVR * params.aqTreinoVR : vencimento * normalizeAQPercent(params.aqTreinoPerc);
    const fc = isNoFunction(params.funcao, config) ? 0 : funcoes[params.funcao];
    const gratificacao = params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas'
        ? vencimento * rules.specificGratificationRate : 0;
    const vantagens = (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);
    let rubricas = 0;
    let rubricasRpps = 0;
    for (const rubrica of params.rubricasExtras || []) {
        const value = Number(rubrica.valor);
        if (!Number.isFinite(value)) throw new Error('Previdência: valor de rubrica inválido.');
        const signed = (rubrica.tipo === 'D' ? -1 : 1) * Math.max(0, value);
        if (rubrica.incideFunpresp && !rubrica.funprespCompetenciaSeparada) rubricas += signed;
        if (rubrica.incidePSS && !rubrica.pssCompetenciaSeparada) rubricasRpps += signed;
    }
    const salaryComponents = { vencimento, gaj, aqTitulo, aqTreino, fc, gratificacao, vantagens, rubricas };
    Object.entries(salaryComponents).forEach(([name, value]) => {
        if (!Number.isFinite(value)) throw new Error(`Previdência: componente ${name} inválido.`);
    });
    const complementary = buildComplementaryBase(params, salaryComponents);
    // Keep the original accumulation order, including floating-point intermediates.
    let baseRppsIntegral = vencimento + gaj + aqTitulo + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);
    if (params.incidirPSSGrat) baseRppsIntegral += gratificacao;
    if (params.pssSobreFC) baseRppsIntegral += fc;
    baseRppsIntegral = Math.max(0, baseRppsIntegral + rubricasRpps);
    return { ...buildPensionContext(params, complementary.base, complementary.componentes), baseRppsIntegral, salaryComponents };
};
