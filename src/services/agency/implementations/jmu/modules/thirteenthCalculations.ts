/**
 * Calculos de 13o Salario / Gratificacao Natalina - JMU
 *
 * Responsavel por calcular:
 * - Gratificacao Natalina (13o salario)
 * - PSS sobre 13o
 * - IR sobre 13o
 * - 1a parcela do 13o (vencimento e FC/CJ)
 * - 2a parcela do 13o (vencimento e FC/CJ)
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
    segunda13Venc: number;
    segunda13FC: number;
    abono13: number;
}

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

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

    const baseSemFC =
        baseVencimento +
        gaj +
        aqTituloVal +
        aqTreinoVal +
        gratVal +
        (params.vpni_lei || 0) +
        (params.vpni_decisao || 0) +
        (params.ats || 0);

    const metadeVencimento13 = baseSemFC / 2;
    const metadeFC13 = funcaoValor / 2;

    let adiant13Venc = params.adiant13Venc || 0;
    let adiant13FC = params.adiant13FC || 0;
    let segunda13Venc = params.segunda13Venc || 0;
    let segunda13FC = params.segunda13FC || 0;

    if (!params.manualAdiant13) {
        const forcePrimeiraByTipo =
            params.tipoCalculo === 'jan' || params.tipoCalculo === 'jun' || params.tipoCalculo === 'nov';
        const forceSegundaByTipo = params.tipoCalculo === 'nov';

        adiant13Venc = forcePrimeiraByTipo || adiant13Venc > 0 ? metadeVencimento13 : 0;
        adiant13FC = forcePrimeiraByTipo || adiant13FC > 0 ? metadeFC13 : 0;
        segunda13Venc = forceSegundaByTipo || segunda13Venc > 0 ? metadeVencimento13 : 0;
        segunda13FC = forceSegundaByTipo || segunda13FC > 0 ? metadeFC13 : 0;
    }

    const primeiraParcelaRecebida = adiant13Venc + adiant13FC;
    const segundaParcelaRecebida = segunda13Venc + segunda13FC;
    const houveSegundaParcela = segundaParcelaRecebida > 0;

    let gratNatalinaTotal = primeiraParcelaRecebida + segundaParcelaRecebida;
    let pss13 = 0;
    let ir13 = 0;
    let abono13 = 0;

    const pssTable = config.historico_pss?.[params.tabelaPSS];
    const teto = pssTable?.teto_rgps || 0;
    const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

    // Regra: 1a parcela nao tem IR/PSS.
    // IR/PSS entram apenas quando ha 2a parcela, com base no total (1a + 2a).
    if (houveSegundaParcela) {
        // Em modo automatico, se a 2a parcela estiver marcada e a 1a estiver zerada,
        // considera-se a 1a parcela teorica na base tributavel do 13o.
        const primeiraVencParaTributo =
            adiant13Venc > 0 ? adiant13Venc : (!params.manualAdiant13 ? metadeVencimento13 : 0);
        const primeiraFCParaTributo =
            adiant13FC > 0 ? adiant13FC : (!params.manualAdiant13 ? metadeFC13 : 0);

        const baseVencTributavel13 = primeiraVencParaTributo + segunda13Venc;
        const baseFCTributavel13 = primeiraFCParaTributo + segunda13FC;
        const base13Tributavel = baseVencTributavel13 + baseFCTributavel13;

        const fatorVenc =
            baseSemFC > 0
                ? Math.min(1, Math.max(0, baseVencTributavel13 / baseSemFC))
                : 0;

        // AQ treinamento nao integra base de PSS do 13o.
        let baseParaPSS13 = base13Tributavel - (aqTreinoVal * fatorVenc);
        if (!params.pssSobreFC) {
            baseParaPSS13 -= baseFCTributavel13;
        }
        baseParaPSS13 = Math.max(0, baseParaPSS13);

        if (params.recebeAbono && pssTable) {
            if (usaTeto) {
                abono13 = calculatePss(Math.min(baseParaPSS13, teto), pssTable);
            } else {
                abono13 = calculatePss(baseParaPSS13, pssTable);
            }
        }

        gratNatalinaTotal += abono13;

        if (pssTable) {
            if (usaTeto) {
                pss13 = calculatePss(Math.min(baseParaPSS13, teto), pssTable);
            } else {
                pss13 = calculatePss(baseParaPSS13, pssTable);
            }
        }

        const baseFunpresp = Math.max(0, baseParaPSS13 - teto);
        const valFunpresp = usaTeto && baseFunpresp > 0
            ? baseFunpresp * params.funprespAliq + (baseFunpresp * (params.funprespFacul / 100))
            : 0;

        const deducaoDep = config.values?.deducao_dep || 0;
        const deductionVal = config.historico_ir?.[params.tabelaIR] || 0;
        const baseIR13 = Math.max(
            0,
            gratNatalinaTotal - pss13 - valFunpresp - (params.dependents * deducaoDep)
        );
        ir13 = calculateIrrf(baseIR13, payrollRules.irrfTopRate, deductionVal);
    }

    adiant13Venc = roundCurrency(adiant13Venc);
    adiant13FC = roundCurrency(adiant13FC);
    segunda13Venc = roundCurrency(segunda13Venc);
    segunda13FC = roundCurrency(segunda13FC);

    return {
        gratNatalinaTotal: roundCurrency(gratNatalinaTotal),
        pss13: roundCurrency(pss13),
        ir13: roundCurrency(ir13),
        adiant13Venc,
        adiant13FC,
        segunda13Venc,
        segunda13FC,
        abono13: roundCurrency(abono13),
    };
}
