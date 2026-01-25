/**
 * Calculos de Licenca Compensatoria - JMU
 * 
 * Responsavel por calcular:
 * - Licenca compensatoria proporcional aos dias
 * - Abono sobre licenca (opcional)
 */

import { CourtConfig } from '../../../../../types';
import { calculatePss } from '../../../../../core/calculations/taxUtils';
import { IJmuCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';

const requireAgencyConfig = (params: IJmuCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Licenca Compensatoria
 */
export async function calculateCompensatoryLeave(params: IJmuCalculationParams): Promise<number> {
    const config = requireAgencyConfig(params);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * 1.40;

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

    // Funcao usada na licenca
    let valFuncaoLicenca = 0;
    if (params.baseLicenca === 'auto') {
        valFuncaoLicenca = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);
    } else if (funcoes[params.baseLicenca]) {
        valFuncaoLicenca = funcoes[params.baseLicenca];
    }

    // Base da Licenca
    const baseLicencaTotal = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
        gratVal + (params.vpni_lei || 0) +
        (params.vpni_decisao || 0) + (params.ats || 0) +
        valFuncaoLicenca;

    // Abono sobre licenca (opcional)
    let abonoEstimadoLicenca = 0;
    if (params.incluirAbonoLicenca) {
        const pssTable = config.historico_pss?.[params.tabelaPSS];
        if (pssTable) {
            abonoEstimadoLicenca = calculatePss(baseLicencaTotal, pssTable);
        }
    }

    // Valor da Licenca = (Base + Abono) / 30 * Dias
    const licencaVal = ((baseLicencaTotal + abonoEstimadoLicenca) / 30) * (params.licencaDias || 0);

    return Math.round(licencaVal * 100) / 100;
}
