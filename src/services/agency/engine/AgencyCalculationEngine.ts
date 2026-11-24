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
import { resolveAtsRubrics } from './modules/atsCalculations';
import { calculateBenefits } from './modules/benefitsCalculations';
import { calculateVacation } from './modules/vacationCalculations';
import { calculateThirteenth } from './modules/thirteenthCalculations';
import { calculateOvertime } from './modules/overtimeCalculations';
import { calculateSubstitution } from './modules/substitutionCalculations';
import { calculateDailies } from './modules/dailiesCalculations';
import { calculateCompensatoryLeave } from './modules/leaveCalculations';
import { calculateGaacta } from './modules/gaactaCalculations';
import { calculateDeductions } from './modules/deductionsCalculations';
import { calculateTransportIndemnity } from './modules/transportIndemnityCalculations';
import { applyCommissionProfile } from './modules/commissionContext';

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
    private withResolvedAts(params: IAgencyCalculationParams): IAgencyCalculationParams {
        params = applyCommissionProfile(params);
        const { rubricas, error } = resolveAtsRubrics(params.rubricasExtras ?? [], params);
        if (error) throw new Error(error);
        return { ...params, rubricasExtras: rubricas };
    }

    /**
     * Calcula a base salarial (vencimento + GAJ + FC + AQ + gratificaÃ§Ãµes)
     */
    async calculateBase(params: ICalculationParams): Promise<number> {
        return await calculateBase(this.withResolvedAts(params as IAgencyCalculationParams));
    }

    /**
     * Calcula as deduÃ§Ãµes (PSS, IRRF, Funpresp)
     */
    async calculateDeductions(grossValue: number, params: ICalculationParams): Promise<any> {
        return await calculateDeductions(grossValue, this.withResolvedAts(params as IAgencyCalculationParams));
    }

    /**
     * Calcula os benefÃ­cios (auxÃ­lios)
     */
    async calculateBenefits(params: ICalculationParams): Promise<any> {
        return await calculateBenefits(applyCommissionProfile(params as IAgencyCalculationParams));
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
        params = this.withResolvedAts(params);
        // 1. Calcular Base Salarial (agora async)
        const base = await calculateBase(params);
        const baseComponents = await calculateBaseComponents(params);

        // 2. Calcular BenefÃ­cios
        const benefits = await calculateBenefits(params);

        // 3. Calcular Rendimentos Variáveis (alguns agora async)
        const overtime = await calculateOvertime(params);
        const substitution = await calculateSubstitution(params);
        const dailies = await calculateDailies(params);
        const transportIndemnity = calculateTransportIndemnity(params);
        const transportMode = params.transporteIndenizacaoSelecao?.modo;
        if ((params.commissionProfile && params.transporteIndenizacaoAtivo && transportIndemnity.status === 'unavailable') ||
            (transportIndemnity.status === 'invalid' && (params.commissionProfile || transportMode === 'datas' || transportMode === 'avulsos'))) {
            throw new Error(`Indenização de Transporte: ${transportIndemnity.reason}`);
        }
        const compensatoryLeave = await calculateCompensatoryLeave(params);
        const rubricasTotals = calculateRubricasTotals(params.rubricasExtras || []);

        // 4. Calcular Deduções (agora async)
        const vacationPreview = params.commissionProfile ? await calculateVacation(params, true) : undefined;
        const deductions = await calculateDeductions(base, {
            ...params,
            rgpsVacationBase: vacationPreview && !params.feriasAntecipadas ? vacationPreview.value : undefined,
            commissionVacationPayInMonthly: vacationPreview?.taxableRemunerationInMonthly,
        });
        const abonoPerm = params.recebeAbono ? deductions.pss : 0;
        const vacation = await calculateVacation({
            ...params,
            abonoPermanencia: abonoPerm || params.abonoPermanencia || params.pssMensal,
            calculatedPss: deductions.pss,
            commissionVacationInss: deductions.vacationInss
        });
        const thirteenth = await calculateThirteenth({
            ...params,
            abonoPermanencia: abonoPerm || params.abonoPermanencia || params.pssMensal,
            calculatedPss: deductions.pss
        }, deductions.pensionRetroMemory);
        const gaactaResult = await calculateGaacta({
            ...params,
            abonoPermanencia: abonoPerm,
            calculatedPss: deductions.pss
        });

        // 5. Calcular Totais
        const totalGross = base + abonoPerm + benefits.auxAlimentacao + benefits.auxPreEscolar +
            benefits.auxTransporte + vacation.value + thirteenth.gratNatalinaTotal + overtime.heTotal +
            substitution.total + dailies.valor + compensatoryLeave + gaactaResult.valor + rubricasTotals.creditos + transportIndemnity.amount;

        const totalDeductions = deductions.total + benefits.auxTransporteDebito +
            (params.discounts || 0) + (params.otherDeductions || 0) +
            vacation.irFerias + vacation.descontoAntecipacao + (vacation.originWithholding ?? 0) + thirteenth.pss13 + (thirteenth.inss13 ?? 0) + thirteenth.funpresp13 +
            thirteenth.ir13 + thirteenth.primeiraParcelaDesconto + rubricasTotals.debitos;

        // 6. Retornar Resultado Completo
        return {
            netSalary: totalGross - totalDeductions,
            totalDeductions: totalDeductions,
            totalBenefits: benefits.auxAlimentacao + benefits.auxPreEscolar +
                benefits.auxTransporte + dailies.valor + compensatoryLeave + gaactaResult.valor + transportIndemnity.amount,
            pensionMemory: params.commissionProfile ? undefined : { mensal: deductions.pensionMemory, thirteenth: thirteenth.pensionMemory,
                retroativos: deductions.pensionRetroMemory },
            breakdown: {
                // Componentes Base Individuais
                vencimento: baseComponents.vencimento,
                gaj: baseComponents.gaj,
                funcaoValor: baseComponents.funcaoValor,
                originRemuneration: baseComponents.originRemuneration,
                commissionMemory: deductions.commissionMemory,
                rgpsMemory: deductions.rgpsMemory,
                rgpsThirteenthMemory: thirteenth.rgpsMemory,
                commissionIncomeTax: [deductions.incomeTaxMemory, vacation.incomeTaxMemory, thirteenth.incomeTaxMemory].filter(Boolean),
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
                inss: deductions.inss,
                pssEA: deductions.pssEA,
                irrf: deductions.irrf,
                irEA: deductions.irEA,
                irEaMemory: deductions.irEaMemory,
                irEaEntryTax: deductions.irEaEntryTax,
                irEaCurrentYearKeys: deductions.irEaCurrentYearKeys,
                overtimeCalculatedEntries: deductions.overtimeCalculatedEntries,
                substitutionCalculatedEntries: deductions.substitutionCalculatedEntries,
                funpresp: deductions.funpresp,
                funpresp13: thirteenth.funpresp13,
                funprespEA: deductions.funprespEA,
                funprespNormal: deductions.pensionMemory.normal,
                funprespFacultativa: deductions.pensionMemory.facultativa - deductions.pensionMemory.facultativaExterna + deductions.pensionMemory.aporteFolha,
                funprespPatrocinador: deductions.pensionMemory.patrocinador,
                funprespDedutivelIR: deductions.pensionMemory.dedutivelIRFolha,
                baseRpps: deductions.pensionMemory.baseRpps,
                baseFunpresp: deductions.pensionMemory.baseComplementar,
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
                commissionVacationWithholding: vacation.originWithholding,

                // 13Âº SalÃ¡rio
                thirteenthMemory: thirteenth.thirteenthMemory,
                gratificacaoNatalina: thirteenth.gratNatalinaTotal,
                abono13: thirteenth.abono13,
                imposto13: thirteenth.ir13,
                pss13: thirteenth.pss13,
                inss13: thirteenth.inss13,
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
                heIrMensal: deductions.overtimeIrMensal,
                heIrEA: deductions.overtimeIrEA,
                hePss: deductions.overtimePss,
                substituicao: substitution.total,
                substituicaoIr: deductions.substitutionIr,
                substituicaoIrMensal: deductions.substitutionIrMensal,
                substituicaoIrEA: deductions.substitutionIrEA,
                substituicaoPss: deductions.substitutionPss,

                // DiÃ¡rias e LicenÃ§a
                diariasValor: dailies.valor,
                diariasValorUnitario: dailies.valorUnitario,
                diariasBruto: dailies.bruto,
                diariasGlosa: dailies.glosa,
                diariasDeducoes: dailies.deducoes,
                diariasCorteLdo: dailies.corteLdo,
                diariasDescAlim: dailies.descAlim,
                diariasDescTransp: dailies.descTransp,
                diariasDescTranspRetorno: dailies.descTranspRetorno,
                diariasDiasDescAlim: dailies.diasDescontoAlim,
                diariasDiasDescTransp: dailies.diasDescontoTransp,
                licencaCompensatoria: compensatoryLeave,
                gaacta: gaactaResult.valor,
                gaactaBase: gaactaResult.baseCalculo,
                transporteIndenizacaoValor: transportIndemnity.amount,
                transporteIndenizacaoMemory: transportIndemnity,

                // BenefÃ­cios
                ...benefits,
                rubricasDinamicasCredito: rubricasTotals.creditos,
                rubricasDinamicasDebito: rubricasTotals.debitos,
                rubricasTax: deductions.rubricasTax
            }
        };
    }
}

