/**
 * Calculos de Deducoes - JMU
 * 
 * Responsavel por calcular:
 * - PSS (Previdencia Social do Servidor)
 * - IRRF (Imposto de Renda Retido na Fonte)
 * - Funpresp (Fundacao de Previdencia Complementar)
 */

import { CourtConfig } from '../../../../../types';
import { calculatePss, calculateIrrf } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

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

/**
 * Calcula Deducoes (PSS, IRRF, Funpresp)
 */
export async function calculateDeductions(grossValue: number, params: IJmuCalculationParams): Promise<DeductionsResult> {
    const config = requireAgencyConfig(params);

    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * 1.40;

    // Recalculate components needed for PSS Base
    let aqTituloVal = 0;
    if (params.periodo >= 1) aqTituloVal = valorVR * params.aqTituloVR;
    else aqTituloVal = baseVencimento * params.aqTituloPerc;

    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    }

    // PSS Base Calculation
    let basePSS = baseVencimento + gaj + aqTituloVal + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);
    if (params.incidirPSSGrat) basePSS += gratVal;
    if (params.pssSobreFC) basePSS += funcaoValor;

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
    else aqTreinoVal = baseVencimento * params.aqTreinoPerc;

    // Total Tributavel Construction
    let totalTrib = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal +
        (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0) + abonoPerm;

    const deducaoDep = config.values?.deducao_dep || 0;
    const baseIR = totalTrib - pssMensal - valFunpresp - (params.dependents * deducaoDep);

    const deductionVal = config.historico_ir?.[params.tabelaIR] || 896.00;
    const irMensal = calculateIrrf(baseIR, 0.275, deductionVal);

    return {
        pss: pssMensal,
        funpresp: valFunpresp,
        irrf: irMensal,
        total: pssMensal + valFunpresp + irMensal
    };
}
