/**
 * Calculos de Beneficios - JMU
 * 
 * Responsavel por calcular:
 * - Auxilio Alimentacao
 * - Auxilio Pre-Escolar
 * - Auxilio Transporte (credito e debito)
 */

import { CourtConfig } from '../../../../types';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';
import { getPayrollRules } from './configRules';
import { resolveCommissionPay } from './commissionCalculations';

export interface BenefitsResult {
    auxAlimentacao: number;
    auxPreEscolar: number;
    auxTransporte: number;
    auxTransporteDebito: number;
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula beneficios (auxilios)
 */
export async function calculateBenefits(params: IAgencyCalculationParams): Promise<BenefitsResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);

    const foodAllowance = params.auxAlimentacao > 0
        ? params.auxAlimentacao
        : (config.values?.food_allowance ?? 0);
    if (params.commissionProfile?.receivesFoodAllowance && !(foodAllowance > 0)) {
        throw new Error('Auxílio-alimentação pendente: informe o valor devido na folha do Judiciário.');
    }
    const auxAlimentacao = !params.commissionProfile || params.commissionProfile.receivesFoodAllowance ? foodAllowance : 0;

    const configCotaPreEscolar = config.values?.pre_school ?? 0;
    const cotaPreEscolar = params.cotaPreEscolar && params.cotaPreEscolar > 0
        ? params.cotaPreEscolar
        : configCotaPreEscolar;

    const preEscolarVal = (params.auxPreEscolarQtd || 0) * cotaPreEscolar;

    // Aux Transporte Logic
    let auxTranspCred = 0;
    let auxTranspDeb = 0;
    if (params.auxTransporteGasto > 0) {
        auxTranspCred = params.auxTransporteGasto;

        // Debit logic depends on base salary
        const { salario, funcoes } = await getDataForPeriod(params.periodo, config);
        const commission = resolveCommissionPay(params, { funcoes });
        const baseVenc = commission.allowCareer ? (salario[params.cargo]?.[params.padrao] || 0) : 0;
        let baseCalculoDesc = baseVenc > 0 ? baseVenc : commission.funcaoValor;
        if (params.commissionProfile?.kind === 'external') {
            const originSalary = params.commissionProfile.originBasicSalary;
            if (typeof originSalary !== 'number' || !Number.isFinite(originSalary) || originSalary <= 0) {
                throw new Error('Auxílio-transporte pendente: informe a base documentada do cargo ou emprego de origem para a cota-parte.');
            }
            baseCalculoDesc = originSalary;
        }

        const desc =
            (baseCalculoDesc / payrollRules.monthDayDivisor * payrollRules.transportWorkdays) *
            payrollRules.transportDiscountRate;
        const cotaParte = Math.round(desc * 100) / 100;

        if (cotaParte >= auxTranspCred) {
            auxTranspCred = 0;
        } else {
            auxTranspDeb = cotaParte;
        }
    }

    return {
        auxAlimentacao,
        auxPreEscolar: preEscolarVal,
        auxTransporte: auxTranspCred,
        auxTransporteDebito: auxTranspDeb
    };
}
