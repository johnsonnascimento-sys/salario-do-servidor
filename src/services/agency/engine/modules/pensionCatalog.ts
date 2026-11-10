import type { PrevidenciaComplementarConfig, PensionRubricRule, Rubrica } from '../../../../types';
import type { PensionParticipation, PensionRubricAssessment } from '../../../../types/pension';
import type { IAgencyCalculationParams } from '../types';
import { PensionCalculationPendingError } from './pensionErrors';

const month = /^\d{4}-(0[1-9]|1[0-2])$/;
const classifications = ['obrigatoria', 'facultativa', 'excluida', 'pendente'];
const fail = (message: string): never => { throw new Error(`Catálogo previdenciário: ${message}`); };

/** Catalog versions have inclusive starts and exclusive ends; each rubric has one rule per month. */
export const validatePensionRubricCatalog = (catalog: unknown): void => {
    if (!Array.isArray(catalog)) fail('cadastro ausente ou inválido.');
    const groups = new Map<string, PensionRubricRule[]>();
    for (const rule of catalog as PensionRubricRule[]) {
        if (!rule || typeof rule.id !== 'string' || !rule.id.trim() || typeof rule.label !== 'string' || !rule.label.trim() ||
            !classifications.includes(rule.classification) || typeof rule.source !== 'string' || !rule.source.trim() ||
            !month.test(rule.validFrom) || (rule.validTo != null && (!month.test(rule.validTo) || rule.validTo <= rule.validFrom))) {
            fail('cada verba exige identificador, descrição, enquadramento, fonte e vigência válidos.');
        }
        groups.set(rule.id, [...groups.get(rule.id) ?? [], rule]);
    }
    for (const versions of groups.values()) {
        versions.sort((a, b) => a.validFrom.localeCompare(b.validFrom));
        for (let index = 1; index < versions.length; index++) {
            const previous = versions[index - 1];
            if (previous.validTo == null || previous.validTo > versions[index].validFrom) fail('há versões sobrepostas para a mesma verba.');
        }
    }
};

export const resolvePensionRubricRule = (
    config: PrevidenciaComplementarConfig | undefined, rubricId: string | undefined, competencia: string,
): PensionRubricRule => {
    validatePensionRubricCatalog(config?.rubricCatalog);
    if (!month.test(competencia)) fail('informe uma competência válida para o enquadramento.');
    if (!rubricId) fail('selecione a natureza da verba no catálogo.');
    const matches = config!.rubricCatalog!.filter(rule => rule.id === rubricId && rule.validFrom <= competencia &&
        (rule.validTo == null || competencia < rule.validTo));
    if (matches.length !== 1) fail('a verba não possui enquadramento único vigente na competência.');
    return matches[0];
};

const validDate = (value: unknown): value is string => {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** Validates the entry without guessing its nature from the user-entered description. */
export const validatePensionRubric = (
    config: PrevidenciaComplementarConfig | undefined, rubric: Rubrica, competencia: string, participation: PensionParticipation,
): PensionRubricRule | null => {
    const relevant = Number(rubric.valor) > 0 && (rubric.incideFunpresp || (rubric.tipo === 'C' && participation !== 'nao'));
    if (!relevant) return null;
    const reject = (message: string): never => {
        throw new PensionCalculationPendingError([rubric.id], `Apuração pendente (${competencia || 'competência não informada'}): ${message}`);
    };
    let rule: PensionRubricRule;
    try { rule = resolvePensionRubricRule(config, rubric.pensionRubricId, competencia); }
    catch (error) { return reject(error instanceof Error ? error.message : 'revise a natureza da verba.'); }
    if (rule.classification === 'pendente') reject('o enquadramento desta verba exige revisão administrativa.');
    if (rule.classification === 'excluida' && rubric.incideFunpresp) reject('a verba é excluída da base da Funpresp na competência.');
    if (rule.classification === 'obrigatoria' && participation !== 'nao' && !rubric.incideFunpresp) {
        reject('a verba tem inclusão obrigatória na Funpresp; revise a incidência informada.');
    }
    if (rule.classification === 'facultativa' && rubric.incideFunpresp) {
        if (!validDate(rubric.pensionOptionDate) || rubric.pensionOptionDate.slice(0, 7) > competencia ||
            typeof rubric.pensionOptionReference !== 'string' || !rubric.pensionOptionReference.trim()) {
            reject('a inclusão facultativa exige data real do protocolo e referência da opção, com efeitos até a competência.');
        }
        if (rubric.pensionOptionDate!.slice(0, 7) === competencia && rubric.pensionOptionDate!.slice(8) !== '01' &&
            rubric.pensionOptionAmountConfirmed !== true) {
            reject('confirme que o valor considera somente a parcela elegível a partir da data da opção, sem prorrata automática.');
        }
    }
    return rule;
};

/** Produces an audit record only after validating both classification and optional election. */
export const assessPensionRubric = (
    config: PrevidenciaComplementarConfig | undefined, rubric: Rubrica, competencia: string, participation: PensionParticipation,
): PensionRubricAssessment | null => {
    const rule = validatePensionRubric(config, rubric, competencia, participation);
    if (!rule) return null;
    const assessment: PensionRubricAssessment = { rubricaId: rubric.id, ruleId: rule.id,
        classification: rule.classification, source: rule.source, competencia };
    if (rule.classification === 'facultativa' && rubric.incideFunpresp) {
        assessment.optionDate = rubric.pensionOptionDate;
        assessment.optionReference = rubric.pensionOptionReference!.trim();
        if (rubric.pensionOptionAmountConfirmed === true) assessment.optionAmountConfirmed = true;
    }
    return assessment;
};

/** A timing flag without incidence cannot bypass mandatory monthly classification. */
export const validateMonthlyPensionRubrics = (params: Pick<IAgencyCalculationParams,
    'rubricasExtras' | 'agencyConfig' | 'competencia' | 'funprespParticipacao'>): PensionRubricAssessment[] => {
    const assessments: PensionRubricAssessment[] = [];
    for (const rubric of params.rubricasExtras ?? []) {
        const historical = rubric.pssCompetenciaSeparada || (rubric.incideFunpresp && rubric.funprespCompetenciaSeparada);
        // A separate historical RPPS assessment does not certify an explicitly selected monthly Funpresp inclusion.
        const monthlyComplementary = rubric.incideFunpresp && !rubric.funprespCompetenciaSeparada;
        if (!historical || monthlyComplementary) {
            const assessment = assessPensionRubric(params.agencyConfig?.previdenciaComplementar, rubric, params.competencia ?? '', params.funprespParticipacao);
            if (assessment) assessments.push(assessment);
        }
    }
    return assessments.sort((a, b) => a.rubricaId.localeCompare(b.rubricaId));
};
