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
import { resolveCommissionPay } from './commissionCalculations';
import { resolveCommissionAlternativePay } from './commissionContext';

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
    if (params.commissionProfile) {
        if (!(params.licencaDias > 0)) return 0;
        const rule = config.commission?.compensatoryLeave;
        const competence = `${params.competencia}-01`;
        if (!rule?.source || competence < rule.validFrom || competence >= rule.validTo || params.commissionProfile.compensatoryLeaveEligible !== true) {
            throw new Error('Licença compensatória pendente: confirme o direito à indenização e a vigência da regra neste órgão.');
        }
        if (rule.eligibleFunctions && !rule.eligibleFunctions.includes(params.funcao.toLowerCase())) {
            throw new Error('Licença compensatória pendente: o nível selecionado está fora dos cargos abrangidos neste órgão.');
        }
        if (rule.maxDays !== undefined && (!Number.isInteger(params.licencaDias) || params.licencaDias > rule.maxDays)) {
            throw new Error(`Licença compensatória pendente: informe até ${rule.maxDays} dias inteiros.`);
        }
        if (rule.documentedGross) {
            const amount = params.commissionProfile.compensatoryLeaveDocumentedGross;
            if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
                throw new Error('Licença compensatória pendente: informe o valor bruto documentado na folha do Judiciário.');
            }
            return Math.round(amount * 100) / 100;
        }
    }
    const payrollRules = getPayrollRules(config);
    const { salario, funcoes, valorVR } = await getDataForPeriod(params.periodo, config);
    const commission = resolveCommissionPay(params, { funcoes });
    const baseVencimento = commission.allowCareer ? (salario[params.cargo]?.[params.padrao] || 0) : 0;
    const gaj = baseVencimento * payrollRules.gajRate;
    let originForLeave = commission.originRemuneration;
    if (params.commissionProfile?.kind === 'external' && originForLeave <= 0) {
        const documented = params.commissionProfile.compensatoryLeaveOriginRemuneration;
        if (typeof documented !== 'number' || !Number.isFinite(documented) || documented <= 0) {
            throw new Error('Licença compensatória pendente: informe a remuneração permanente documentada do vínculo de origem para a base da licença.');
        }
        originForLeave = documented;
    }

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
    if (!commission.allowCareer) {
        const pay = params.baseLicenca === 'auto' ? commission : resolveCommissionAlternativePay(params, params.baseLicenca);
        if (!pay) throw new Error('Licença compensatória pendente: selecione função da mesma modalidade remuneratória da folha.');
        valFuncaoLicenca = pay.funcaoValor;
    } else if (params.baseLicenca === 'auto') {
        valFuncaoLicenca = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);
    } else if (funcoes[params.baseLicenca]) {
        valFuncaoLicenca = funcoes[params.baseLicenca];
    }

    const composicao = params.licencaComposicaoBase;
    const incluir = (parcela: LicencaBaseComponent, valor: number) =>
        composicao?.parcelas?.[parcela] === false ? 0 : valor;
    let baseLicencaTotal = incluir('vencimento', baseVencimento + originForLeave) + incluir('gaj', gaj) +
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
