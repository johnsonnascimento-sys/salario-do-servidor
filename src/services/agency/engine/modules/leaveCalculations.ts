/**
 * Calculos de Licenca Compensatoria - JMU
 * 
 * Responsavel por calcular:
 * - Licenca compensatoria proporcional aos dias
 * - Abono sobre licenca (opcional)
 */

import { CourtConfig } from '../../../../types';
import type { LicencaBaseComponent } from '../../../../types/licenca';
import { calculatePss } from '../../../../core/calculations/taxUtils';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod, normalizeAQPercent } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Licenca Compensatoria
 */
export async function calculateCompensatoryLeave(params: IAgencyCalculationParams): Promise<number> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;

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

    // Funcao usada na licenca
    let valFuncaoLicenca = 0;
    if (params.baseLicenca === 'auto') {
        valFuncaoLicenca = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);
    } else if (funcoes[params.baseLicenca]) {
        valFuncaoLicenca = funcoes[params.baseLicenca];
    }

    const composicao = params.licencaComposicaoBase;
    const incluir = (parcela: LicencaBaseComponent, valor: number) =>
        composicao?.parcelas?.[parcela] === false ? 0 : valor;
    let baseLicencaTotal = incluir('vencimento', baseVencimento) + incluir('gaj', gaj) +
        incluir('aqTitulo', aqTituloVal) + incluir('aqTreino', aqTreinoVal) +
        incluir('gratificacao', gratVal) + incluir('vpni', params.vpni_lei || 0) +
        incluir('vpni', params.vpni_decisao || 0) + incluir('ats', params.ats || 0) +
        incluir('funcao', valFuncaoLicenca);
    for (const rubrica of params.rubricasExtras ?? []) {
        const valor = Number(rubrica.valor);
        if (rubrica.tipo === 'C' && composicao?.rubricas?.[rubrica.id] === true && Number.isFinite(valor) && valor > 0) {
            baseLicencaTotal += valor;
        }
    }

    // Abono sobre licenca (opcional)
    let abonoEstimadoLicenca = 0;
    if (params.incluirAbonoLicenca) {
        const pssTable = config.historico_pss?.[params.tabelaPSS];
        if (pssTable) {
            abonoEstimadoLicenca = calculatePss(baseLicencaTotal, pssTable);
        }
    }

    // Valor da Licenca = (Base + Abono) / 30 * Dias (Regra 4.2.2: dias não aceitam valor negativo)
    const safeDias = Math.max(0, Math.floor(Number(params.licencaDias) || 0));
    const licencaVal =
        ((baseLicencaTotal + abonoEstimadoLicenca) / payrollRules.monthDayDivisor) * safeDias;

    return Math.max(0, Math.round(licencaVal * 100) / 100);
}
