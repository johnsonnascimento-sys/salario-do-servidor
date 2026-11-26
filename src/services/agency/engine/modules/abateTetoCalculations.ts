import type { AbateTetoMemory, AbateTetoRuleVersion } from '../../../../types/constitutionalCeiling';
import { resolveConstitutionalCeiling } from '../../../config/constitutionalCeiling';
import type { IAgencyCalculationParams } from '../types';
import { calculateBaseComponents } from './baseCalculations';
import { calculateMonthlyPensionContext } from './pensionContext';
import { resolveCalendarDays } from '../../../../utils/calendarDaySelection';

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);

type Version = { valid_from: string; valid_to: string | null };
const validDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = new Date(value);
    return Number.isFinite(timestamp.getTime()) && timestamp.toISOString().slice(0, 10) === value;
};
const validPeriods = (versions: Version[] | undefined): boolean => Array.isArray(versions) && versions.length > 0 &&
    versions.every(version => version && validDate(version.valid_from) &&
        (version.valid_to === null || (validDate(version.valid_to) && version.valid_to >= version.valid_from)));

const onDate = <T extends Version>(versions: T[] | undefined, date: string): T | undefined => {
    if (!Array.isArray(versions)) return undefined;
    const matches = versions.filter(version => version && /^\d{4}-\d{2}-\d{2}$/.test(version.valid_from) &&
        version.valid_from <= date && (version.valid_to === null || version.valid_to >= date));
    return matches.length === 1 ? matches[0] : undefined;
};

/** Resolves only the reviewed, single-employment monthly pilot. */
export async function calculateAbateTeto(
    params: IAgencyCalculationParams,
    substitution: { total: number; entries: Array<{ isEA: boolean; pssIsEA: boolean }> },
    overtimeAmount: number,
): Promise<AbateTetoMemory | undefined> {
    if (params.abateTetoVersion !== 1 || params.agencyConfig?.abateTetoActivation === undefined) return undefined;
    const competence = params.competencia || '';
    const baseMemory = { competence, amount: 0 };
    const outside = (reason: string): AbateTetoMemory => ({ ...baseMemory, status: 'out_of_scope', reason });
    const pending = (reason: string): AbateTetoMemory => ({ ...baseMemory, status: 'pending', reason });
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) return pending('Competência inválida para o abate-teto.');
    const config = params.agencyConfig;
    const date = competence + '-01';
    const activations = config?.abateTetoActivation?.versions;
    if (!validPeriods(activations) || activations!.some(version => typeof version.enabled !== 'boolean')) {
        return pending('Configuração de ativação do abate-teto inválida.');
    }
    const matches = activations!.filter(version => version.valid_from <= date &&
        (version.valid_to === null || version.valid_to >= date));
    if (matches.length > 1) return pending('Ativações sobrepostas para o abate-teto.');
    const activation = matches[0];
    if (activation?.enabled !== true) return outside('órgão ou competência fora da ativação do piloto.');
    if (params.commissionProfile) return outside('vínculo externo ou cargo exclusivo fora do piloto.');
    if (params.funprespParticipacao !== 'nao' || params.funprespFacul > 0 || (params.funprespFaculValor || 0) > 0) {
        return outside('participação em previdência complementar fora do piloto.');
    }
    const rubrics = params.rubricasExtras || [];
    if (rubrics.some(rubric => rubric.valor !== 0 &&
        ((rubric.vantagemPessoal !== 'VPNI' && rubric.vantagemPessoal !== 'ATS') || rubric.tipo !== 'C'))) {
        return outside('rubrica manual avulsa fora do piloto.');
    }
    const historicalSubstitution = (params.substitutionEntries || []).some(entry =>
        Object.values(entry.periodosPorFuncao || {}).some(selection =>
            resolveCalendarDays(selection, competence).meses.some(month => month.competencia !== competence)));
    if (historicalSubstitution || (params.pensionRetroEntries || []).length || rubrics.some(rubric => rubric.valor > 0 &&
        (rubric.isEA || rubric.pssCompetenciaSeparada || rubric.funprespCompetenciaSeparada)) ||
        (substitution.total > 0 && (params.substIsEA || params.substPssIsEA ||
            substitution.entries.some(entry => entry.isEA || entry.pssIsEA)))) {
        return outside('verbas de competência original exigem apuração própria.');
    }
    const thirteenth = params.tipoCalculo !== 'comum' || params.thirteenthPayroll !== undefined ||
        [params.adiant13Venc, params.adiant13FC, params.segunda13Venc, params.segunda13FC].some(value => value > 0) ||
        [params.segunda13ModoVenc, params.segunda13ModoFC].some(mode => mode !== undefined && mode !== 'excluir');
    const overtime = overtimeAmount > 0;
    if (params.ferias1_3 > 0 || params.feriasAntecipadas || thirteenth || overtime) {
        return outside('férias, 13º ou horas extras exigem apuração separada.');
    }
    if (params.gaactaAtivo || params.licencaDias > 0) {
        return outside('GAACTA ou licença compensatória fora da matriz homologada.');
    }
    if (!validPeriods(config?.abateTetoRules?.versions)) return pending('Vigências das regras do abate-teto inválidas.');
    const rule = onDate<AbateTetoRuleVersion>(config?.abateTetoRules?.versions, date);
    const [year, month] = competence.split('-').map(Number);
    const reference = resolveConstitutionalCeiling(config?.constitutionalCeilingReference, year, month);
    if (!rule?.source || !reference || !rule.rubrics) return pending('Regra ou referência do abate-teto indisponível para a competência.');
    const base = await calculateBaseComponents(params);
    const pension = await calculateMonthlyPensionContext(params);
    const fixedRubric = (kind: 'VPNI' | 'ATS') => rubrics.filter(rubric => rubric.vantagemPessoal === kind && rubric.valor > 0);
    const vpni = fixedRubric('VPNI');
    const ats = fixedRubric('ATS');
    const fullyContributory = (entries: typeof rubrics) => entries.every(entry => entry.incideIR && entry.incidePSS);
    const candidates = [
        { code: 'vencimento', label: 'Vencimento básico', amount: base.vencimento, contributes: true },
        { code: 'gaj', label: 'GAJ', amount: base.gaj, contributes: true },
        { code: 'aqTitulo', label: 'AQ de títulos', amount: base.aqTitulo, contributes: true },
        { code: 'aqTreino', label: 'AQ de treinamento', amount: base.aqTreino, contributes: false },
        { code: 'fc', label: 'FC/CJ', amount: base.funcaoValor, contributes: params.pssSobreFC },
        { code: 'gratificacao', label: 'GAE/GAS', amount: base.gratEspecifica, contributes: params.incidirPSSGrat },
        { code: 'vpni', label: 'VPNI', amount: base.vpniLei + base.vpniDecisao + vpni.reduce((sum, rubric) => sum + rubric.valor, 0), contributes: fullyContributory(vpni) },
        { code: 'ats', label: 'ATS', amount: base.ats + ats.reduce((sum, rubric) => sum + rubric.valor, 0), contributes: fullyContributory(ats) },
        { code: 'substituicao', label: 'Substituição de função', amount: substitution.total, contributes: false },
    ];
    const components: NonNullable<AbateTetoMemory['components']> = [];
    for (const candidate of candidates) {
        if (!Number.isFinite(candidate.amount) || candidate.amount < 0) return pending('Componente inválido na base do abate-teto.');
        if (candidate.amount === 0) continue;
        const classification = rule.rubrics[candidate.code];
        if (classification?.kind !== 'monthly' || !classification.provision) return pending('Classificação mensal ausente para ' + candidate.label + '.');
        components.push({ code: candidate.code, label: candidate.label, amount: cents(candidate.amount) / 100,
            kind: classification.kind, provision: classification.provision });
    }
    const monthlyCents = cents(candidates.reduce((sum, component) => sum + component.amount, 0));
    const excess = Math.max(0, monthlyCents - cents(reference.amount));
    const memory: AbateTetoMemory = { ...baseMemory, status: 'ready', amount: excess / 100, limit: reference.amount,
        monthlyGross: monthlyCents / 100, components, source: rule.source,
        rppsBefore: pension.baseRppsIntegral, rppsAfter: pension.baseRppsIntegral - excess / 100 };
    if (excess > 0 && (candidates.some(component => component.amount > 0 && !component.contributes) ||
        cents(pension.baseRppsIntegral) !== monthlyCents)) {
        return { ...memory, status: 'pending', amount: 0, rppsAfter: pension.baseRppsIntegral,
            reason: 'Apuração pendente: parcelas sujeitas ao teto têm incidências distintas de IRRF e RPPS.' };
    }
    return memory;
}

/** Include the amounts excluded from the monthly ceiling in the same audit memory. */
export function appendExcludedCeilingComponents(
    memory: AbateTetoMemory | undefined, params: IAgencyCalculationParams, amounts: Record<string, number>,
): AbateTetoMemory | undefined {
    if (!memory || memory.status !== 'ready') return memory;
    const rule = onDate(params.agencyConfig?.abateTetoRules?.versions, memory.competence + '-01');
    const labels: Record<string, string> = { abono: 'Abono de permanência', auxAlimentacao: 'Auxílio-alimentação',
        auxPreEscolar: 'Auxílio pré-escolar', auxTransporte: 'Auxílio-transporte', diarias: 'Diárias',
        indenizacaoTransporte: 'Indenização de transporte' };
    for (const [code, value] of Object.entries(amounts)) {
        if (value === 0) continue;
        const classification = rule?.rubrics[code];
        if (!Number.isFinite(value) || value < 0 || classification?.kind !== 'excluded' || !classification.provision) {
            memory.status = 'pending';
            memory.amount = 0;
            memory.reason = 'Apuração pendente: exclusão sem classificação homologada para ' + (labels[code] || code) + '.';
            return memory;
        }
        memory.components!.push({ code, label: labels[code] || code, amount: cents(value) / 100,
            kind: classification.kind, provision: classification.provision });
    }
    return memory;
}
