/**
 * Calculos de Substituicao - JMU
 * 
 * Responsavel por calcular:
 * - Substituicao de funcao
 * - Total de substituicao
 */

import { CourtConfig } from '../../../../types';
import type { CalculatedSubstitutionEntry, SubstitutionFunctionDetail } from '../../../../types/irEa';
import { IAgencyCalculationParams } from '../types';
import { getDataForPeriod } from './baseCalculations';
import { getPayrollRules, isNoFunction } from './configRules';

export interface SubstitutionResult {
    total: number;
    entries: CalculatedSubstitutionEntry[];
}

const requireAgencyConfig = (params: IAgencyCalculationParams): CourtConfig => {
    if (!params.agencyConfig) {
        throw new Error('agencyConfig is required for JMU calculations.');
    }
    return params.agencyConfig;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

// Concilia a memória com o total já arredondado, sem mudar o valor da rubrica.
const reconcileDetailCents = (details: SubstitutionFunctionDetail[], total: number) => {
    const allocations = details.map(detail => {
        const cents = detail.subtotal * 100;
        return { detail, cents: Math.floor(cents), remainder: cents - Math.floor(cents) };
    });
    let remaining = Math.round(total * 100) - allocations.reduce((sum, item) => sum + item.cents, 0);
    const ranked = allocations.filter(item => item.detail.subtotal > 0).sort((a, b) =>
        b.remainder - a.remainder || (a.detail.funcao < b.detail.funcao ? -1 : a.detail.funcao > b.detail.funcao ? 1 : 0)
    );
    for (const item of ranked) {
        if (remaining <= 0) break;
        item.cents += 1;
        remaining -= 1;
    }
    for (const item of allocations) item.detail.subtotal = item.cents / 100;
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
    const funcoesSubstituicaoElegiveis = Object.keys(funcoes).filter(key => Boolean(funcoes[key]) && funcoes[key] > baseAbatimento);
    const calculateDaysMemory = (dias: Record<string, number>) => {
        let rawTotal = 0;
        const detalhamentoPorFuncao: SubstitutionFunctionDetail[] = [];
        for (const [funcKey, days] of Object.entries(dias)) {
            const safeDays = Math.max(0, Number(days || 0));
            const valorDestino = funcoes[funcKey] || 0;
            const elegivel = funcoesSubstituicaoElegiveis.includes(funcKey);
            const diferencaMensal = elegivel ? valorDestino - baseAbatimento : 0;
            const subtotal = safeDays > 0 && elegivel
                ? (diferencaMensal / payrollRules.monthDayDivisor) * safeDays : 0;
            rawTotal += subtotal;
            detalhamentoPorFuncao.push({
                funcao: funcKey, elegivel, dias: safeDays, valorDestino, baseAbatimento,
                diferencaMensal, divisor: payrollRules.monthDayDivisor, subtotal
            });
        }
        const totalPorDias = roundCurrency(rawTotal);
        reconcileDetailCents(detalhamentoPorFuncao, totalPorDias);
        return { totalPorDias, detalhamentoPorFuncao };
    };

    if (substitutionEntries.length > 0) {
        const entries: CalculatedSubstitutionEntry[] = substitutionEntries.map((entry, index) => {
            const memory = calculateDaysMemory(entry.dias || {});
            let entryTotal = memory.totalPorDias;

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
                pssIsEA: Boolean(entry.pssIsEA),
                funcoesSubstituicaoElegiveis,
                ...memory,
                origemValor: entry.valorBrutoManual !== undefined ? 'manual' : 'dias'
            };
        });

        const total = Math.round(entries.reduce((acc, item) => acc + item.total, 0) * 100) / 100;
        return { total, entries };
    }

    const memory = calculateDaysMemory(params.substDias || {});
    const total = memory.totalPorDias;
    return {
        total,
        entries: [
            {
                id: 'legacy-subst',
                total,
                isEA: Boolean(params.substIsEA),
                excluirIR: Boolean(params.substExcluirIR),
                pssIsEA: Boolean(params.substPssIsEA),
                funcoesSubstituicaoElegiveis,
                ...memory,
                origemValor: 'dias'
            }
        ]
    };
}
