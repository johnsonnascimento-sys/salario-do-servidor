/**
 * Calculos de Deducoes - JMU
 * 
 * Responsavel por calcular:
 * - PSS (Previdencia Social do Servidor)
 * - IRRF (Imposto de Renda Retido na Fonte)
 * - Funpresp (Fundacao de Previdencia Complementar)
 */

import { CourtConfig, Rubrica } from '../../../../../types';
import { calculatePss, calculateIrrf } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';
import { calculateOvertime } from './overtimeCalculations';
import { calculateSubstitution } from './substitutionCalculations';

export interface DeductionsResult {
    pss: number;
    pssEA: number;
    funpresp: number;
    irrf: number;
    irEA: number;
    aqIr: number;
    aqPss: number;
    gratIr: number;
    gratPss: number;
    vantagensIr: number;
    vantagensPss: number;
    abonoIr: number;
    overtimeIr: number;
    overtimePss: number;
    substitutionIr: number;
    substitutionPss: number;
    total: number;
}

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
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
export async function calculateDeductions(grossValue: number, params: IJmuCalculationParams): Promise<DeductionsResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const rubricasAdjustments = calculateRubricasBaseAdjustments(params.rubricasExtras);

    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;

    // Recalculate components needed for PSS Base
    let aqTituloVal = 0;
    if (params.periodo >= 1) aqTituloVal = valorVR * params.aqTituloVR;
    else aqTituloVal = baseVencimento * normalizeAQPercent(params.aqTituloPerc);

    const funcaoValor = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * payrollRules.specificGratificationRate;
    }

    const overtime = await calculateOvertime(params);
    const substitution = await calculateSubstitution(params);

    // PSS Base Calculation
    let basePSS = baseVencimento + gaj + aqTituloVal + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);
    if (params.incidirPSSGrat) basePSS += gratVal;
    if (params.pssSobreFC) basePSS += funcaoValor;
    basePSS = Math.max(0, basePSS + rubricasAdjustments.pssMensal);

    const pssTable = config.historico_pss?.[params.tabelaPSS];
    const teto = pssTable?.teto_rgps || 0;
    const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

    let pssMensal = 0;
    let pssEA = 0;
    let baseFunpresp = 0;
    let overtimePss = 0;
    let substitutionPss = 0;

    if (pssTable) {
        if (usaTeto) {
            const baseLimitada = Math.min(basePSS, teto);
            pssMensal = calculatePss(baseLimitada, pssTable);
            baseFunpresp = Math.max(0, basePSS - teto);
        } else {
            pssMensal = calculatePss(basePSS, pssTable);
        }

        const basePssEA =
            (params.hePssIsEA ? overtime.heTotal : 0) +
            (params.substPssIsEA ? substitution : 0) +
            rubricasAdjustments.pssEA;

        if (basePssEA !== 0) {
            const baseReferenciaAliquota = usaTeto ? Math.min(basePSS, teto) : basePSS;
            const aliquotaMarginal = getMarginalPssRate(baseReferenciaAliquota, pssTable);
            pssEA = basePssEA * aliquotaMarginal;
            overtimePss = (params.hePssIsEA ? overtime.heTotal : 0) * aliquotaMarginal;
            substitutionPss = (params.substPssIsEA ? substitution : 0) * aliquotaMarginal;
        }
    }

    // Funpresp
    let valFunpresp = 0;
    if (usaTeto && baseFunpresp > 0) {
        valFunpresp = baseFunpresp * params.funprespAliq + (baseFunpresp * (params.funprespFacul / 100));
    }

    // IRRF Base
    const abonoPerm = params.recebeAbono ? pssMensal : 0;

    // Recalculate full taxable partials
    let aqTreinoVal = 0;
    if (params.periodo >= 1) aqTreinoVal = valorVR * params.aqTreinoVR;
    else aqTreinoVal = baseVencimento * normalizeAQPercent(params.aqTreinoPerc);

    // Total Tributavel Construction
    let totalTrib = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal +
        (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0) + abonoPerm;

    // Hora extra / substituicao: entram no mensal apenas quando NAO marcadas como EA.
    if (!params.heIsEA) totalTrib += overtime.heTotal;
    if (!params.substIsEA) totalTrib += substitution;

    totalTrib = Math.max(0, totalTrib + rubricasAdjustments.irMensal);

    const deducaoDep = config.values?.deducao_dep || 0;
    const baseIR = Math.max(0, totalTrib - pssMensal - valFunpresp - (params.dependents * deducaoDep));

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

    // IR de Exercicio Anterior (EA): HE/Substituicao marcadas como EA.
    const baseEA =
        (params.heIsEA ? overtime.heTotal : 0) +
        (params.substIsEA ? substitution : 0) +
        rubricasAdjustments.irEA;
    const baseIREA = Math.max(0, baseEA - (params.dependents * deducaoDep));
    const irEA = calculateIrrf(baseIREA, payrollRules.irrfTopRate, deductionVal);

    let overtimeIr = 0;
    let substitutionIr = 0;

    const heMensalBase = !params.heIsEA ? overtime.heTotal : 0;
    if (heMensalBase > 0) {
        const irSemHe = calculateIrrf(Math.max(0, baseIR - heMensalBase), payrollRules.irrfTopRate, deductionVal);
        overtimeIr += Math.max(0, irMensal - irSemHe);
    }

    const substMensalBase = !params.substIsEA ? substitution : 0;
    if (substMensalBase > 0) {
        const irSemSubst = calculateIrrf(Math.max(0, baseIR - substMensalBase), payrollRules.irrfTopRate, deductionVal);
        substitutionIr += Math.max(0, irMensal - irSemSubst);
    }

    const heEABase = params.heIsEA ? overtime.heTotal : 0;
    if (heEABase > 0) {
        const irEaSemHe = calculateIrrf(Math.max(0, baseIREA - heEABase), payrollRules.irrfTopRate, deductionVal);
        overtimeIr += Math.max(0, irEA - irEaSemHe);
    }

    const substEABase = params.substIsEA ? substitution : 0;
    if (substEABase > 0) {
        const irEaSemSubst = calculateIrrf(Math.max(0, baseIREA - substEABase), payrollRules.irrfTopRate, deductionVal);
        substitutionIr += Math.max(0, irEA - irEaSemSubst);
    }

    return {
        pss: pssMensal,
        pssEA,
        funpresp: valFunpresp,
        irrf: irMensal,
        irEA,
        aqIr,
        aqPss,
        gratIr,
        gratPss,
        vantagensIr,
        vantagensPss,
        abonoIr,
        overtimeIr,
        overtimePss,
        substitutionIr,
        substitutionPss,
        total: pssMensal + pssEA + valFunpresp + irMensal + irEA
    };
}
