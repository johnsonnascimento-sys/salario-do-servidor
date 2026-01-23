/**
 * Cálculos de 13º Salário / Gratificação Natalina - JMU
 * 
 * Responsável por calcular:
 * - Gratificação Natalina (13º salário)
 * - PSS sobre 13º
 * - IR sobre 13º
 * - Adiantamento do 13º (vencimento e FC)
 * - Abono sobre 13º
 * 
 * Baseado em LEGACY_FORMULAS.md seção 8 (L227-265, L319-331)
 * 
 * REFATORADO: Agora usa ConfigService para buscar dados do banco
 */

import { configService } from '../../../../config';
import { calculatePss, calculateIrrf } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

export interface ThirteenthResult {
    gratNatalinaTotal: number;
    pss13: number;
    ir13: number;
    adiant13Venc: number;
    adiant13FC: number;
    abono13: number;
}

/**
 * Calcula 13º Salário / Gratificação Natalina
 */
export async function calculateThirteenth(params: IJmuCalculationParams): Promise<ThirteenthResult> {
    const config = await configService.getEffectiveConfig(params.orgSlug);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, params.orgSlug);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * 1.40;
    const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (params.periodo >= 1) {
        aqTituloVal = valorVR * params.aqTituloVR;
        aqTreinoVal = valorVR * params.aqTreinoVR;
    } else {
        aqTituloVal = baseVencimento * params.aqTituloPerc;
        aqTreinoVal = baseVencimento * params.aqTreinoPerc;
    }

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    }

    const baseSemFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
        gratVal + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

    let gratNatalinaTotal = 0;
    let pss13 = 0;
    let ir13 = 0;
    let abono13 = 0;

    // Cálculo completo em Novembro
    if (params.tipoCalculo === 'nov') {
        const base13 = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
            funcaoValor + gratVal + (params.vpni_lei || 0) +
            (params.vpni_decisao || 0) + (params.ats || 0);

        // Abono sobre 13º
        let base13PSS_Estimada = base13;
        base13PSS_Estimada -= aqTreinoVal;
        if (!params.pssSobreFC) base13PSS_Estimada -= funcaoValor;

        const pssTableConfig = config.pss_tables?.[params.tabelaPSS];
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

        if (params.recebeAbono && pssTable) {
            if (usaTeto) {
                const baseLimitada = Math.min(base13PSS_Estimada, teto);
                abono13 = calculatePss(baseLimitada, pssTable);
            } else {
                abono13 = calculatePss(base13PSS_Estimada, pssTable);
            }
        }

        gratNatalinaTotal = base13 + abono13;

        // PSS sobre 13º
        let baseParaPSS13 = base13;
        if (!params.pssSobreFC) baseParaPSS13 -= funcaoValor;
        baseParaPSS13 -= aqTreinoVal;

        if (usaTeto && pssTable) {
            const baseLimitada13 = Math.min(baseParaPSS13, teto);
            pss13 = calculatePss(baseLimitada13, pssTable);
        } else if (pssTable) {
            pss13 = calculatePss(baseParaPSS13, pssTable);
        }

        // IR sobre 13º
        const baseFunpresp = Math.max(0, baseParaPSS13 - teto);
        const valFunpresp = usaTeto && baseFunpresp > 0
            ? baseFunpresp * params.funprespAliq + (baseFunpresp * (params.funprespFacul / 100))
            : 0;

        const baseIR13 = gratNatalinaTotal - pss13 - valFunpresp - (params.dependents * (config.dependent_deduction || 0));
        const deductionVal = config.ir_deduction?.[params.tabelaIR]?.deduction || 896.00;
        ir13 = calculateIrrf(baseIR13, 0.275, deductionVal);
    }

    // Adiantamento do 13º
    let adiant13Venc = params.adiant13Venc || 0;
    let adiant13FC = params.adiant13FC || 0;

    if (!params.manualAdiant13) {
        if (params.tipoCalculo === 'jan' || params.tipoCalculo === 'jun' || params.tipoCalculo === 'nov') {
            adiant13Venc = baseSemFC / 2;
            adiant13FC = funcaoValor / 2;
        }
    }

    adiant13Venc = Math.round(adiant13Venc * 100) / 100;
    adiant13FC = Math.round(adiant13FC * 100) / 100;

    return {
        gratNatalinaTotal,
        pss13,
        ir13,
        adiant13Venc,
        adiant13FC,
        abono13
    };
}
