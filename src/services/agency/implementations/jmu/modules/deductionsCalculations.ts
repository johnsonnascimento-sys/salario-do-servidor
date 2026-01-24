/**
 * Cálculos de Deduções - JMU
 * 
 * Responsável por calcular:
 * - PSS (Previdência Social do Servidor)
 * - IRRF (Imposto de Renda Retido na Fonte)
 * - Funpresp (Fundação de Previdência Complementar)
 * 
 * Baseado nas regras de tributação do PJU
 * 
 * REFATORADO: Agora usa ConfigService para buscar tabelas do banco
 */

import { configService } from '../../../../config';
import { calculatePss, calculateIrrf } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

export interface DeductionsResult {
    pss: number;
    funpresp: number;
    irrf: number;
    total: number;
}

/**
 * Calcula Deduções (PSS, IRRF, Funpresp)
 * Busca tabelas de PSS e IR do banco via ConfigService
 */
export async function calculateDeductions(grossValue: number, params: IJmuCalculationParams): Promise<DeductionsResult> {
    // Buscar configuração do banco
    const config = await configService.getEffectiveConfig(params.orgSlug);

    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, params.orgSlug);
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

    // Buscar tabela PSS do banco
    const pssTableConfig = config.pss_tables?.[params.tabelaPSS];

    // Adaptar formato do banco para o formato esperado por calculatePss
    const pssTable = pssTableConfig ? {
        teto_rgps: pssTableConfig.ceiling,
        faixas: pssTableConfig.rates.map(rate => ({
            min: rate.min,
            max: rate.max,
            rate: rate.rate
        }))
    } : null;

    const teto = pssTable?.teto_rgps || 0;
    const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

    let pssMensal = 0;
    let baseFunpresp = 0;

    if (usaTeto && pssTable) {
        const baseLimitada = Math.min(basePSS, teto);
        pssMensal = calculatePss(baseLimitada, pssTable);
        baseFunpresp = Math.max(0, basePSS - teto);
    } else if (pssTable) {
        pssMensal = calculatePss(basePSS, pssTable);
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

    // Buscar dedução de dependente e tabela IR do banco
    const deducaoDep = config.dependent_deduction || 0;
    const baseIR = totalTrib - pssMensal - valFunpresp - (params.dependents * deducaoDep);

    const deductionVal = config.ir_deduction?.[params.tabelaIR]?.deduction || 896.00;
    const irMensal = calculateIrrf(baseIR, 0.275, deductionVal);



    return {
        pss: pssMensal,
        funpresp: valFunpresp,
        irrf: irMensal,
        total: pssMensal + valFunpresp + irMensal
    };
}
