/**
 * Calculos de Substituicao - JMU
 * 
 * Responsavel por calcular:
 * - Substituicao de funcao
 * - Total de substituicao
 */

import { CourtConfig } from '../../../../types';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

export interface SubstitutionResult {
    total: number;
    entries: Array<{
        id: string;
        total: number;
        isEA: boolean;
        excluirIR: boolean;
        pssIsEA: boolean;
    }>;
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

/**
 * Calcula Substituicao de Funcao
 */
export async function calculateSubstitution(params: IAgencyCalculationParams): Promise<SubstitutionResult> {
    const config = requireAgencyConfig(params);
    const payrollRules = getPayrollRules(config);
    const { funcoes, salario } = await getDataForPeriod(params.periodo, config);
    const gratification = params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas'
        ? (salario[params.cargo]?.[params.padrao] || 0) * payrollRules.specificGratificationRate : 0;
    const baseAbatimento = (isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0)) + gratification;
    const substitutionEntries = params.substitutionEntries || [];

    if (substitutionEntries.length > 0) {
        const entries = substitutionEntries.map((entry, index) => {
            let entryTotal = 0;
            for (const [funcKey, days] of Object.entries(entry.dias || {})) {
                const safeDays = Math.max(0, Number(days || 0));
                if (safeDays > 0 && funcoes[funcKey]) {
                    const valDestino = funcoes[funcKey];
                    if (valDestino > baseAbatimento) {
                        entryTotal += ((valDestino - baseAbatimento) / payrollRules.monthDayDivisor) * safeDays;
                    }
                }
            }

            if (entry.valorBrutoManual !== undefined) {
                if (!Number.isFinite(entry.valorBrutoManual) || entry.valorBrutoManual < 0) {
                    throw new Error('IR-EA: valor bruto manual de substituição inválido.');
                }
                entryTotal = entry.valorBrutoManual;
            }

            return {
                id: entry.id || `subst-${index}`,
                total: Math.round(entryTotal * 100) / 100,
                isEA: Boolean(entry.isEA),
                excluirIR: Boolean(entry.excluirIR),
                pssIsEA: Boolean(entry.pssIsEA)
            };
        });

        const total = Math.round(entries.reduce((acc, item) => acc + item.total, 0) * 100) / 100;
        return { total, entries };
    }

    let legacyTotal = 0;
    if (params.substDias) {
        for (const [funcKey, days] of Object.entries(params.substDias)) {
            const safeDays = Math.max(0, Number(days || 0));
            if (safeDays > 0 && funcoes[funcKey]) {
                const valDestino = funcoes[funcKey];
                if (valDestino > baseAbatimento) {
                    legacyTotal += ((valDestino - baseAbatimento) / payrollRules.monthDayDivisor) * safeDays;
                }
            }
        }
    }

    const total = Math.round(legacyTotal * 100) / 100;
    return {
        total,
        entries: [
            {
                id: 'legacy-subst',
                total,
                isEA: Boolean(params.substIsEA),
                excluirIR: Boolean(params.substExcluirIR),
                pssIsEA: Boolean(params.substPssIsEA)
            }
        ]
    };
}
