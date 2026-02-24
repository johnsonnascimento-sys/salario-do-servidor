/**
 * JMU Service - Orquestrador de Cálculos
 * 
 * Service principal para cálculos da Justiça Militar da União (JMU).
 * Implementa a interface IAgencyCalculator e delega cálculos específicos
 * para módulos especializados.
 * 
 * Arquitetura Modular:
 * - modules/baseCalculations.ts - Vencimento, GAJ, FC, AQ
 * - modules/benefitsCalculations.ts - Auxílios
 * - modules/vacationCalculations.ts - Férias
 * - modules/thirteenthCalculations.ts - 13º Salário
 * - modules/overtimeCalculations.ts - Hora Extra
 * - modules/substitutionCalculations.ts - Substituição
 * - modules/dailiesCalculations.ts - Diárias
 * - modules/leaveCalculations.ts - Licença Compensatória
 * - modules/deductionsCalculations.ts - PSS, IRRF, Funpresp
 */

import { IAgencyCalculator, ICalculationResult, ICalculationParams } from '../types';
import { IJmuCalculationParams } from './jmu/types';

// Importar módulos de cálculo
import { calculateBase, calculateBaseComponents } from './jmu/modules/baseCalculations';
import { calculateBenefits } from './jmu/modules/benefitsCalculations';
import { calculateVacation } from './jmu/modules/vacationCalculations';
import { calculateThirteenth } from './jmu/modules/thirteenthCalculations';
import { calculateOvertime } from './jmu/modules/overtimeCalculations';
import { calculateSubstitution } from './jmu/modules/substitutionCalculations';
import { calculateDailies } from './jmu/modules/dailiesCalculations';
import { calculateCompensatoryLeave } from './jmu/modules/leaveCalculations';
import { calculateDeductions } from './jmu/modules/deductionsCalculations';

const calculateRubricasTotals = (rubricas: Array<{ tipo?: string; valor?: number }> = []) => {
    return rubricas.reduce(
        (acc, rubrica) => {
            const valor = Number(rubrica?.valor);
            if (!Number.isFinite(valor) || valor <= 0) {
                return acc;
            }

            if (rubrica?.tipo === 'D') {
                acc.debitos += valor;
            } else {
                acc.creditos += valor;
            }

            return acc;
        },
        { creditos: 0, debitos: 0 }
    );
};

/**
 * Service de Cálculo da JMU
 *
 * Orquestra todos os cálculos delegando para módulos especializados.
 */
export class JmuService implements IAgencyCalculator {

    /**
     * Calcula a base salarial (vencimento + GAJ + FC + AQ + gratificações)
     */
    async calculateBase(params: ICalculationParams): Promise<number> {
        return await calculateBase(params as IJmuCalculationParams);
    }

    /**
     * Calcula as deduções (PSS, IRRF, Funpresp)
     */
    async calculateDeductions(grossValue: number, params: ICalculationParams): Promise<any> {
        return await calculateDeductions(grossValue, params as IJmuCalculationParams);
    }

    /**
     * Calcula os benefícios (auxílios)
     */
    async calculateBenefits(params: ICalculationParams): Promise<any> {
        return await calculateBenefits(params as IJmuCalculationParams);
    }

    /**
     * Calcula o total da remuneração com todos os componentes
     * 
     * Este é o método principal que orquestra todos os cálculos:
     * 1. Base salarial (vencimento, GAJ, FC, AQ, gratificações)
     * 2. Benefícios (auxílios)
     * 3. Rendimentos variáveis (férias, 13º, HE, substituição, diárias, licença)
     * 4. Deduções (PSS, IRRF, Funpresp)
     * 5. Total líquido
     * 
     * REFATORADO: Agora é async para suportar ConfigService
     */
    async calculateTotal(params: IJmuCalculationParams): Promise<ICalculationResult> {
        // 1. Calcular Base Salarial (agora async)
        const base = await calculateBase(params);
        const baseComponents = await calculateBaseComponents(params);

        // 2. Calcular Benefícios
        const benefits = await calculateBenefits(params);

        // 3. Calcular Rendimentos Variáveis (alguns agora async)
        const vacation = await calculateVacation(params);
        const thirteenth = await calculateThirteenth(params);
        const overtime = await calculateOvertime(params);
        const substitution = await calculateSubstitution(params);
        const dailies = await calculateDailies(params);
        const compensatoryLeave = await calculateCompensatoryLeave(params);
        const rubricasTotals = calculateRubricasTotals(params.rubricasExtras || []);

        // 4. Calcular Deduções (agora async)
        const deductions = await calculateDeductions(base, params);
        const abonoPerm = params.recebeAbono ? deductions.pss : 0;

        // 5. Calcular Totais
        const totalGross = base + abonoPerm + benefits.auxAlimentacao + benefits.auxPreEscolar +
            benefits.auxTransporte + vacation.value + thirteenth.gratNatalinaTotal + overtime.heTotal +
            substitution + dailies.valor + compensatoryLeave + rubricasTotals.creditos;

        const totalDeductions = deductions.total + benefits.auxTransporteDebito +
            (params.discounts || 0) + (params.otherDeductions || 0) +
            vacation.irFerias + vacation.descontoAntecipacao + thirteenth.pss13 +
            thirteenth.ir13 + rubricasTotals.debitos;

        // 6. Retornar Resultado Completo
        return {
            netSalary: totalGross - totalDeductions,
            totalDeductions: totalDeductions,
            totalBenefits: benefits.auxAlimentacao + benefits.auxPreEscolar +
                benefits.auxTransporte + dailies.valor + compensatoryLeave,
            breakdown: {
                // Componentes Base Individuais
                vencimento: baseComponents.vencimento,
                gaj: baseComponents.gaj,
                funcaoValor: baseComponents.funcaoValor,
                aqTitulo: baseComponents.aqTitulo,
                aqTreino: baseComponents.aqTreino,
                gratEspecifica: baseComponents.gratEspecifica,
                vpniLei: baseComponents.vpniLei,
                vpniDecisao: baseComponents.vpniDecisao,
                ats: baseComponents.ats,

                // Soma Total Base (compatibilidade)
                base: base,
                abono: abonoPerm,

                // Deduções
                pss: deductions.pss,
                pssEA: deductions.pssEA,
                irrf: deductions.irrf,
                irEA: deductions.irEA,
                funpresp: deductions.funpresp,

                // Férias
                feriasConstitucional: vacation.value,
                impostoFerias: vacation.irFerias,
                feriasDesconto: vacation.descontoAntecipacao,

                // 13º Salário
                gratificacaoNatalina: thirteenth.gratNatalinaTotal,
                abono13: thirteenth.abono13,
                imposto13: thirteenth.ir13,
                pss13: thirteenth.pss13,
                adiant13Venc: thirteenth.adiant13Venc,
                adiant13FC: thirteenth.adiant13FC,
                segunda13Venc: thirteenth.segunda13Venc,
                segunda13FC: thirteenth.segunda13FC,

                // Hora Extra e Substituição
                heVal50: overtime.heVal50,
                heVal100: overtime.heVal100,
                heTotal: overtime.heTotal,
                substituicao: substitution,

                // Diárias e Licença
                diariasValor: dailies.valor,
                diariasBruto: dailies.bruto,
                diariasGlosa: dailies.glosa,
                diariasDeducoes: dailies.deducoes,
                licencaCompensatoria: compensatoryLeave,

                // Benefícios
                ...benefits,
                rubricasDinamicasCredito: rubricasTotals.creditos,
                rubricasDinamicasDebito: rubricasTotals.debitos
            }
        };
    }
}
