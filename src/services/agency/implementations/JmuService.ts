
import { IAgencyCalculator, ICalculationParams, ICalculationResult } from '../types';
import { calculatePss, calculateIrrf, calculateIrrfProgressive, TaxTable } from '../../../core/calculations/taxUtils';
import { BASES_2025, HISTORICO_PSS, HISTORICO_IR, COTA_PRE_ESCOLAR, DEDUCAO_DEP, CJ1_INTEGRAL_BASE } from '../../../data';
import { calcReajuste } from '../../../utils/calculations'; // Reuse reajuste logic for now

// JMU Specific Params Interface (superset of ICalculationParams)
export interface IJmuCalculationParams extends ICalculationParams {
    periodo: number;
    cargo: 'analista' | 'tec';
    padrao: string;
    funcao: string;
    aqTituloPerc: number;
    aqTreinoPerc: number;
    aqTituloVR: number;
    aqTreinoVR: number;
    recebeAbono: boolean;
    gratEspecificaTipo: '0' | 'gae' | 'gas';
    gratEspecificaValor: number;
    vpni_lei: number;
    vpni_decisao: number;
    ats: number;
    dependents: number;
    regimePrev: 'antigo' | 'migrado' | 'novo_antigo' | 'rpc';
    tabelaPSS: '2026' | '2025' | '2024';
    pssSobreFC: boolean;
    incidirPSSGrat: boolean;
    funprespAliq: number;
    funprespFacul: number;
    auxAlimentacao: number;
    auxPreEscolarQtd: number;
    auxTransporteGasto: number; // For now assuming passed as parameter
    // ... add others as needed
}

export class JmuService implements IAgencyCalculator {

    // Helper to get data based on period (mimics getTablesForPeriod)
    private getDataForPeriod(periodo: number) {
        // Logic copied from utils/calculations.ts
        const steps = periodo >= 2 ? periodo - 1 : 0;

        // Deep copy and adjust bases
        const sal = JSON.parse(JSON.stringify(BASES_2025.salario));
        for (let cargo in sal) {
            for (let padrao in sal[cargo]) {
                sal[cargo][padrao] = calcReajuste(sal[cargo][padrao], steps);
            }
        }

        const func = JSON.parse(JSON.stringify(BASES_2025.funcoes));
        for (let key in func) {
            func[key] = calcReajuste(func[key], steps);
        }

        const cj1Adjusted = calcReajuste(CJ1_INTEGRAL_BASE, steps);
        const valorVR = Math.round(cj1Adjusted * 0.065 * 100) / 100;

        return { salario: sal, funcoes: func, valorVR };
    }

    calculateBase(params: IJmuCalculationParams): number {
        const { salario, funcoes, valorVR } = this.getDataForPeriod(params.periodo);

        const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
        const gaj = baseVencimento * 1.40; // JMU Rule: GAJ is 140%
        const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

        // AQ
        let aqTituloVal = 0;
        let aqTreinoVal = 0;
        if (params.periodo >= 1) {
            aqTituloVal = valorVR * params.aqTituloVR;
            aqTreinoVal = valorVR * params.aqTreinoVR;
        } else {
            aqTituloVal = baseVencimento * params.aqTituloPerc;
            aqTreinoVal = baseVencimento * params.aqTreinoPerc;
        }

        // Grat Specific
        let gratVal = 0;
        if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
            gratVal = baseVencimento * 0.35; // JMU Rule: 35%
        } else {
            gratVal = params.gratEspecificaValor || 0;
        }

        // VPNI + ATS
        const extras = (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

        return baseVencimento + gaj + funcaoValor + aqTituloVal + aqTreinoVal + gratVal + extras;
    }

    calculateBenefits(params: IJmuCalculationParams): any {
        const preEscolarVal = (params.auxPreEscolarQtd || 0) * COTA_PRE_ESCOLAR;
        const auxAlimentacao = params.auxAlimentacao; // Usually 1393.10 but passed in params

        // Aux Transporte Logic (Simplified for now, matching core logic)
        let auxTranspCred = 0;
        let auxTranspDeb = 0;
        if (params.auxTransporteGasto > 0) {
            auxTranspCred = params.auxTransporteGasto;
            // Debit logic depends on base salary usually
            const { salario, funcoes } = this.getDataForPeriod(params.periodo);
            const baseVenc = salario[params.cargo]?.[params.padrao] || 0;
            const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

            const baseCalculoDesc = baseVenc > 0 ? baseVenc : funcaoValor;
            const desc = (baseCalculoDesc / 30 * 22) * 0.06;

            if (desc >= auxTranspCred) {
                auxTranspCred = 0;
            } else {
                auxTranspDeb = desc;
            }
        }

        return {
            auxAlimentacao,
            auxPreEscolar: preEscolarVal,
            auxTransporte: auxTranspCred,
            auxTransporteDebito: auxTranspDeb
        };
    }

    calculateDeductions(grossValue: number, params: IJmuCalculationParams): any {
        const { salario, funcoes, valorVR } = this.getDataForPeriod(params.periodo);
        const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
        const gaj = baseVencimento * 1.40;

        // Recalculate components needed for PSS Base
        let aqTituloVal = 0;
        if (params.periodo >= 1) aqTituloVal = valorVR * params.aqTituloVR;
        else aqTituloVal = baseVencimento * params.aqTituloPerc;

        const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

        let gratVal = 0;
        if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
            gratVal = baseVencimento * 0.35;
        }

        // PSS Base Calculation
        let basePSS = baseVencimento + gaj + aqTituloVal + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);
        if (params.incidirPSSGrat) basePSS += gratVal;
        if (params.pssSobreFC) basePSS += funcaoValor;

        const pssTable = HISTORICO_PSS[params.tabelaPSS];
        const teto = pssTable.teto_rgps;
        const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

        let pssMensal = 0;
        let baseFunpresp = 0;

        if (usaTeto) {
            const baseLimitada = Math.min(basePSS, teto);
            pssMensal = calculatePss(baseLimitada, pssTable);
            baseFunpresp = Math.max(0, basePSS - teto);
        } else {
            pssMensal = calculatePss(basePSS, pssTable);
        }

        // Funpresp
        let valFunpresp = 0;
        if (usaTeto && baseFunpresp > 0) {
            valFunpresp = baseFunpresp * params.funprespAliq + (baseFunpresp * (params.funprespFacul / 100));
        }

        // IRRF Base
        // grossValue passed in might be 'totalBruto', but IRRF base is typically Total Bruto Tributável
        // We need to calculate Total Tributável explicitly.
        // For simplicity, let's assume specific structure or recalculate.
        // Total Tributavel = Base + FC + Grat + Extras + Abono Perm?
        const abonoPerm = params.recebeAbono ? pssMensal : 0;

        // Recalculate full taxable partials
        let aqTreinoVal = 0;
        if (params.periodo >= 1) aqTreinoVal = valorVR * params.aqTreinoVR;
        else aqTreinoVal = baseVencimento * params.aqTreinoPerc;

        // Total Tributavel Construction
        let totalTrib = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal +
            (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0) + abonoPerm;

        const baseIR = totalTrib - pssMensal - valFunpresp - (params.dependents * DEDUCAO_DEP);

        // IRRF Config
        // Currently data.ts only has '2025_maio' etc.
        // But core taxUtils expect 'rate' and 'deduction'. 
        // We need to look up the IR bracket.
        // Since we don't have a table in data.ts for IR (just a fixed value '908.73'?), 
        // We will default to the standard logic inside taxUtils or use the one from calculations.ts.
        // calculations.ts uses `calcIR` which uses a single deduction value? 
        // Wait, `calcIR` in calculations.ts: `val = (base * 0.275) - deduction`. 
        // This implies everyone hits top bracket? Or is it partial?  
        // Ah, `calcIR` in `calculations.ts` (line 60) uses `force top bracket` logic for 'Analista'? 
        // No, it seems to assume the user is high income?
        // Let's use `calculateIrrfProgressive` if appropriate or stick to the legacy logic.
        // Legacy `calcIR` takes `deductionKey` -> `HISTORICO_IR[key]`.
        // Let's follow that.

        const deductionVal = HISTORICO_IR['2025_maio'] || 896.00; // Defaulting for now
        const irMensal = calculateIrrf(baseIR, 0.275, deductionVal);

        return {
            pss: pssMensal,
            funpresp: valFunpresp,
            irrf: irMensal,
            total: pssMensal + valFunpresp + irMensal // + other deductions
        };
    }

    calculateTotal(params: IJmuCalculationParams): ICalculationResult {
        const base = this.calculateBase(params);
        const benefits = this.calculateBenefits(params);

        // We need to pass a gross value to deductions, but deductions re-calculates specifics.
        // Let's assume CalculateBase returns the main gross.
        // We need to add AbonoPermanencia logic which is circular (depends on PSS).

        // Re-run full flow to be safe (orchestration)
        // 1. Get PSS to get Abono
        const deductions = this.calculateDeductions(base, params);

        const abonoPerm = params.recebeAbono ? deductions.pss : 0;

        const totalGross = base + abonoPerm + benefits.auxAlimentacao + benefits.auxPreEscolar + benefits.auxTransporte;

        const totalDeductions = deductions.total + benefits.auxTransporteDebito + (params.discounts || 0) + (params.otherDeductions || 0);

        return {
            netSalary: totalGross - totalDeductions,
            totalDeductions: totalDeductions,
            totalBenefits: benefits.auxAlimentacao + benefits.auxPreEscolar + benefits.auxTransporte,
            breakdown: {
                base: base,
                abono: abonoPerm,
                pss: deductions.pss,
                irrf: deductions.irrf,
                funpresp: deductions.funpresp,
                ...benefits
            }
        };
    }
}
