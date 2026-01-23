/**
 * Cálculos de Hora Extra - JMU
 * 
 * Responsável por calcular:
 * - Hora Extra 50%
 * - Hora Extra 100%
 * - Total de Hora Extra
 * 
 * Baseado em LEGACY_FORMULAS.md seção 5 (L147-182)
 * 
 * REFATORADO: Agora usa ConfigService
 */

import { configService } from '../../../../config';
import { calculatePss } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

export interface OvertimeResult {
    heVal50: number;
    heVal100: number;
    heTotal: number;
}

/**
 * Calcula Hora Extra (50% e 100%)
 */
export async function calculateOvertime(params: IJmuCalculationParams): Promise<OvertimeResult> {
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

    // Base para HE inclui todos os rendimentos + abono se aplicável
    let baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
        funcaoValor + gratVal + (params.vpni_lei || 0) +
        (params.vpni_decisao || 0) + (params.ats || 0);

    // Se recebe abono, adiciona à base de HE
    if (params.recebeAbono) {
        let baseForPSS = baseHE;
        baseForPSS -= aqTreinoVal; // AQ Treino não entra na base PSS
        if (!params.pssSobreFC) baseForPSS -= funcaoValor;
        if (!params.incidirPSSGrat) baseForPSS -= gratVal;

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

        if (usaTeto) {
            baseForPSS = Math.min(baseForPSS, teto);
        }
        if (pssTable) {
            const abonoEstimado = calculatePss(baseForPSS, pssTable);
            baseHE += abonoEstimado;
        }
    }

    // Valor da hora = Base / 175
    const valorHora = baseHE / 175;

    // HE 50% = hora * 1.5 * quantidade
    const heVal50 = valorHora * 1.5 * (params.heQtd50 || 0);

    // HE 100% = hora * 2.0 * quantidade
    const heVal100 = valorHora * 2.0 * (params.heQtd100 || 0);

    // Total HE
    const heTotal = heVal50 + heVal100;

    return { heVal50, heVal100, heTotal };
}
