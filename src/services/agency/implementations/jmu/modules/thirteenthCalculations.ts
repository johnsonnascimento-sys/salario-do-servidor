/**
 * Calculos de 13o Salario / Gratificacao Natalina - JMU
 * 
 * Responsavel por calcular:
 * - Gratificacao Natalina (13o salario)
 * - PSS sobre 13o
 * - IR sobre 13o
 * - Adiantamento do 13o (vencimento e FC)
 * - Abono sobre 13o
 */

import { CourtConfig } from '../../../../../types';
import { calculatePss, calculateIrrf } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

export interface ThirteenthResult {
    gratNatalinaTotal: number;
    pss13: number;
    ir13: number;
    adiant13Venc: number;
    adiant13FC: number;
    abono13: number;
}

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula 13o Salario / Gratificacao Natalina
 */
export async function calculateThirteenth(params: IJmuCalculationParams): Promise<ThirteenthResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;
    const funcaoValor = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);

    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (params.periodo >= 1) {
        aqTituloVal = valorVR * params.aqTituloVR;
        aqTreinoVal = valorVR * params.aqTreinoVR;
    } else {
        aqTituloVal = baseVencimento * normalizeAQPercent(params.aqTituloPerc);
        aqTreinoVal = baseVencimento * normalizeAQPercent(params.aqTreinoPerc);
    }

    let gratVal = 0;
    if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * payrollRules.specificGratificationRate;
    }

    const baseSemFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
        gratVal + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

    let gratNatalinaTotal = 0;
    let pss13 = 0;
    let ir13 = 0;
    let abono13 = 0;

    const pssTable = config.historico_pss?.[params.tabelaPSS];
    const teto = pssTable?.teto_rgps || 0;
    const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

    // Calculo completo em Novembro
    if (params.tipoCalculo === 'nov') {
        const base13 = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
            funcaoValor + gratVal + (params.vpni_lei || 0) +
            (params.vpni_decisao || 0) + (params.ats || 0);

        // Abono sobre 13o
        let base13PSS_Estimada = base13;
        base13PSS_Estimada -= aqTreinoVal;
        if (!params.pssSobreFC) base13PSS_Estimada -= funcaoValor;

        if (params.recebeAbono && pssTable) {
            if (usaTeto) {
                const baseLimitada = Math.min(base13PSS_Estimada, teto);
                abono13 = calculatePss(baseLimitada, pssTable);
            } else {
                abono13 = calculatePss(base13PSS_Estimada, pssTable);
            }
        }

        gratNatalinaTotal = base13 + abono13;

        // PSS sobre 13o
        let baseParaPSS13 = base13;
        if (!params.pssSobreFC) baseParaPSS13 -= funcaoValor;
        baseParaPSS13 -= aqTreinoVal;

        if (pssTable) {
            if (usaTeto) {
                const baseLimitada13 = Math.min(baseParaPSS13, teto);
                pss13 = calculatePss(baseLimitada13, pssTable);
            } else {
                pss13 = calculatePss(baseParaPSS13, pssTable);
            }
        }

        // IR sobre 13o
        const baseFunpresp = Math.max(0, baseParaPSS13 - teto);
        const valFunpresp = usaTeto && baseFunpresp > 0
            ? baseFunpresp * params.funprespAliq + (baseFunpresp * (params.funprespFacul / 100))
            : 0;

        const deducaoDep = config.values?.deducao_dep || 0;
        const baseIR13 = gratNatalinaTotal - pss13 - valFunpresp - (params.dependents * deducaoDep);
        const deductionVal = config.historico_ir?.[params.tabelaIR] || 0;
        ir13 = calculateIrrf(baseIR13, payrollRules.irrfTopRate, deductionVal);
    }

    // Adiantamento do 13o
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
