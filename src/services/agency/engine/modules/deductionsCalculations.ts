/**
 * Calculos de Deducoes - JMU
 * 
 * Responsavel por calcular:
 * - PSS (Previdencia Social do Servidor)
 * - IRRF (Imposto de Renda Retido na Fonte)
 * - Funpresp (Fundacao de Previdencia Complementar)
 */

import { CourtConfig, Rubrica, RubricaTaxDetail } from '../../../../types';
import { calculatePss, calculateIrrf } from '../../../../core/calculations/taxUtils';
import type { IrEaMemory, CalculatedOvertimeEntry, CalculatedSubstitutionEntry } from '../../../../types/irEa';
import { calculateIrEa, classifyIrEaSources, type IrEaSource } from './irEaCalculations';
import { IAgencyCalculationParams } from '../types';
import { getPayrollRules } from './configRules';
import { calculateMonthlyPensionContext } from './pensionContext';
import { calculateOvertime } from './overtimeCalculations';
import { calculateSubstitution } from './substitutionCalculations';
import { calculateComplementaryPension, calculatePensionRetroactives, hasPensionCeiling, roundPension } from './pensionCalculations';
import type { PensionCalculationMemory, PensionRetroMemory } from '../../../../types/pension';

export interface DeductionsResult {
    pss: number;
    pssEA: number;
    funpresp: number;
    funprespEA: number;
    pensionMemory: PensionCalculationMemory;
    pensionRetroMemory: PensionRetroMemory[];
    irrf: number;
    irEA: number;
    irEaMemory?: IrEaMemory;
    irEaEntryTax: Record<string, number>;
    irEaCurrentYearKeys: string[];
    overtimeCalculatedEntries: CalculatedOvertimeEntry[];
    substitutionCalculatedEntries: CalculatedSubstitutionEntry[];
    aqIr: number;
    aqPss: number;
    gratIr: number;
    gratPss: number;
    vantagensIr: number;
    vantagensPss: number;
    abonoIr: number;
    overtimeIr: number;
    overtimeIrMensal: number;
    overtimeIrEA: number;
    overtimePss: number;
    substitutionIr: number;
    substitutionIrMensal: number;
    substitutionIrEA: number;
    substitutionPss: number;
    total: number;
    rubricasTax: Record<string, RubricaTaxDetail>;
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

const calculateRubricasBaseAdjustments = (rubricas: Rubrica[] = []) => {
    return rubricas.reduce(
        (acc, rubrica) => {
            const valor = Number(rubrica.valor);
            if (!Number.isFinite(valor) || valor <= 0) {
                return acc;
            }

            const signedValor = rubrica.tipo === 'D' ? -valor : valor;
            if (rubrica.pssCompetenciaSeparada) {
                acc.pssEA += signedValor;
            } else if (rubrica.incidePSS) {
                acc.pssMensal += signedValor;
            }
            if (rubrica.isEA) {
                acc.irEA += signedValor;
            } else if (rubrica.incideIR) {
                acc.irMensal += signedValor;
            }
            return acc;
        },
        { pssMensal: 0, pssEA: 0, irMensal: 0, irEA: 0 }
    );
};

const getMarginalPssRate = (
    base: number,
    table: { faixas?: Array<{ min: number; max: number; rate: number }> }
) => {
    if (!table?.faixas || table.faixas.length === 0 || base <= 0) {
        return 0;
    }
    const faixaAtual = [...table.faixas]
        .sort((a, b) => a.min - b.min)
        .find((faixa) => base >= faixa.min && base <= faixa.max);

    if (faixaAtual) {
        return faixaAtual.rate;
    }

    const ultimaFaixa = [...table.faixas].sort((a, b) => a.min - b.min).pop();
    return ultimaFaixa?.rate ?? 0;
};

/**
 * Calcula Deducoes (PSS, IRRF, Funpresp)
 */
export async function calculateDeductions(grossValue: number, params: IAgencyCalculationParams): Promise<DeductionsResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const rubricasAdjustments = calculateRubricasBaseAdjustments(params.rubricasExtras);

    const pensionContext = await calculateMonthlyPensionContext(params);
    const { vencimento: baseVencimento, gaj, aqTitulo: aqTituloVal, aqTreino: aqTreinoVal,
        fc: funcaoValor, gratificacao: gratVal } = pensionContext.salaryComponents;

    const overtime = await calculateOvertime(params);
    const substitution = await calculateSubstitution(params);
    const eaSources: IrEaSource[] = [
        ...overtime.entries.filter(entry => entry.isEA && !entry.excluirIR).map(entry => ({
            key: `he:${entry.id}`, value: entry.heTotal,
            competencias: params.overtimeEntries?.find(input => input.id === entry.id)?.competenciasEA ?? params.heCompetenciasEA
        })),
        ...substitution.entries.filter(entry => entry.isEA && !entry.excluirIR).map(entry => ({
            key: `subst:${entry.id}`, value: entry.total,
            competencias: params.substitutionEntries?.find(input => input.id === entry.id)?.competenciasEA ?? params.substCompetenciasEA
        })),
        ...(params.rubricasExtras || []).filter(entry => entry.isEA).map(entry => ({
            key: `rubrica:${entry.id}`, value: (entry.tipo === 'D' ? -1 : 1) * Number(entry.valor || 0),
            competencias: entry.competenciasEA, deductionReference: entry.fundamentoDeducaoEA
        }))
    ];
    const classifiedEa = classifyIrEaSources(eaSources, params.irEaContext);
    if (classifiedEa.mesPagamento && classifiedEa.mesPagamento !== params.competencia) {
        throw new Error('IR-EA: alinhe o mês e ano do cabeçalho ao mês de pagamento informado.');
    }
    if (classifiedEa.current.length) {
        const metadata = config.historico_ir_metadata?.[params.tabelaIR];
        const paymentDate = `${classifiedEa.mesPagamento}-01`;
        if (!metadata?.reference?.trim() || metadata.validFrom > paymentDate || (metadata.validTo && paymentDate >= metadata.validTo) ||
            !Number.isFinite(config.historico_ir?.[params.tabelaIR])) {
            throw new Error('IR-EA: selecione a tabela mensal vigente no mês do pagamento para os rendimentos do próprio ano.');
        }
    }
    const currentEaKeys = new Set(classifiedEa.current.map(source => source.key));
    // Classification affects IR only. Preserve all pension flags and values.
    overtime.entries.forEach(entry => { if (currentEaKeys.has(`he:${entry.id}`)) entry.isEA = false; });
    substitution.entries.forEach(entry => { if (currentEaKeys.has(`subst:${entry.id}`)) entry.isEA = false; });
    const hasOvertimeEntries = (params.overtimeEntries?.length || 0) > 0;
    const overtimeMensalBase = overtime.entries
        .filter((entry) => !entry.isEA && !entry.excluirIR)
        .reduce((acc, entry) => acc + entry.heTotal, 0);
    const hasSubstitutionEntries = (params.substitutionEntries?.length || 0) > 0;
    const substitutionMensalBase = substitution.entries
        .filter((entry) => !entry.isEA && !entry.excluirIR)
        .reduce((acc, entry) => acc + entry.total, 0);
    const substitutionPssEABase = substitution.entries
        .filter((entry) => entry.pssIsEA)
        .reduce((acc, entry) => acc + entry.total, 0);

    const basePSS = pensionContext.baseRppsIntegral;

    const pssTable = config.historico_pss?.[params.tabelaPSS];
    const teto = pssTable?.teto_rgps || 0;
    const usaTeto = hasPensionCeiling(params.regimePrev);

    let pssMensal = 0;
    let pssEA = 0;
    let overtimePss = 0;
    let substitutionPss = 0;

    if (pssTable) {
        if (usaTeto) {
            const baseLimitada = Math.min(basePSS, teto);
            pssMensal = roundPension(calculatePss(baseLimitada, pssTable));
        } else {
            pssMensal = calculatePss(basePSS, pssTable);
        }

        const basePssEA =
            (params.hePssIsEA && !hasOvertimeEntries ? overtime.heTotal : 0) +
            (hasSubstitutionEntries ? substitutionPssEABase : (params.substPssIsEA ? substitution.total : 0)) +
            rubricasAdjustments.pssEA;

        if (basePssEA !== 0) {
            if (usaTeto && !params.pensionRetroEntries?.length) throw new Error('Previdência: informe a apuração do retroativo por competência, sem alíquota marginal atual.');
            if (!params.pensionRetroEntries?.length) {
            const baseReferenciaAliquota = usaTeto ? Math.min(basePSS, teto) : basePSS;
            const aliquotaMarginal = getMarginalPssRate(baseReferenciaAliquota, pssTable);
            pssEA = basePssEA * aliquotaMarginal;
            overtimePss = (params.hePssIsEA && !hasOvertimeEntries ? overtime.heTotal : 0) * aliquotaMarginal;
            substitutionPss = (hasSubstitutionEntries ? substitutionPssEABase : (params.substPssIsEA ? substitution.total : 0)) * aliquotaMarginal;
            }
        }
    }

    // IRRF Base
    const abonoPerm = params.recebeAbono ? pssMensal : 0;

    // Retroactive contributions must still be supplied by original competence.
    if (usaTeto && !params.pensionRetroEntries?.length &&
        params.rubricasExtras?.some(rubrica => rubrica.funprespCompetenciaSeparada)) {
        throw new Error('Previdência: use apuração por competência para previdência complementar retroativa.');
    }
    const pensionMemory = calculateComplementaryPension(params, basePSS, pensionContext.base, 'mensal', pensionContext.componentes);
    if (!usaTeto && pssEA !== 0 && !params.pensionRetroEntries?.length) {
        pensionMemory.avisos = ['PSS de exercício anterior legado usa alíquota marginal atual; confira e informe apuração por competência antes de utilizá-lo como conferência oficial.'];
    }
    const valFunpresp = pensionMemory.descontoFolha;
    const pensionRetroMemory = calculatePensionRetroactives(params);
    pssEA += pensionRetroMemory.reduce((sum, entry) => sum + entry.rpps, 0);
    const funprespEA = roundPension(pensionRetroMemory.reduce((sum, entry) => sum + entry.complementar, 0));
    if (classifiedEa.prior.length && pensionRetroMemory.some(entry => entry.destinoIR === 'ea' &&
        (entry.rpps !== 0 || entry.complementar !== 0) && !classifiedEa.competencias.includes(entry.competencia))) {
        throw new Error('IR-EA: contribuição retroativa sem vínculo com as competências do grupo de RRA.');
    }
    const eaResult = calculateIrEa(classifiedEa, config, params.irEaContext, {
        rpps: pensionRetroMemory.filter(entry => entry.destinoIR === 'ea').reduce((sum, entry) => sum + entry.rpps, 0),
        complementary: pensionRetroMemory.filter(entry => entry.destinoIR === 'ea').reduce((sum, entry) => sum + entry.complementar, 0),
        dependents: params.dependents
    });
    const irEA = eaResult.tax;

    // Total Tributavel Construction
    let totalTrib = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal +
        (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0) + abonoPerm;

    // Hora extra / substituicao: entram no mensal apenas quando NAO marcadas como EA.
    // Regra HE: se heExcluirIR estiver ativo, nao entra em nenhuma base de IR.
    totalTrib += overtimeMensalBase;
    totalTrib += substitutionMensalBase;

    const currentManualEa = classifiedEa.current.filter(source => source.key.startsWith('rubrica:'))
        .reduce((sum, source) => sum + source.value, 0);
    totalTrib = Math.max(0, totalTrib + rubricasAdjustments.irMensal + currentManualEa);

    const deducaoDep = config.values?.deducao_dep || 0;
    const retroMensalDedutivel = pensionRetroMemory.filter(entry => entry.destinoIR === 'mensal')
        .reduce((sum, entry) => sum + entry.rpps + entry.complementar, 0);
    const baseIR = Math.max(0, totalTrib - pssMensal - valFunpresp - retroMensalDedutivel - (params.dependents * deducaoDep));

    const deductionVal = config.historico_ir?.[params.tabelaIR] || 0;
    const irMensal = calculateIrrf(baseIR, payrollRules.irrfTopRate, deductionVal);

    const pssRateBase = Math.max(0, usaTeto ? Math.min(basePSS, teto) : basePSS);
    const pssEffectiveRate = pssRateBase > 0 ? pssMensal / pssRateBase : 0;
    const irEffectiveRate = baseIR > 0 ? irMensal / baseIR : 0;
    const vantagensBase = (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

    const aqIr = (aqTituloVal + aqTreinoVal) * irEffectiveRate;
    const aqPss = aqTituloVal * pssEffectiveRate;
    const gratIr = gratVal * irEffectiveRate;
    const gratPss = (params.incidirPSSGrat ? gratVal : 0) * pssEffectiveRate;
    const vantagensIr = vantagensBase * irEffectiveRate;
    const vantagensPss = vantagensBase * pssEffectiveRate;
    const abonoIr = abonoPerm * irEffectiveRate;

    let overtimeIr = 0;
    let overtimeIrMensal = 0;
    let overtimeIrEA = 0;
    let substitutionIr = 0;
    let substitutionIrMensal = 0;
    let substitutionIrEA = 0;

    const heMensalBase = overtimeMensalBase;
    if (heMensalBase > 0) {
        const irSemHe = calculateIrrf(Math.max(0, baseIR - heMensalBase), payrollRules.irrfTopRate, deductionVal);
        overtimeIrMensal = Math.max(0, irMensal - irSemHe);
        overtimeIr += overtimeIrMensal;
    }

    const substMensalBase = substitutionMensalBase;
    if (substMensalBase > 0) {
        const irSemSubst = calculateIrrf(Math.max(0, baseIR - substMensalBase), payrollRules.irrfTopRate, deductionVal);
        substitutionIrMensal = Math.max(0, irMensal - irSemSubst);
        substitutionIr += substitutionIrMensal;
    }

    overtimeIrEA = Math.round(Object.entries(eaResult.entryTax).filter(([key]) => key.startsWith('he:')).reduce((sum, [, value]) => sum + value, 0) * 100) / 100;
    substitutionIrEA = Math.round(Object.entries(eaResult.entryTax).filter(([key]) => key.startsWith('subst:')).reduce((sum, [, value]) => sum + value, 0) * 100) / 100;
    overtimeIr += overtimeIrEA;
    substitutionIr += substitutionIrEA;
    const funprespAliq = params.funprespAliq || 0.085;
    const rubricasTax: Record<string, RubricaTaxDetail> = {};

    for (const r of params.rubricasExtras || []) {
        const valor = Number(r.valor) || 0;
        if (r.tipo === 'D') {
            rubricasTax[r.id] = {
                ir: 0,
                pss: 0,
                funpresp: 0,
                totalDescontos: valor,
                liquido: 0
            };
        } else {
            const isRra = r.isEA && !currentEaKeys.has(`rubrica:${r.id}`);
            let ir = 0;
            let irMarginal: number | undefined;

            if (isRra) {
                ir = eaResult.entryTax[`rubrica:${r.id}`] || 0;
            } else if (r.incideIR || currentEaKeys.has(`rubrica:${r.id}`)) {
                ir = Math.round(valor * irEffectiveRate * 100) / 100;
                const baseSemRubrica = Math.max(0, baseIR - valor);
                const irSemRubrica = calculateIrrf(baseSemRubrica, payrollRules.irrfTopRate, deductionVal);
                irMarginal = Math.max(0, Math.round((irMensal - irSemRubrica) * 100) / 100);
            }

            const pss = (r.incidePSS || r.pssCompetenciaSeparada)
                ? Math.round(valor * pssEffectiveRate * 100) / 100
                : 0;
            const funpresp = r.incideFunpresp
                ? Math.round(valor * funprespAliq * 100) / 100
                : 0;
            const totalDesc = Math.min(valor, ir + pss + funpresp);
            const liquido = Math.max(0, Math.round((valor - totalDesc) * 100) / 100);
            rubricasTax[r.id] = {
                ir,
                ...(irMarginal !== undefined ? { irMarginal } : {}),
                pss,
                funpresp,
                totalDescontos: totalDesc,
                liquido
            };
        }
    }

    return {
        pss: pssMensal,
        pssEA,
        funpresp: valFunpresp,
        funprespEA,
        pensionMemory,
        pensionRetroMemory,
        irrf: irMensal,
        irEA,
        irEaMemory: eaResult.memory,
        irEaEntryTax: eaResult.entryTax,
        irEaCurrentYearKeys: [...currentEaKeys],
        overtimeCalculatedEntries: overtime.entries,
        substitutionCalculatedEntries: substitution.entries,
        aqIr,
        aqPss,
        gratIr,
        gratPss,
        vantagensIr,
        vantagensPss,
        abonoIr,
        overtimeIr,
        overtimeIrMensal,
        overtimeIrEA,
        overtimePss,
        substitutionIr,
        substitutionIrMensal,
        substitutionIrEA,
        substitutionPss,
        total: pssMensal + pssEA + valFunpresp + funprespEA + irMensal + irEA,
        rubricasTax
    };
}
