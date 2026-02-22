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

export interface DeductionsResult {
    pss: number;
    funpresp: number;
    irrf: number;
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
            if (rubrica.incidePSS) {
                acc.pss += signedValor;
            }
            if (rubrica.incideIR) {
                acc.ir += signedValor;
            }
            return acc;
        },
        { pss: 0, ir: 0 }
    );
};

/**
 * Calcula Deducoes (PSS, IRRF, Funpresp)
 */
export async function calculateDeductions(grossValue: number, params: IJmuCalculationParams): Promise<DeductionsResult> {
    const config = requireAgencyConfig(params);
    const rubricasAdjustments = calculateRubricasBaseAdjustments(params.rubricasExtras);

    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * 1.40;

    // Recalculate components needed for PSS Base
    let aqTituloVal = 0;
    if (params.periodo >= 1) aqTituloVal = valorVR * params.aqTituloVR;
    else aqTituloVal = baseVencimento * normalizeAQPercent(params.aqTituloPerc);

    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    }

    // PSS Base Calculation
    let basePSS = baseVencimento + gaj + aqTituloVal + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);
    if (params.incidirPSSGrat) basePSS += gratVal;
    if (params.pssSobreFC) basePSS += funcaoValor;
    basePSS = Math.max(0, basePSS + rubricasAdjustments.pss);

    const pssTable = config.historico_pss?.[params.tabelaPSS];
    const teto = pssTable?.teto_rgps || 0;
    const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

    let pssMensal = 0;
    let baseFunpresp = 0;

    if (pssTable) {
        if (usaTeto) {
            const baseLimitada = Math.min(basePSS, teto);
            pssMensal = calculatePss(baseLimitada, pssTable);
            baseFunpresp = Math.max(0, basePSS - teto);
        } else {
            pssMensal = calculatePss(basePSS, pssTable);
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
    totalTrib = Math.max(0, totalTrib + rubricasAdjustments.ir);

    const deducaoDep = config.values?.deducao_dep || 0;
    const baseIR = Math.max(0, totalTrib - pssMensal - valFunpresp - (params.dependents * deducaoDep));

    const deductionVal = config.historico_ir?.[params.tabelaIR] || 896.00;
    const irMensal = calculateIrrf(baseIR, 0.275, deductionVal);

    return {
        pss: pssMensal,
        funpresp: valFunpresp,
        irrf: irMensal,
        total: pssMensal + valFunpresp + irMensal
    };
}
