import type { IAgencyCalculationParams } from '../types';
import type { PensionCalculationMemory } from '../../../../types/pension';
import type { CommissionPayMemory, RgpsCalculationMemory } from '../../../../types/commissionProfile';
import { isNoFunction } from './configRules';
import { calculateIrrfProgressive } from '../../../../core/calculations/taxUtils';

export type { CommissionPayMemory } from '../../../../types/commissionProfile';

export interface CommissionPayResolution {
    allowCareer: boolean;
    funcaoValor: number;
    originRemuneration: number;
    regime: 'rpps' | 'rgps';
    memory?: CommissionPayMemory;
}

export type CommissionInssMemory = RgpsCalculationMemory;

export interface CommissionIncomeTaxMemory {
    amount: number;
    gross: number;
    base: number;
    deduction: number;
    simplified: boolean;
    reduction: number;
    source: string;
    tipo: 'mensal' | '13' | 'ferias';
}

const fail = (message: string): never => { throw new Error(`CJ/FC: ${message}`); };
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const nonnegative = (value: unknown, label: string): number => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        fail(`${label} deve ser informado como valor não negativo.`);
    }
    return value as number;
};

function versionForCompetence<T extends { validFrom: string; validTo?: string | null; source: string }>(
    versions: T[] | undefined, competence: string | undefined, label: string,
): T {
    if (!competence || !/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) fail('informe a competência da folha.');
    const date = `${competence}-01`;
    const matches = (versions || []).filter(version => version.validFrom <= date && (!version.validTo || date < version.validTo));
    if (matches.length !== 1 || !matches[0].source?.trim()) fail(`${label} sem regra e fonte inequívocas para a competência.`);
    return matches[0];
}

/** Resolves payable FC/CJ independently from the tables for effective PJU careers. */
export function resolveCommissionPay(
    params: IAgencyCalculationParams, periodData?: { funcoes: Record<string, number> },
): CommissionPayResolution {
    const config = params.agencyConfig;
    if (!config) fail('configuração do órgão indisponível.');
    const profile = params.commissionProfile;
    if (!profile) {
        const value = isNoFunction(params.funcao, config) ? 0 : (periodData?.funcoes[params.funcao] || 0);
        return { allowCareer: true, funcaoValor: value, originRemuneration: 0, regime: 'rpps' };
    }
    if (profile.kind !== 'exclusive_cj' && profile.kind !== 'external') fail('vínculo funcional inválido.');
    if (config.commission?.enabled !== true) fail('simulação deste vínculo ainda não habilitada para o órgão.');
    const version = versionForCompetence(config.commission.versions, params.competencia, 'tabela de CJ/FC');
    const functionCode = params.funcao.toLowerCase();
    const cj = /^cj[1-4]$/.test(functionCode);
    const fc = /^fc[1-6]$/.test(functionCode);
    if (!cj && !fc) fail('selecione um cargo em comissão ou função comissionada válido.');
    if (profile.kind === 'exclusive_cj' && !cj) fail('a função comissionada exige cargo efetivo ou emprego público.');
    const integral = nonnegative((cj ? version.cjIntegral : version.fc)[functionCode], 'retribuição de CJ/FC');
    if (integral <= 0) fail('retribuição de CJ/FC indisponível.');
    let option: CommissionPayMemory['option'] = 'full';
    let rate = 1;
    let originRemuneration = 0;
    let regime: CommissionPayResolution['regime'] = 'rgps';
    if (profile.kind === 'external') {
        if (profile.originLink !== 'statutory' && profile.originLink !== 'public_employee') fail('informe o vínculo no órgão de origem.');
        if (profile.pensionRegime !== 'rpps' && profile.pensionRegime !== 'rgps') fail('informe o regime previdenciário de origem.');
        if (profile.originLink === 'public_employee' && profile.pensionRegime !== 'rgps') fail('emprego público exige enquadramento no RGPS.');
        regime = profile.pensionRegime;
        if (cj && profile.cjOption !== 'full' && profile.cjOption !== 'effective_plus_65') fail('informe a opção remuneratória do CJ.');
        option = fc ? 'fc' : profile.cjOption!;
        if (option !== 'full') {
            if (profile.payment !== 'origin' && profile.payment !== 'judiciary') fail('informe quem paga a remuneração de origem.');
            if (profile.payment === 'judiciary') originRemuneration = nonnegative(profile.originRemuneration, 'remuneração de origem paga na folha');
        }
        if (option === 'effective_plus_65') {
            rate = nonnegative(version.cjOptionRate, 'percentual da opção remuneratória');
            if (rate <= 0 || rate > 1) fail('percentual da opção remuneratória inválido.');
        }
    }
    const funcaoValor = round(integral * rate);
    return { allowCareer: false, funcaoValor, originRemuneration, regime, memory: {
        competence: params.competencia!, profile: profile.kind, functionCode, option, tableAmount: integral, rate,
        paidAmount: funcaoValor, originRemuneration,
        payment: profile.kind === 'external' && option !== 'full' ? profile.payment : undefined, regime, source: version.source,
    } };
}

/** INSS is assessed on the combined base, with the prior source using the first bands. */
export function calculateCommissionInss(
    params: IAgencyCalculationParams, base: number, tipo: 'mensal' | '13' = 'mensal',
): CommissionInssMemory {
    const version = versionForCompetence(params.agencyConfig?.rgps?.versions, params.competencia, 'tabela de INSS');
    const teto = nonnegative(version.teto, 'teto do INSS');
    if (teto <= 0 || !version.faixas?.length) fail('tabela de INSS inválida.');
    let previous = 0;
    for (const band of version.faixas) {
        if (!Number.isFinite(band.ate) || band.ate <= previous || !Number.isFinite(band.aliq) || band.aliq <= 0 || band.aliq > 1) fail('faixas de INSS inválidas.');
        previous = band.ate;
    }
    if (Math.abs(previous - teto) > 0.005) fail('faixas de INSS incompatíveis com o teto.');
    const profile = params.commissionProfile;
    const otherBase = profile?.kind === 'exclusive_cj'
        ? nonnegative((tipo === '13' ? profile.otherRgpsThirteenthBase : profile.otherRgpsBase) ?? 0, 'base em outros vínculos RGPS') : 0;
    const checkedBase = nonnegative(base, 'base de INSS');
    const progressive = (value: number) => {
        let lower = 0;
        let contribution = 0;
        for (const band of version.faixas) {
            contribution += Math.max(0, Math.min(value, band.ate) - lower) * band.aliq;
            lower = band.ate;
        }
        return round(contribution);
    };
    const amount = round(Math.max(0, progressive(Math.min(checkedBase + otherBase, teto)) - progressive(Math.min(otherBase, teto))));
    return { competencia: params.competencia!, tipo, base: checkedBase, otherBase,
        totalBase: Math.min(checkedBase + otherBase, teto), teto, amount, source: version.source };
}

/** A ceded person's contribution comes from the documented statement of the source regime. */
export function resolveCommissionWithholding(params: IAgencyCalculationParams, tipo: 'mensal' | '13' = 'mensal'): number {
    const profile = params.commissionProfile;
    if (profile?.kind !== 'external') return 0;
    return nonnegative(tipo === '13' ? profile.withholdingThirteenth : profile.withholdingMonthly,
        tipo === '13' ? 'retenção previdenciária documentada do 13º' : 'retenção previdenciária documentada da folha');
}

/** Applies the sourced progressive table and the most beneficial permitted deduction. */
export function calculateCommissionIncomeTax(
    params: IAgencyCalculationParams, gross: number, legalDeductions: number,
    tipo: 'mensal' | '13' | 'ferias' = 'mensal',
): CommissionIncomeTaxMemory {
    const checkedGross = round(nonnegative(gross, 'rendimento tributável de IR'));
    const checkedDeductions = round(nonnegative(legalDeductions, 'deduções legais de IR'));
    const config = params.agencyConfig;
    const metadata = config?.historico_ir_metadata?.[params.tabelaIR];
    const date = `${params.competencia}-01`;
    const payroll = metadata?.payroll;
    if (!params.competencia || !/^\d{4}-(0[1-9]|1[0-2])$/.test(params.competencia) ||
        !metadata?.reference?.trim() || metadata.validFrom > date || (metadata.validTo && date >= metadata.validTo) ||
        !payroll || typeof payroll.reductionApplicable !== 'boolean') fail('tabela de IR e regras de folha precisam de vigência e fonte para a competência.');
    const simplifiedDeduction = nonnegative(payroll.simplifiedDeduction, 'desconto simplificado de IR');
    const deduction = Math.max(checkedDeductions, simplifiedDeduction);
    const base = Math.max(0, round(checkedGross - deduction));
    const beforeReduction = calculateIrrfProgressive(base, config!.historico_ir_brackets?.[params.tabelaIR] || []);
    let reduction = 0;
    if (payroll.reductionApplicable) {
        const rule = payroll.reduction;
        if (!rule || rule.status !== 'verified' || !rule.reference?.trim() ||
            ![rule.exemptIncome, rule.partialIncome, rule.maxReduction, rule.intercept, rule.slope].every(value => Number.isFinite(value) && value >= 0) ||
            rule.partialIncome <= rule.exemptIncome) fail('redução do imposto pendente de regra verificada.');
        const limit = checkedGross <= rule.exemptIncome ? rule.maxReduction
            : checkedGross <= rule.partialIncome ? Math.max(0, rule.intercept - rule.slope * checkedGross) : 0;
        reduction = round(Math.min(beforeReduction, limit));
    }
    return { amount: round(Math.max(0, beforeReduction - reduction)), gross: checkedGross, base,
        deduction, simplified: simplifiedDeduction > checkedDeductions, reduction, source: metadata!.reference, tipo };
}

export function emptyCommissionPensionMemory(params: IAgencyCalculationParams, tipo: 'mensal' | '13' = 'mensal'): PensionCalculationMemory {
    return { competencia: params.competencia || '', tipo, participacao: 'nao', teto: 0,
        baseRppsIntegral: 0, baseRpps: 0, baseComplementarIntegral: 0, baseComplementar: 0,
        aliquotaNormal: 0, aliquotaFacultativa: 0, normal: 0, facultativa: 0, facultativaExterna: 0,
        aporteFolha: 0, aporteExterno: 0, patrocinador: 0, descontoFolha: 0, dedutivelIRFolha: 0,
        deducaoSujeitaLimiteAnual: 0, componentes: {} };
}
