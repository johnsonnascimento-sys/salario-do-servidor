import type { CourtConfig } from '../../../../types';
import type { IrEaContext, IrEaMemory } from '../../../../types/irEa';
import { calculateIrrfProgressive } from '../../../../core/calculations/taxUtils';

export interface IrEaSource {
    key: string;
    value: number;
    competencias?: string[];
    deductionReference?: string;
}

const round = (value: number) => Math.round(value * 100) / 100;
const fail = (message: string): never => { throw new Error(`IR-EA: ${message}`); };
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Informational allocation only; taxation is assessed once on the combined base. */
export const allocateIrEaCents = (tax: number, sources: IrEaSource[]): Record<string, number> => {
    const positives = sources.filter(source => source.value > 0);
    const total = positives.reduce((sum, source) => sum + source.value, 0);
    const cents = Math.round(tax * 100);
    const allocations = positives.map((source, index) => {
        const exact = total > 0 ? cents * source.value / total : 0;
        return { key: source.key, index, cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
    });
    let residual = cents - allocations.reduce((sum, item) => sum + item.cents, 0);
    const order = [...allocations].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    for (const item of order) {
        if (residual-- <= 0) break;
        item.cents++;
    }
    return Object.fromEntries(allocations.map(item => [item.key, item.cents / 100]));
};

/** Classify EA-tagged sources by their actual year before assessing RRA. */
export function classifyIrEaSources(sources: IrEaSource[], context?: IrEaContext) {
    const active = sources.filter(source => source.value !== 0);
    if (!active.length) return { prior: [], current: [], competencias: [], mesPagamento: '' };
    const payment = context?.mesPagamento || '';
    if (!monthPattern.test(payment)) fail('informe o mês de pagamento (AAAA-MM).');
    const year = payment.slice(0, 4);
    const prior: IrEaSource[] = [];
    const current: IrEaSource[] = [];
    for (const source of active) {
        if (!Number.isFinite(source.value)) fail('valor de rendimento inválido.');
        if (source.value < 0 && !source.deductionReference?.trim()) fail('informe o fundamento do desconto manual de EA.');
        if (!Array.isArray(source.competencias)) fail('informe competências válidas para cada rendimento de EA.');
        const months = [...new Set(source.competencias)];
        if (!months.length || months.some(month => typeof month !== 'string' || !monthPattern.test(month))) fail('informe competências válidas para cada rendimento de EA.');
        if (months.some(month => month > payment)) fail('competência posterior ao pagamento.');
        const old = months.some(month => month.slice(0, 4) < year);
        const same = months.some(month => month.slice(0, 4) === year);
        if (old && same) fail('separe o valor das competências de anos anteriores e do próprio ano em entradas diferentes.');
        (old ? prior : current).push({ ...source, competencias: months });
    }
    if (new Set(active.map(source => source.key)).size !== active.length) fail('identificadores de entradas duplicados.');
    const competencias = [...new Set(prior.filter(source => source.value > 0).flatMap(source => source.competencias || []))].sort();
    if (prior.some(source => source.value < 0 && source.competencias?.some(month => !competencias.includes(month)))) fail('competência do desconto sem rendimento correspondente no grupo de RRA.');
    return { prior, current, competencias, mesPagamento: payment };
}

export function calculateIrEa(
    classified: ReturnType<typeof classifyIrEaSources>,
    config: CourtConfig,
    context: IrEaContext | undefined,
    contributions: { rpps: number; complementary: number; dependents: number }
): { memory?: IrEaMemory; entryTax: Record<string, number>; tax: number } {
    if (!classified.prior.length) return { entryTax: {}, tax: 0 };
    const { prior, competencias, mesPagamento } = classified;
    const override = context?.mesesRraInformados;
    if (override !== undefined && (!Number.isFinite(override) || override <= 0 || Math.abs(override * 10 - Math.round(override * 10)) > 1e-8 || !context?.referenciaMeses?.trim())) {
        fail('número de meses informado deve ser positivo, ter até uma casa decimal e referência documental.');
    }
    const meses = override ?? competencias.length;
    const paymentDate = `${mesPagamento}-01`;
    const candidates = Object.entries(config.historico_ir_metadata || {}).filter(([, metadata]) =>
        metadata.validFrom <= paymentDate && (!metadata.validTo || paymentDate < metadata.validTo));
    if (candidates.length !== 1) fail('não há tabela de IR com vigência inequívoca e fonte para o mês de pagamento.');
    const [tabela, metadata] = candidates[0];
    if (!metadata.reference?.trim() || !metadata.rra || typeof metadata.rra.deductDependents !== 'boolean' || typeof metadata.rra.deductComplementaryPension !== 'boolean' || typeof metadata.rra.reductionApplicable !== 'boolean') {
        fail('as regras de dedução de RRA precisam estar verificadas na configuração.');
    }
    const reductionRule = metadata.rra.reduction;
    if ((metadata.rra.reductionApplicable && !reductionRule) || reductionRule?.status === 'pending') {
        fail('a aplicabilidade da redução do IR ao RRA está pendente de verificação normativa.');
    }
    if (reductionRule && reductionRule.verifiedMonths && !reductionRule.verifiedMonths.includes(meses)) {
        fail('a redução do IR ainda não foi verificada para este número de meses de RRA.');
    }
    const adjustments = context?.ajustesBaseDocumentados || [];
    for (const adjustment of adjustments) {
        if (!Number.isFinite(adjustment.valor) || adjustment.valor < 0 || !adjustment.descricao?.trim() || !adjustment.fundamento?.trim()) fail('ajuste da base requer valor válido, descrição e fundamento.');
    }
    const baseBruta = round(prior.filter(source => source.value > 0).reduce((sum, source) => sum + source.value, 0));
    const sourceDeductions = -prior.filter(source => source.value < 0).reduce((sum, source) => sum + source.value, 0);
    const deducoes = round(sourceDeductions + contributions.rpps +
        (metadata.rra.deductComplementaryPension ? contributions.complementary : 0) +
        (metadata.rra.deductDependents ? contributions.dependents * (config.values?.deducao_dep || 0) : 0) +
        adjustments.reduce((sum, adjustment) => sum + adjustment.valor, 0));
    const baseCalculo = Math.max(0, round(baseBruta - deducoes));
    const impostoAntesReducao = calculateIrrfProgressive(baseCalculo, config.historico_ir_brackets?.[tabela] || [], meses);
    let reducao = 0;
    if (reductionRule) {
        if (reductionRule.status !== 'verified' || reductionRule.mode !== 'total' || !reductionRule.reference?.trim() ||
            ![reductionRule.exemptIncome, reductionRule.partialIncome, reductionRule.maxReduction, reductionRule.intercept, reductionRule.slope].every(Number.isFinite) ||
            reductionRule.exemptIncome < 0 || reductionRule.partialIncome < reductionRule.exemptIncome || reductionRule.maxReduction < 0 || reductionRule.slope < 0) {
            fail('configuração da redução do IR inválida.');
        }
        const calculated = baseBruta <= reductionRule.exemptIncome ? reductionRule.maxReduction
            : baseBruta <= reductionRule.partialIncome ? Math.max(0, reductionRule.intercept - reductionRule.slope * baseBruta) : 0;
        reducao = round(Math.min(impostoAntesReducao, calculated));
    }
    const imposto = round(impostoAntesReducao - reducao);
    const avisos = ['O rateio por entrada é informativo; o imposto é apurado sobre a base conjunta de RRA.'];
    if (adjustments.length) avisos.push('A base contém ajustes documentados de conferência; não representam deduções automáticas.');
    if (classified.current.length) avisos.push('Rendimentos do próprio ano foram encaminhados à base mensal.');
    if (reductionRule && reducao > 0) avisos.push('A redução do imposto (Anexo X da IN RFB 1.500/2014) foi aplicada sobre o montante tributável pago no mês.');
    return { tax: imposto, entryTax: allocateIrEaCents(imposto, prior), memory: {
        status: 'ready', mesPagamento, competencias, meses, tabela, baseBruta, deducoes,
        baseCalculo, impostoAntesReducao, reducao, imposto, ajustesBaseDocumentados: adjustments, avisos
    } };
}
