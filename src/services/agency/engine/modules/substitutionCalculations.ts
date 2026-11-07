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
    const { funcoes } = await getDataForPeriod(params.periodo, config);

    const baseAbatimento = isNoFunction(params.funcao, config) ? 0 : (funcoes[params.funcao] || 0);
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

            const fallbackManual = Number((entry as any).valorBrutoManual || (entry as any).total || 0);
            if (entryTotal === 0 && fallbackManual > 0) {
                entryTotal = fallbackManual;
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

    const fallbackLegacy = Number((params as any).substTotal || 0);
    if (legacyTotal === 0 && fallbackLegacy > 0) {
        legacyTotal = fallbackLegacy;
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
