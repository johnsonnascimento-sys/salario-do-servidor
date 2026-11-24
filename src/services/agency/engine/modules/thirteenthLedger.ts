import type { IAgencyCalculationParams } from '../types';
import type { ThirteenthResult } from './thirteenthCalculations';
import type { Rubrica } from '../../../../types';
import type { PensionRetroMemory, PensionRubricAssessment } from '../../../../types/pension';
import type { ThirteenthEntry, ThirteenthPayrollInput, ThirteenthReference, ThirteenthReferenceItem } from '../../../../types/thirteenth';
import { calculateIrrf, calculatePss } from '../../../../core/calculations/taxUtils';
import { getDataForPeriod, normalizeAQPercent, resolveGratificationValue } from './baseCalculations';
import { getPayrollRules } from './configRules';
import { buildComplementaryBase, calculateComplementaryPension, hasPensionCeiling, requirePensionTable } from './pensionCalculations';
import { assessPensionRubric } from './pensionCatalog';
import { calculateCommissionIncomeTax, calculateCommissionInss, resolveCommissionPay, resolveCommissionWithholding } from './commissionCalculations';
import { requireCommissionOriginIncluded } from './commissionContext';

export class ThirteenthPendingError extends Error {
    constructor(message: string) { super(`13º salário pendente: ${message}`); this.name = 'ThirteenthPendingError'; }
}
const pending = (message: string): never => { throw new ThirteenthPendingError(message); };
const round = (value: number) => Math.round(value * 100) / 100;
const cents = (value: number) => Math.round(value * 100);
const sum = (entries: ThirteenthEntry[]) => round(entries.reduce((total, entry) => total + entry.amount, 0));
const isFunction = (target: string) => target === 'funcao' || target === 'grupo:funcao';
const groupId = (target: string) => isFunction(target) ? 'grupo:funcao' : 'grupo:cargo';

interface Component extends ThirteenthReferenceItem {
    ir: boolean | null;
    pss: boolean | null;
    rubric?: Rubrica;
}

const buildComponents = async (params: IAgencyCalculationParams, paymentSelected = false): Promise<Component[]> => {
    const config = params.agencyConfig;
    if (!config) return pending('configuração do órgão indisponível.');
    const rules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const commission = resolveCommissionPay(params, { funcoes });
    const vencimento = commission.allowCareer ? (salario[params.cargo]?.[params.padrao] || 0) : 0;
    const gaj = vencimento * rules.gajRate;
    const funcao = commission.funcaoValor;
    const aqTitulo = params.periodo >= 1 ? valorVR * params.aqTituloVR : vencimento * normalizeAQPercent(params.aqTituloPerc);
    const aqTreino = params.periodo >= 1 ? valorVR * params.aqTreinoVR : vencimento * normalizeAQPercent(params.aqTreinoPerc);
    const gratificacao = resolveGratificationValue(params, vencimento, gaj, funcao, aqTitulo, aqTreino, rules.specificGratificationRate);
    const output: Component[] = [];
    const add = (id: string, label: string, amount: number, selected: boolean, pss = true, ir = true) => {
        if (selected && amount > 0) output.push({ id, label, amount, pss, ir });
    };
    add('vencimento', 'Vencimento básico', vencimento, params.decimoIncideVencimento !== false);
    const external = params.commissionProfile?.kind === 'external' ? params.commissionProfile : undefined;
    if (params.decimoIncideVencimento !== false && commission.originRemuneration > 0 && (paymentSelected
        ? requireCommissionOriginIncluded(params, 'thirteenth') : external?.thirteenthPaysOriginRemuneration === true)) {
        add('origem', 'Remuneração de origem paga pelo Judiciário', commission.originRemuneration, true);
    }
    add('gaj', 'GAJ', gaj, params.decimoIncideGAJ !== false);
    add('funcao', 'FC/CJ', funcao, params.decimoIncideFuncao !== false, params.commissionProfile?.kind === 'exclusive_cj');
    add('aqTitulo', 'AQ títulos', aqTitulo, params.decimoIncideAQTitulo !== false);
    add('aqTreino', 'AQ treinamento', aqTreino, params.decimoIncideAQTreino !== false, false);
    add('vpniLei', 'VPNI — Lei', params.vpni_lei || 0, params.decimoIncideVPNI !== false);
    add('vpniDecisao', 'VPNI — Decisão', params.vpni_decisao || 0, params.decimoIncideVPNI !== false);
    add('ats', 'ATS', params.ats || 0, params.decimoIncideATS !== false);
    add('gratificacao', 'Gratificação específica', gratificacao, params.decimoIncideGrat !== false,
        !hasPensionCeiling(params.regimePrev) || Boolean(params.incidirPSSGrat));
    add('abono', 'Abono de permanência mensal', params.recebeAbono ? params.abonoPermanencia || params.pssMensal || 0 : 0,
        params.decimoIncideAbono !== false);
    for (const rubric of params.rubricasExtras || []) {
        if (rubric.tipo === 'C' && params.decimoRubricasInclusas?.[rubric.id] && rubric.valor > 0) {
            if (output.some(item => item.id === `rubrica:${rubric.id}`)) pending('há rubrica de crédito com identificador duplicado.');
            output.push({ id: `rubrica:${rubric.id}`, label: rubric.descricao.trim() || 'Crédito adicional', amount: rubric.valor,
                ir: typeof rubric.incideIR === 'boolean' ? rubric.incideIR : null,
                pss: params.commissionProfile ? rubric.incideINSS === true : typeof rubric.incidePSS === 'boolean' ? rubric.incidePSS : null, rubric });
        }
    }
    if ((params.decimoOutrasParcelas || 0) > 0) output.push({ id: 'outras', label: 'Outras parcelas / ajustes',
        amount: params.decimoOutrasParcelas!, ir: null, pss: null });
    return output;
};

const referenceFrom = (parts: Component[]): ThirteenthReference => {
    const cargoTotal = round(parts.filter(item => item.id !== 'funcao').reduce((total, item) => total + item.amount, 0));
    const functionTotal = round(parts.find(item => item.id === 'funcao')?.amount || 0);
    return { components: parts.map(({ id, label, amount }) => ({ id, label, amount: round(amount) })),
        groups: [
            ...(cargoTotal > 0 ? [{ id: 'grupo:cargo', label: 'Remuneração do cargo efetivo (agrupada)', amount: cargoTotal }] : []),
            ...(functionTotal > 0 ? [{ id: 'grupo:funcao', label: 'FC/CJ (agrupada)', amount: functionTotal }] : []),
        ], cargoTotal, functionTotal, referenceTotal: round(cargoTotal + functionTotal) };
};

/** Available even when an editable payment list is incomplete. Contains no tax assumptions about unknown entries. */
export const buildThirteenthReference = async (params: IAgencyCalculationParams): Promise<ThirteenthReference> =>
    referenceFrom(await buildComponents(params));

const validateEntries = (entries: ThirteenthEntry[], reference: ThirteenthReference, label: string): ThirteenthEntry[] => {
    if (!Array.isArray(entries)) return pending(`${label}: lista de lançamentos inválida.`);
    const known = new Map([...reference.components, ...reference.groups].map(item => [item.id, item]));
    const ids = new Set<string>();
    const targets = new Set<string>();
    for (const entry of entries) {
        if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || ids.has(entry.id)) pending(`${label}: identificador ausente ou duplicado.`);
        ids.add(entry.id);
        if (!known.has(entry.target)) pending(`${label}: identifique a verba na composição ativa do 13º.`);
        if (targets.has(entry.target)) pending(`${label}: reúna os valores da mesma verba em um lançamento.`);
        targets.add(entry.target);
        if (typeof entry.description !== 'string' || !entry.description.trim()) pending(`${label}: informe a descrição da verba.`);
        if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount) || entry.amount < 0 ||
            !Number.isSafeInteger(cents(entry.amount)) || Math.abs(entry.amount * 100 - cents(entry.amount)) > 1e-6) {
            pending(`${label}: informe valores não negativos, com até duas casas decimais.`);
        }
    }
    for (const entry of entries) {
        if (entry.target.startsWith('grupo:') && entries.some(other => !other.target.startsWith('grupo:') && groupId(other.target) === entry.target)) {
            pending(`${label}: use o agrupamento ou suas verbas individuais, sem sobreposição.`);
        }
    }
    return entries.map(entry => ({ ...entry, description: entry.description.trim() }));
};

const groupedEntries = (cargo: number, funcao: number, prefix: string): ThirteenthEntry[] => [
    ...(cargo > 0 ? [{ id: `${prefix}-cargo`, target: 'grupo:cargo', description: 'Remuneração do cargo efetivo (agrupada)', amount: round(cargo) }] : []),
    ...(funcao > 0 ? [{ id: `${prefix}-funcao`, target: 'grupo:funcao', description: 'FC/CJ (agrupada)', amount: round(funcao) }] : []),
];

const bucketSum = (entries: ThirteenthEntry[], funcao: boolean) =>
    round(entries.filter(entry => isFunction(entry.target) === funcao).reduce((total, entry) => total + entry.amount, 0));

export const calculateThirteenthLedger = async (params: IAgencyCalculationParams, retroativos: PensionRetroMemory[] = []): Promise<ThirteenthResult> => {
    const input = params.thirteenthPayroll as ThirteenthPayrollInput;
    if (!input || input.version !== 1 || typeof input.firstSelected !== 'boolean' || typeof input.secondSelected !== 'boolean' ||
        !['automatico', 'informado'].includes(input.firstMode) || !['automatico', 'manual'].includes(input.secondMode)) {
        return pending('configuração de recebimento inválida.');
    }
    const secondSelected = params.tipoCalculo === 'nov' || input.secondSelected;
    const firstSelected = ['jan', 'jun', 'nov'].includes(params.tipoCalculo) || input.firstSelected || secondSelected;
    const parts = await buildComponents(params, firstSelected);
    const reference = referenceFrom(parts);
    const advances = !firstSelected ? [] : input.firstMode === 'automatico'
        ? groupedEntries(reference.cargoTotal / 2, reference.functionTotal / 2, 'automatic-first')
        : validateEntries(input.advances, reference, 'Adiantamento');
    for (const entry of advances) {
        const limit = [...reference.components, ...reference.groups].find(item => item.id === entry.target)!.amount;
        if (cents(entry.amount) > cents(limit)) pending('o adiantamento excede a remuneração da verba; confira a restituição ou o vínculo separadamente.');
    }
    const firstCargo = bucketSum(advances, false);
    const firstFunction = bucketSum(advances, true);
    if (cents(firstCargo) > cents(reference.cargoTotal) || cents(firstFunction) > cents(reference.functionTotal)) {
        return pending('os adiantamentos excedem a remuneração de referência; revise os vínculos sem compensação automática.');
    }
    const secondEntries = !secondSelected ? [] : input.secondMode === 'automatico'
        ? groupedEntries(round(reference.cargoTotal - firstCargo), round(reference.functionTotal - firstFunction), 'automatic-second')
        : validateEntries(input.secondEntries, reference, 'Segunda parcela');
    const secondCargo = bucketSum(secondEntries, false);
    const secondFunction = bucketSum(secondEntries, true);
    const result: ThirteenthResult = {
        gratNatalinaTotal: round(sum(advances) + sum(secondEntries)),
        pss13: 0, funpresp13: 0, ir13: 0,
        primeiraParcelaDesconto: secondSelected ? sum(advances) : 0,
        adiant13Venc: firstCargo, adiant13FC: firstFunction,
        segunda13Venc: secondCargo, segunda13FC: secondFunction, abono13: 0,
        thirteenthMemory: { ...reference, version: 1, firstSelected, secondSelected, firstMode: input.firstMode,
            secondMode: input.secondMode, advances, secondEntries, firstTotal: sum(advances), secondTotal: sum(secondEntries) },
    };
    if (!secondSelected) return result;

    // Known automatic closure uses the reference itself, without inventing the composition of an earlier grouped advance.
    const paid = new Map<string, number>();
    let groupedCargoPaid = 0;
    for (const funcao of [false, true]) {
        const bucketParts = parts.filter(part => (part.id === 'funcao') === funcao);
        const first = advances.filter(entry => isFunction(entry.target) === funcao);
        const second = secondEntries.filter(entry => isFunction(entry.target) === funcao);
        const target = funcao ? 'grupo:funcao' : 'grupo:cargo';
        const total = round(bucketSum(first, funcao) + bucketSum(second, funcao));
        const bucketReference = funcao ? reference.functionTotal : reference.cargoTotal;
        if (input.secondMode === 'automatico') {
            bucketParts.forEach(part => paid.set(part.id, part.amount));
            continue;
        }
        const firstGrouped = input.firstMode !== 'automatico' && first.some(entry => entry.target === target && entry.amount > 0);
        const secondGrouped = second.some(entry => entry.target === target && entry.amount > 0);
        const firstIndividual = first.some(entry => entry.target !== target && entry.amount > 0);
        const secondIndividual = second.some(entry => entry.target !== target && entry.amount > 0);
        if ((firstGrouped || secondGrouped) && cents(total) === cents(bucketReference)) {
            // A documented group can close the reference only when its known itemized
            // amounts do not contradict that composition. Automatic first-half values
            // have a known composition and remain exact for a fully itemized closure.
            const known = new Map<string, number>();
            if (input.firstMode === 'automatico') bucketParts.forEach(part => known.set(part.id, part.amount / 2));
            for (const entry of [...(input.firstMode === 'automatico' ? [] : first), ...second].filter(entry => !entry.target.startsWith('grupo:'))) {
                known.set(entry.target, (known.get(entry.target) || 0) + entry.amount);
            }
            if (bucketParts.some(part => cents(known.get(part.id) || 0) > cents(part.amount))) {
                pending('os lançamentos individuais divergem da referência do agrupamento; discrimine suas verbas para apurar as incidências.');
            }
            bucketParts.forEach(part => paid.set(part.id, part.amount));
            continue;
        }
        if ((firstGrouped && secondIndividual) || (secondGrouped && firstIndividual)) {
            if (cents(total) !== cents(bucketReference)) pending('discrimine as verbas das duas parcelas ou informe o fechamento integral do agrupamento para apurar suas incidências.');
            bucketParts.forEach(part => paid.set(part.id, part.amount));
        } else if (firstGrouped || secondGrouped) {
            if (funcao) paid.set('funcao', total);
            else groupedCargoPaid = total;
        } else {
            if (input.firstMode === 'automatico') bucketParts.forEach(part => paid.set(part.id, part.amount / 2));
            for (const entry of [...(input.firstMode === 'automatico' ? [] : first), ...second]) {
                const component = entry.target === 'grupo:funcao' ? 'funcao' : entry.target;
                paid.set(component, (paid.get(component) || 0) + entry.amount);
            }
        }
    }

    const config = params.agencyConfig!;
    const rules = getPayrollRules(config);
    let irIncome = 0;
    let pssBase = 0;
    let dynamicComplementary = 0;
    const regularPaid: Record<string, number> = {};
    const assessments: PensionRubricAssessment[] = [];
    const assess = (part: Component, amount: number) => {
        if (amount <= 0) return;
        if (part.ir === null || part.pss === null) pending(`identifique as incidências de ${part.label} antes de concluir o 13º.`);
        if (part.rubric?.isEA || (!params.commissionProfile && (part.rubric?.pssCompetenciaSeparada || part.rubric?.funprespCompetenciaSeparada))) {
            pending(`confira o enquadramento temporal de ${part.label}; a incidência histórica não define automaticamente a do 13º.`);
        }
        if (part.ir) irIncome += amount;
        if (part.pss) pssBase += amount;
        if (part.rubric && !params.commissionProfile) {
            const assessment = assessPensionRubric(config.previdenciaComplementar, { ...part.rubric, valor: amount }, params.competencia || '', params.funprespParticipacao);
            if (assessment) assessments.push(assessment);
            if (part.rubric.incideFunpresp) dynamicComplementary += amount;
        } else regularPaid[part.id] = (regularPaid[part.id] || 0) + amount;
    };
    for (const part of parts) assess(part, paid.get(part.id) || 0);
    if (groupedCargoPaid > 0) {
        const cargoParts = parts.filter(part => part.id !== 'funcao');
        if (cargoParts.some(part => part.ir !== true || part.pss === null || part.rubric?.isEA || part.rubric?.pssCompetenciaSeparada || part.rubric?.funprespCompetenciaSeparada || part.rubric?.incideFunpresp || (part.rubric && !part.pss))) {
            pending('o agrupamento mistura incidências distintas ou desconhecidas; discrimine suas verbas para concluir o cálculo.');
        }
        // Same grouped-cargo treatment used by the legacy engine; no fictional per-rubric amounts are shown in memory.
        const factor = reference.cargoTotal > 0 ? Math.min(1, groupedCargoPaid / reference.cargoTotal) : 0;
        irIncome += groupedCargoPaid;
        pssBase += groupedCargoPaid - cargoParts.filter(part => part.pss === false).reduce((total, part) => total + part.amount * factor, 0);
        for (const part of cargoParts.filter(part => !part.rubric)) regularPaid[part.id] = (regularPaid[part.id] || 0) + part.amount * factor;
    }
    pssBase = Math.max(0, pssBase);
    if (params.commissionProfile) {
        if (params.commissionProfile.kind === 'exclusive_cj') {
            result.rgpsMemory = calculateCommissionInss(params, pssBase, '13');
            result.inss13 = result.rgpsMemory.amount;
        } else {
            const withholding = resolveCommissionWithholding(params, '13');
            if (params.commissionProfile.pensionRegime === 'rgps') result.inss13 = withholding;
            else result.pss13 = withholding;
        }
        const legalDeductions = result.pss13 + (result.inss13 ?? 0) + params.dependents * (config.values?.deducao_dep || 0);
        result.incomeTaxMemory = calculateCommissionIncomeTax(params, irIncome, legalDeductions, '13');
        result.ir13 = result.incomeTaxMemory.amount;
        return result;
    }
    const table = requirePensionTable(params);
    const actualPssBase = hasPensionCeiling(params.regimePrev) ? Math.min(pssBase, table.teto_rgps) : pssBase;
    result.pss13 = round(calculatePss(actualPssBase, table));
    if (params.recebeAbono) result.abono13 = result.pss13;
    const complementary = buildComplementaryBase(params, {
        vencimento: regularPaid.vencimento || 0, gaj: regularPaid.gaj || 0,
        aqTitulo: regularPaid.aqTitulo || 0, aqTreino: regularPaid.aqTreino || 0,
        gratificacao: regularPaid.gratificacao || 0,
        vantagens: (regularPaid.vpniLei || 0) + (regularPaid.vpniDecisao || 0) + (regularPaid.ats || 0),
        fc: regularPaid.funcao || 0, rubricas: dynamicComplementary,
    });
    result.pensionMemory = calculateComplementaryPension(params, pssBase, complementary.base, '13', complementary.componentes);
    result.pensionMemory.enquadramentos = assessments;
    result.funpresp13 = result.pensionMemory.descontoFolha;
    const baseIR = Math.max(0, irIncome + result.abono13 - result.pss13 - result.funpresp13 -
        params.dependents * (config.values?.deducao_dep || 0) - retroativos.filter(entry => entry.destinoIR === '13').reduce((total, entry) => total + entry.rpps + entry.complementar, 0));
    result.ir13 = round(calculateIrrf(baseIR, rules.irrfTopRate, config.historico_ir?.[params.tabelaIR] || 0));
    result.gratNatalinaTotal = round(result.gratNatalinaTotal + result.abono13);
    return result;
};
