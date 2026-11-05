import type { IAgencyCalculationParams } from '../types';
import type { PensionHistoricalRule, Rubrica } from '../../../../types';
import type { PensionRetroEntry } from '../../../../types/pension';

type LinkParams = Pick<IAgencyCalculationParams, 'rubricasExtras' | 'pensionRetroEntries' | 'agencyConfig' | 'competencia'>;
const month = /^\d{4}-(0[1-9]|1[0-2])$/;

/** A draft cannot be finalized while its historical complementary contribution is unknown. */
export class PensionCalculationPendingError extends Error {
    readonly code = 'PENSION_CALCULATION_PENDING';
    readonly rubricaIds: string[];

    constructor(rubricaIds: string[], message = 'Apuração pendente: a Funpresp das rubricas por competência original ainda não foi vinculada à apuração histórica. Revise essas rubricas antes de concluir o holerite.') {
        super(message);
        this.name = 'PensionCalculationPendingError';
        this.rubricaIds = [...rubricaIds];
    }
}

const idsFor = (entry: PensionRetroEntry) => Array.isArray(entry.vinculos) ? entry.vinculos.filter(Boolean).map(link => link.rubricaId) : [];
const pending = (entry: PensionRetroEntry, message: string): never => {
    throw new PensionCalculationPendingError(idsFor(entry), `Apuração pendente (${entry.competencia || 'competência não informada'}): ${message}`);
};
const cents = (value: unknown, entry: PensionRetroEntry, label: string, positive = false): number => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (positive && value === 0) ||
        !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
        pending(entry, `${label} deve ser um valor ${positive ? 'positivo' : 'não negativo'}, com no máximo duas casas decimais.`);
    }
    return Math.round((value as number) * 100);
};
const eligible = (rubrica: Rubrica) => rubrica.pssCompetenciaSeparada ||
    (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada);

/** Shared by the form and the engine; incidence always comes from the linked rubric. */
export const deriveLinkedPensionBases = (
    params: Pick<LinkParams, 'rubricasExtras'>, entry: PensionRetroEntry,
): { baseRppsDevida: number; baseComplementarDevida: number } => {
    let rpps = cents(entry.baseRppsOriginal, entry, 'base RPPS original');
    let complementary = cents(entry.baseComplementarOriginal, entry, 'base complementar original');
    if (!Array.isArray(entry.vinculos) || entry.vinculos.length === 0) pending(entry, 'vincule pelo menos uma rubrica histórica.');
    const seen = new Set<string>();
    for (const link of entry.vinculos!) {
        if (!link || !link.rubricaId || seen.has(link.rubricaId)) pending(entry, 'vínculo de rubrica ausente ou duplicado na mesma apuração.');
        seen.add(link.rubricaId);
        const matches = (params.rubricasExtras ?? []).filter(r => r.id === link.rubricaId);
        const rubric = matches[0];
        if (matches.length !== 1 || !eligible(rubric)) pending(entry, 'há vínculo com rubrica removida, duplicada ou sem incidência histórica.');
        const amount = cents(link.valor, entry, 'valor distribuído', true);
        const signed = rubric.tipo === 'D' ? -amount : amount;
        if (rubric.pssCompetenciaSeparada) rpps += signed;
        if (rubric.incideFunpresp && rubric.funprespCompetenciaSeparada) complementary += signed;
    }
    if (rpps < 0 || complementary < 0) pending(entry, 'a distribuição resulta em base previdenciária negativa.');
    return { baseRppsDevida: rpps / 100, baseComplementarDevida: complementary / 100 };
};

/** Only a display helper; final allocation integrity is checked by assertPensionRubricsReady. */
export const getPensionRubricDistribution = (params: Pick<LinkParams, 'rubricasExtras' | 'pensionRetroEntries'>): Record<string, number> => {
    const totals: Record<string, number> = {};
    for (const entry of params.pensionRetroEntries ?? []) {
        for (const link of Array.isArray(entry.vinculos) ? entry.vinculos : []) {
            if (link && typeof link.valor === 'number' && Number.isFinite(link.valor)) {
                totals[link.rubricaId] = (totals[link.rubricaId] ?? 0) + Math.round(link.valor * 100);
            }
        }
    }
    return Object.fromEntries(Object.entries(totals).map(([id, value]) => [id, value / 100]));
};

export const resolveLinkedPensionRule = (params: LinkParams, entry: PensionRetroEntry): PensionHistoricalRule => {
    if (!month.test(entry.competencia) || !month.test(params.competencia ?? '') || entry.competencia > params.competencia!) {
        pending(entry, 'informe competência original válida, não posterior ao pagamento.');
    }
    const rules = params.agencyConfig?.previdenciaComplementar?.historicalRules ?? [];
    if (!Array.isArray(rules)) pending(entry, 'cadastro de regras históricas inválido.');
    const matches = rules.filter(rule => rule.id === entry.regraHistoricaId);
    if (!entry.regraHistoricaId || matches.length !== 1) pending(entry, 'selecione uma regra histórica cadastrada; a configuração atual não substitui a regra da competência.');
    const rule = matches[0];
    if (typeof rule.source !== 'string' || !rule.source.trim() || !month.test(rule.validFrom) || (rule.validTo != null && (!month.test(rule.validTo) || rule.validTo <= rule.validFrom)) ||
        entry.competencia < rule.validFrom || (rule.validTo != null && entry.competencia >= rule.validTo)) {
        pending(entry, 'a regra histórica não tem fonte ou vigência válida para esta competência.');
    }
    const active = rules.filter(candidate => month.test(candidate.validFrom) && entry.competencia >= candidate.validFrom &&
        (candidate.validTo == null || (month.test(candidate.validTo) && entry.competencia < candidate.validTo)));
    if (active.length !== 1) pending(entry, 'há regras históricas com vigências sobrepostas nesta competência.');
    if (!entry.tabelaPSS || entry.tabelaPSS !== rule.tabelaPSS || !params.agencyConfig?.historico_pss?.[entry.tabelaPSS]) {
        pending(entry, 'selecione a tabela PSS histórica correspondente à regra cadastrada.');
    }
    if (!rule.configuration || typeof rule.configuration !== 'object') pending(entry, 'configuração histórica indisponível.');
    return rule;
};

/** No inheritance from today's participation, selected options or rates. */
export const linkedHistoricalPensionParams = (params: IAgencyCalculationParams, entry: PensionRetroEntry): IAgencyCalculationParams => {
    const rule = resolveLinkedPensionRule(params, entry);
    return { ...params, competencia: entry.competencia, tabelaPSS: entry.tabelaPSS!,
        agencyConfig: { ...params.agencyConfig!, previdenciaComplementar: rule.configuration },
        regimePrev: entry.regimePrev!, funprespParticipacao: entry.participacao!,
        funprespAliq: entry.participacao === 'nao' ? 0 : entry.aliquotaNormal!,
        funprespFacul: entry.participacao === 'nao' ? 0 : entry.aliquotaFacultativa!,
        funprespBaseIntegral: entry.salarioParticipacaoVinculado, funprespVinculadaInicio: entry.inicioVinculado,
        funprespRevisarOpcoes: false, funprespIncluirFC: false, funprespIncluirGAS: false, funprespIncluirGAE: false,
        funprespIncluirAQTreino: false, funprespFaculValor: 0, funprespFaculForma: 'folha',
    };
};

export const prepareLinkedPensionRetroEntry = (params: IAgencyCalculationParams, entry: PensionRetroEntry) => {
    const bases = deriveLinkedPensionBases(params, entry);
    if (entry.modo !== 'completo' || !['mensal', '13'].includes(entry.tipo ?? '') || !['mensal', 'ea', '13'].includes(entry.destinoIR ?? '')) {
        pending(entry, 'informe apuração completa, espécie da folha e destino da dedução de IR.');
    }
    if (!['antigo', 'novo_antigo', 'migrado', 'rpc'].includes(entry.regimePrev ?? '') || !['nao', 'patrocinado', 'vinculado'].includes(entry.participacao ?? '')) {
        pending(entry, 'informe explicitamente o regime e a participação na competência original.');
    }
    cents(entry.contribuicaoRppsRecolhida, entry, 'RPPS já recolhido');
    cents(entry.contribuicaoComplementarRecolhida, entry, 'Funpresp já recolhida');
    if (entry.participacao !== 'nao' && (typeof entry.aliquotaNormal !== 'number' || !Number.isFinite(entry.aliquotaNormal) ||
        typeof entry.aliquotaFacultativa !== 'number' || !Number.isFinite(entry.aliquotaFacultativa))) {
        pending(entry, 'informe as alíquotas normal e facultativa históricas, inclusive zero quando não houver facultativa.');
    }
    for (const key of ['baseRppsDevida', 'baseComplementarDevida'] as const) {
        if (entry[key] !== undefined && cents(entry[key], entry, key) !== cents(bases[key], entry, key)) pending(entry, 'a base corrigida informada diverge das rubricas vinculadas.');
    }
    const historical = linkedHistoricalPensionParams(params, entry);
    return { entry: { ...entry, ...bases, vinculos: entry.vinculos!.map(link => ({ ...link })) }, params: historical,
        rule: resolveLinkedPensionRule(params, entry) };
};

export const assertPensionRubricsReady = (
    params: IAgencyCalculationParams,
): void => {
    const requiresComplementary = (params.rubricasExtras || []).filter(rubrica =>
        rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada &&
        Number.isFinite(Number(rubrica.valor)) && Number(rubrica.valor) > 0,
    );
    const entries = params.pensionRetroEntries ?? [];
    const linked = entries.filter(entry => entry.vinculos !== undefined);
    if (linked.length === 0) {
        if (requiresComplementary.length > 0) throw new PensionCalculationPendingError(requiresComplementary.map(rubrica => rubrica.id));
        return;
    }
    const rubricIds = (params.rubricasExtras ?? []).filter(rubric => eligible(rubric) && Number(rubric.valor) > 0).map(rubric => rubric.id);
    const entriesIds = new Set<string>();
    const keys = new Set<string>();
    for (const entry of entries) {
        if (!entry.id || entriesIds.has(entry.id)) throw new PensionCalculationPendingError(rubricIds, 'Apuração pendente: identificador de competência ausente ou duplicado.');
        entriesIds.add(entry.id);
        const key = `${entry.competencia}:${entry.tipo ?? 'mensal'}`;
        if (keys.has(key)) throw new PensionCalculationPendingError(rubricIds, 'Apuração pendente: agrupe as rubricas da mesma competência e espécie em uma apuração.');
        keys.add(key);
    }
    const distributed: Record<string, number> = {};
    for (const entry of linked) {
        prepareLinkedPensionRetroEntry(params, entry);
        for (const link of entry.vinculos!) distributed[link.rubricaId] = (distributed[link.rubricaId] ?? 0) + cents(link.valor, entry, 'valor distribuído', true);
    }
    for (const rubric of params.rubricasExtras ?? []) {
        if (!eligible(rubric) || Number(rubric.valor) === 0) continue;
        const expected = cents(rubric.valor, linked[0], 'valor da rubrica histórica', true);
        if (expected !== (distributed[rubric.id] ?? 0)) {
            throw new PensionCalculationPendingError([rubric.id], 'Apuração pendente: distribua integralmente o valor de cada rubrica histórica entre as competências, sem excedente ou duplicação.');
        }
    }
};
