/**
 * Agency Calculation Engine - Orquestrador de CÃ¡lculos
 * 
 * Motor de cÃ¡lculo por agÃªncia.
 * A implementaÃ§Ã£o atual utiliza as regras da JustiÃ§a Militar da UniÃ£o (JMU),
 * delegando cÃ¡lculos especÃ­ficos
 * para mÃ³dulos especializados.
 * 
 * Arquitetura Modular:
 * - modules/baseCalculations.ts - Vencimento, GAJ, FC, AQ
 * - modules/benefitsCalculations.ts - AuxÃ­lios
 * - modules/vacationCalculations.ts - FÃ©rias
 * - modules/thirteenthCalculations.ts - 13Âº SalÃ¡rio
 * - modules/overtimeCalculations.ts - Hora Extra
 * - modules/substitutionCalculations.ts - SubstituiÃ§Ã£o
 * - modules/dailiesCalculations.ts - DiÃ¡rias
 * - modules/leaveCalculations.ts - LicenÃ§a CompensatÃ³ria
 * - modules/deductionsCalculations.ts - PSS, IRRF, Funpresp
 */

import { IAgencyCalculator, ICalculationResult, ICalculationParams } from '../types';
import { IAgencyCalculationParams } from './types';

// Importar mÃ³dulos de cÃ¡lculo
import { calculateBase, calculateBaseComponents } from './modules/baseCalculations';
import { calculateBenefits } from './modules/benefitsCalculations';
import { calculateVacation } from './modules/vacationCalculations';
import { calculateThirteenth } from './modules/thirteenthCalculations';
import { calculateOvertime } from './modules/overtimeCalculations';
import { calculateSubstitution } from './modules/substitutionCalculations';
import { calculateDailies } from './modules/dailiesCalculations';
import { calculateCompensatoryLeave } from './modules/leaveCalculations';
import { calculateDeductions } from './modules/deductionsCalculations';

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
 * Engine de cÃ¡lculo da agÃªncia
 *
 * Orquestra todos os cÃ¡lculos delegando para mÃ³dulos especializados.
 */
export class AgencyCalculationEngine implements IAgencyCalculator {

    /**
     * Calcula a base salarial (vencimento + GAJ + FC + AQ + gratificaÃ§Ãµes)
     */
    async calculateBase(params: ICalculationParams): Promise<number> {
        return await calculateBase(params as IAgencyCalculationParams);
    }

    /**
     * Calcula as deduÃ§Ãµes (PSS, IRRF, Funpresp)
     */
    async calculateDeductions(grossValue: number, params: ICalculationParams): Promise<any> {
        return await calculateDeductions(grossValue, params as IAgencyCalculationParams);
    }

    /**
     * Calcula os benefÃ­cios (auxÃ­lios)
     */
    async calculateBenefits(params: ICalculationParams): Promise<any> {
        return await calculateBenefits(params as IAgencyCalculationParams);
    }

    /**
     * Calcula o total da remuneraÃ§Ã£o com todos os componentes
     * 
     * Este Ã© o mÃ©todo principal que orquestra todos os cÃ¡lculos:
     * 1. Base salarial (vencimento, GAJ, FC, AQ, gratificaÃ§Ãµes)
     * 2. BenefÃ­cios (auxÃ­lios)
     * 3. Rendimentos variÃ¡veis (fÃ©rias, 13Âº, HE, substituiÃ§Ã£o, diÃ¡rias, licenÃ§a)
     * 4. DeduÃ§Ãµes (PSS, IRRF, Funpresp)
     * 5. Total lÃ­quido
     * 
     * REFATORADO: Agora Ã© async para suportar ConfigService
     */
    async calculateTotal(params: IAgencyCalculationParams): Promise<ICalculationResult> {
        // 1. Calcular Base Salarial (agora async)
        const base = await calculateBase(params);
        const baseComponents = await calculateBaseComponents(params);

        // 2. Calcular BenefÃ­cios
        const benefits = await calculateBenefits(params);

        // 3. Calcular Rendimentos VariÃ¡veis (alguns agora async)
        const vacation = await calculateVacation(params);
        const thirteenth = await calculateThirteenth(params);
        const overtime = await calculateOvertime(params);
        const substitution = await calculateSubstitution(params);
        const dailies = await calculateDailies(params);
        const compensatoryLeave = await calculateCompensatoryLeave(params);
        const rubricasTotals = calculateRubricasTotals(params.rubricasExtras || []);

        // 4. Calcular DeduÃ§Ãµes (agora async)
        const deductions = await calculateDeductions(base, params);
        const abonoPerm = params.recebeAbono ? deductions.pss : 0;

        // 5. Calcular Totais
        const totalGross = base + abonoPerm + benefits.auxAlimentacao + benefits.auxPreEscolar +
            benefits.auxTransporte + vacation.value + thirteenth.gratNatalinaTotal + overtime.heTotal +
            substitution + dailies.valor + compensatoryLeave + rubricasTotals.creditos;

        const totalDeductions = deductions.total + benefits.auxTransporteDebito +
            (params.discounts || 0) + (params.otherDeductions || 0) +
            vacation.irFerias + vacation.descontoAntecipacao + thirteenth.pss13 +
            thirteenth.ir13 + thirteenth.primeiraParcelaDesconto + rubricasTotals.debitos;

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

                // DeduÃ§Ãµes
                pss: deductions.pss,
                pssEA: deductions.pssEA,
                irrf: deductions.irrf,
                irEA: deductions.irEA,
                funpresp: deductions.funpresp,
                aqIr: deductions.aqIr,
                aqPss: deductions.aqPss,
                gratIr: deductions.gratIr,
                gratPss: deductions.gratPss,
                vantagensIr: deductions.vantagensIr,
                vantagensPss: deductions.vantagensPss,
                abonoIr: deductions.abonoIr,

                // FÃ©rias
                feriasConstitucional: vacation.value,
                impostoFerias: vacation.irFerias,
                feriasDesconto: vacation.descontoAntecipacao,

                // 13Âº SalÃ¡rio
                gratificacaoNatalina: thirteenth.gratNatalinaTotal,
                abono13: thirteenth.abono13,
                imposto13: thirteenth.ir13,
                pss13: thirteenth.pss13,
                debitoPrimeiraParcela13: thirteenth.primeiraParcelaDesconto,
                adiant13Venc: thirteenth.adiant13Venc,
                adiant13FC: thirteenth.adiant13FC,
                segunda13Venc: thirteenth.segunda13Venc,
                segunda13FC: thirteenth.segunda13FC,

                // Hora Extra e SubstituiÃ§Ã£o
                heVal50: overtime.heVal50,
                heVal100: overtime.heVal100,
                heTotal: overtime.heTotal,
                heIr: deductions.overtimeIr,
                hePss: deductions.overtimePss,
                substituicao: substitution,
                substituicaoIr: deductions.substitutionIr,
                substituicaoPss: deductions.substitutionPss,

                // DiÃ¡rias e LicenÃ§a
                diariasValor: dailies.valor,
                diariasBruto: dailies.bruto,
                diariasGlosa: dailies.glosa,
                diariasDeducoes: dailies.deducoes,
                diariasCorteLdo: dailies.corteLdo,
                diariasDescAlim: dailies.descAlim,
                diariasDescTransp: dailies.descTransp,
                diariasDiasDescAlim: dailies.diasDescontoAlim,
                diariasDiasDescTransp: dailies.diasDescontoTransp,
                licencaCompensatoria: compensatoryLeave,

                // BenefÃ­cios
                ...benefits,
                rubricasDinamicasCredito: rubricasTotals.creditos,
                rubricasDinamicasDebito: rubricasTotals.debitos
            }
        };
    }
}

