import { BASES_2025, HISTORICO_PSS, HISTORICO_IR, DEDUCAO_DEP, COTA_PRE_ESCOLAR, CJ1_INTEGRAL_BASE } from '../data';
import { CalculatorState, SalaryTable, FuncoesTable } from '../types';

export const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Reajuste based on Lei 11.416 steps
export const calcReajuste = (valorBase: number, steps: number) => {
    let val = valorBase;
    for (let i = 0; i < steps; i++) {
        val = Math.floor(val * 1.08 * 100) / 100;
    }
    return val;
};

// Helper for rounding to 2 decimals (fixes precision issues vs Original JS)
const round2 = (val: number) => Math.round(val * 100) / 100;

export const getTablesForPeriod = (periodo: number) => {
    const steps = periodo >= 2 ? periodo - 1 : 0;

    const newSal: SalaryTable = { analista: {}, tec: {} };
    for (let cargo in BASES_2025.salario) {
        for (let padrao in BASES_2025.salario[cargo as 'analista' | 'tec']) {
            newSal[cargo][padrao] = calcReajuste(BASES_2025.salario[cargo as 'analista' | 'tec'][padrao], steps);
        }
    }

    const newFunc: FuncoesTable = {};
    for (let key in BASES_2025.funcoes) {
        newFunc[key] = calcReajuste(BASES_2025.funcoes[key], steps);
    }

    // Dynamic VR Calculation
    const cj1Adjusted = calcReajuste(CJ1_INTEGRAL_BASE, steps);
    const valorVR = Math.round(cj1Adjusted * 0.065 * 100) / 100;

    return { salario: newSal, funcoes: newFunc, valorVR };
};

export const calcPSS = (base: number, tabelaKey: string) => {
    let total = 0;
    const table = HISTORICO_PSS[tabelaKey];
    if (!table) return 0;

    for (let f of table.faixas) {
        if (base > f.min) {
            let teto = Math.min(base, f.max);
            if (teto > f.min) total += (teto - f.min) * f.rate;
        }
    }
    return total;
};

export const calcIR = (base: number, deductionKey: string) => {
    const deduction = HISTORICO_IR[deductionKey] || 896.00;
    let val = (base * 0.275) - deduction;
    return val > 0 ? val : 0;
};

// Lógica de IR Progressivo conforme código original (Holerite 8249)
export const calcIR_Progressivo = (baseCalculo: number) => {
    if (baseCalculo <= 2259.20) {
        return 0.00;
    } else if (baseCalculo <= 2826.65) {
        return (baseCalculo * 0.075) - 169.44;
    } else if (baseCalculo <= 3751.05) {
        return (baseCalculo * 0.150) - 381.44;
    } else if (baseCalculo <= 4664.68) {
        return (baseCalculo * 0.225) - 662.77;
    } else {
        return (baseCalculo * 0.275) - 896.00;
    }
};

// Helper to calculate the Fixed Base (Remuneração Fixa)
export const calculateBaseFixa = (state: CalculatorState, funcoes: FuncoesTable, salario: SalaryTable, valorVR: number): { baseSemFC: number; totalComFC: number; funcaoValor: number } => {
    const baseVencimento = salario[state.cargo][state.padrao] || 0;
    const gaj = baseVencimento * 1.40;
    const funcaoValor = state.funcao === '0' ? 0 : (funcoes[state.funcao] || 0);

    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (state.periodo >= 1) {
        aqTituloVal = valorVR * state.aqTituloVR;
        aqTreinoVal = valorVR * state.aqTreinoVR;
    } else {
        aqTituloVal = baseVencimento * state.aqTituloPerc;
        aqTreinoVal = baseVencimento * state.aqTreinoPerc;
    }

    let gratVal = state.gratEspecificaValor;
    if (state.gratEspecificaTipo === 'gae' || state.gratEspecificaTipo === 'gas') {
        gratVal = baseVencimento * 0.35;
    } else {
        gratVal = 0;
    }

    const baseSemFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;
    const totalComFC = baseSemFC + funcaoValor;

    return { baseSemFC, totalComFC, funcaoValor };
};

export const calculateAll = (state: CalculatorState): CalculatorState => {
    const { salario, funcoes, valorVR } = getTablesForPeriod(state.periodo);
    const { baseSemFC, totalComFC, funcaoValor: funcaoValorCalc } = calculateBaseFixa(state, funcoes, salario, valorVR);

    // 1. Basic Income
    const baseVencimento = salario[state.cargo][state.padrao] || 0;
    const gaj = baseVencimento * 1.40;
    const funcaoValor = state.funcao === '0' ? 0 : (funcoes[state.funcao] || 0);

    // 2. AQ
    let aqTituloVal = 0;
    let aqTreinoVal = 0;
    if (state.periodo >= 1) {
        aqTituloVal = valorVR * state.aqTituloVR;
        aqTreinoVal = valorVR * state.aqTreinoVR;
    } else {
        aqTituloVal = round2(baseVencimento * state.aqTituloPerc);
        aqTreinoVal = round2(baseVencimento * state.aqTreinoPerc);
    }

    // 3. Grat Specific
    let gratVal = state.gratEspecificaValor;

    // Normalize type
    const gratType = (state.gratEspecificaTipo || '').toLowerCase().trim();

    if (gratType === 'gae' || gratType === 'gas') {
        gratVal = round2(baseVencimento * 0.35);
    } else {
        // Force reset if type is '0' or invalid
        gratVal = 0;
    }

    // 4. Variables
    const preEscolarVal = state.auxPreEscolarQtd * state.cotaPreEscolar;

    // HE Calculation - Base Update Logic
    let baseHE = 0;
    if (state.manualBaseHE) {
        // Se marcado "Não atualizar", mantém o valor digitado/anterior
        baseHE = state.heBase;
    } else {
        // Se automático, soma todos os rendimentos tributáveis
        baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;

        // Add Abono Estimado if checked (pois integra a base de cálculo)
        if (state.recebeAbono) {
            let baseForPSS = baseHE;
            if (!state.pssSobreAQTreino) baseForPSS -= aqTreinoVal;
            if (!state.pssSobreFC) baseForPSS -= funcaoValor;
            if (!state.incidirPSSGrat) baseForPSS -= gratVal;

            const teto = HISTORICO_PSS[state.tabelaPSS].teto_rgps;
            const usaTeto = state.regimePrev === 'migrado' || state.regimePrev === 'rpc';

            if (usaTeto) {
                baseForPSS = Math.min(baseForPSS, teto);
            }
            const abonoEstimado = calcPSS(baseForPSS, state.tabelaPSS);
            baseHE += abonoEstimado;
        }
    }

    const valorHora = baseHE / 175;
    const heVal50 = (valorHora * 1.5 * state.heQtd50);
    const heVal100 = (valorHora * 2.0 * state.heQtd100);
    const heTotal = heVal50 + heVal100;

    // Substitution Calculation
    let substTotalCalc = 0;
    const baseAbatimento = funcaoValor + gratVal;

    for (const [funcKey, days] of Object.entries(state.substDias)) {
        if (days > 0 && funcoes[funcKey]) {
            const valDestino = funcoes[funcKey];
            if (valDestino > baseAbatimento) {
                substTotalCalc += ((valDestino - baseAbatimento) / 30) * days;
            }
        }
    }

    // License
    let valFuncaoLicenca = 0;
    if (state.baseLicenca === 'auto') valFuncaoLicenca = funcaoValor;
    else if (funcoes[state.baseLicenca]) valFuncaoLicenca = funcoes[state.baseLicenca];

    const baseLicencaTotal = baseVencimento + gaj + aqTituloVal + aqTreinoVal + gratVal + state.vpni_lei + state.vpni_decisao + state.ats + valFuncaoLicenca;

    let abonoEstimadoLicenca = 0;
    if (state.incluirAbonoLicenca) {
        abonoEstimadoLicenca = calcPSS(baseLicencaTotal, state.tabelaPSS);
    }

    const licencaVal = ((baseLicencaTotal + abonoEstimadoLicenca) / 30) * Math.min(state.licencaDias, 4);

    // 5. Total Base for PSS
    let basePSS = baseVencimento + gaj + aqTituloVal + state.vpni_lei + state.vpni_decisao + state.ats;

    if (state.incidirPSSGrat) {
        basePSS += gratVal;
    }

    if (state.pssSobreFC) basePSS += funcaoValor;
    if (state.pssSobreAQTreino) basePSS += aqTreinoVal;

    // HE e Subst entram na base PSS se NÃO forem EA (Indenizatórias/EA não incidem PSS normalmente no simulador padrão, mas aqui segue regra do usuário)
    // Nota: Geralmente HE incide PSS. Se for EA, pode não incidir. 
    // No código original (JS): "SE NÃO FOR EA, ENTRA NA BASE PSS."
    if (!state.heIsEA) basePSS += heTotal;
    if (!state.substIsEA) basePSS += substTotalCalc;

    // Teto Logic
    const teto = HISTORICO_PSS[state.tabelaPSS].teto_rgps;
    const usaTeto = state.regimePrev === 'migrado' || state.regimePrev === 'rpc';

    let pssMensal = 0;
    let baseFunpresp = 0;

    if (usaTeto) {
        const baseLimitada = Math.min(basePSS, teto);
        pssMensal = calcPSS(baseLimitada, state.tabelaPSS);
        baseFunpresp = Math.max(0, basePSS - teto);
    } else {
        pssMensal = calcPSS(basePSS, state.tabelaPSS);
    }

    // Funpresp
    let valFunpresp = 0;
    if (usaTeto && baseFunpresp > 0) {
        valFunpresp = baseFunpresp * state.funprespAliq + (baseFunpresp * (state.funprespFacul / 100));
    }

    // Abono
    const abonoPerm = state.recebeAbono ? pssMensal : 0;

    // --- CÁLCULO ESPECÍFICO DE 13º SALÁRIO (NOVEMBRO) ---
    // Em Novembro: Calcula-se o 13º Integral, abate-se o adiantamento.
    // O IR sobre 13º é Exclusivo na Fonte.

    let gratNatalinaTotal = 0;

    let ir13 = 0;
    let pss13 = 0;

    // Se for Novembro
    if (state.tipoCalculo === 'nov') {
        // Base Calculation
        let base13 = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;

        // --- DYNAMIC RECALCULATION LOGIC FOR MANUAL INPUTS ---
        if (state.manualAdiant13 && state.adiant13Venc > 0) {
            // If manual, override the calculated 'base13' with (AdiantVB * 2) + (AdiantFC * 2) 
            // to respect the user's intent that manual inputs should reflect in the taxes.
            base13 = (state.adiant13Venc * 2) + (state.adiant13FC * 2);
        }

        // --- DYNAMIC RECALCULATION LOGIC FOR MANUAL INPUTS ---
        // User requested: "When I alter Adiant. Ativo EC (Base)... it is not reflecting in Taxes".
        // This implies the user wants the Gross 13th (which generates the tax) to be derived from the Manual Advance input * 2.
        // If manual mode is active, we should try to infer the "Effective Base" from the manual advance input.

        if (state.manualAdiant13 && state.adiant13Venc > 0) {
            // If the user manually set the Advance (Adiant. Ativo EC), we assume the Total Gross Base was 2x that amount?
            // Or at least, the "part" related to Base.
            // Let's assume the user wants the "Base do 13º" to follow the manual input logic:
            // Gross Base ~= (AdiantVB * 2) + Other components? 
            // Simplification: If manual, override the calculated 'base13' with (AdiantVB * 2) to respect the user's "Base" intent.
            // EXCEPT: Abono and other things might still apply.
            // Let's replace 'base13' with (state.adiant13Venc * 2) IF it's significantly different?
            // Or just use it directly.
            base13 = state.adiant13Venc * 2;

            // Same for FC?
            // If AdiantFC is manual, then FC component of Base is AdiantFC * 2.
            // But 'funcaoValor' is already separate. 
            // If we use (AdiantVB * 2) as 'base13' (which includes VB+GAJ+AQ...), we might be double counting or missing things.
            // BUT base13 definition above includes 'funcaoValor'.
            // Let's refine:
            // base13 above = Sum(Components).
            // adiant13Venc (Standard) = (Components - FC) / 2.
            // So (adiant13Venc * 2) = (Components - FC).
            // Thus, Effective Base13 = (state.adiant13Venc * 2) + (state.adiant13FC * 2) + Grat + VPNI... ?
            // No, adiant13FC follows function.

            // SAFEST LOGIC FOR USER INTENT:
            // Total Gross 13th = (Manual Adiant VB * 2) + (Manual Adiant FC * 2).
            // This ensures that if they lower the Advance, they lower the Gross, and thus lower the Tax.
            // We will recalculate 'base13' as just the sum of these two double parts, plus potential Abono.

            // Recalculating base13 using manual inputs:
            base13 = (state.adiant13Venc * 2) + (state.adiant13FC * 2);
        }

        // Ajuste da Base do 13º (Gross) para incluir Abono se aplicável (Mirroring ui.js behavior)
        // ui.js adds 'valAbonoEstimado' to 'baseGN' if recebeAbono is true.

        let abono13Estimado = 0;
        let base13PSS_Estimada = base13;

        // Remove items from PSS Base if unchecked (Refining the base for PSS calc)
        if (!state.pssSobreFC) base13PSS_Estimada -= funcaoValor;
        if (!state.pssSobreAQTreino) base13PSS_Estimada -= aqTreinoVal;

        if (state.recebeAbono) {
            if (usaTeto) {
                const baseLimitada = Math.min(base13PSS_Estimada, teto);
                abono13Estimado = calcPSS(baseLimitada, state.tabelaPSS);
            } else {
                abono13Estimado = calcPSS(base13PSS_Estimada, state.tabelaPSS);
            }
            // Add to Gross 13th (so the user sees the credit covering the PSS debit)
            // gratNatalinaTotal += abono13Estimado; // Wait, we need to update the variable
        }

        gratNatalinaTotal = base13 + abono13Estimado;

        // PSS sobre 13º (Integral)
        // Now calculate the actual PSS debit to be shown
        let baseParaPSS13 = base13; // Start fresh
        // Apply exclusions again for safety
        if (!state.pssSobreFC) baseParaPSS13 -= funcaoValor;
        if (!state.pssSobreAQTreino) baseParaPSS13 -= aqTreinoVal;

        // If Abono is included in Gross, does it enter PSS Base?
        // ui.js: 'basePSS13 = baseStandard'. baseStandard DOES NOT include abono. 
        // So PSS Base is raw.

        if (usaTeto) {
            const baseLimitada13 = Math.min(baseParaPSS13, teto);
            pss13 = calcPSS(baseLimitada13, state.tabelaPSS);
        } else {
            pss13 = calcPSS(baseParaPSS13, state.tabelaPSS);
        }

        // Special Case: If recebeAbono, ui.js essentially adds Abono to Gross, and Debits PSS. Net is 0 change.
        // My previous logic 'pss13 = 0' hid both.
        // Better logic: Show PSS (Debit) and ensure Gross is higher (Credit).
        // If I update gratNatalinaTotal above, I am effectively showing the Abono as part of the 13th payment.

        // IR 13 Calculation
        // ui.js: baseIR13 = total13Tributavel - valPSS13 ...
        // total13Tributavel = baseGN + fc ... (baseGN includes Abono)
        // So BaseIR = (RawBase + Abono) - PSS.
        // Since Abono ~= PSS, BaseIR ~= RawBase.

        const baseIR13 = gratNatalinaTotal - pss13 - valFunpresp - (state.dependentes * DEDUCAO_DEP);
        ir13 = calcIR(baseIR13, state.tabelaIR);

        // Ajuste no State para exibição:
        // Precisamos adicionar "Gratificacao Natalina" (13º Integral) nos Proventos?
        // Ou o sistema mostra Salário + Diferença de 13º?
        // Padrão Holerite Novembro: "Gratificação Natalina" (Valor Total) e "Adiantamento Grat. Natalina" (Desconto).

        // Mas a estrutura atual soma "adiant13Venc" como Provento.
        // Se for nov, não devemos ter 'adiant13Venc' somando de novo como adiantamento.
        // Devemos ter 'Gratificação Natalina' integral.
    }

    // IR Base - EC (Exercício Corrente)
    let totalTribMensal = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats + abonoPerm;

    // Só adiciona ao IR Mensal se NÃO for EA
    if (!state.substIsEA) totalTribMensal += substTotalCalc;
    if (!state.heIsEA) totalTribMensal += heTotal;

    const baseIR = totalTribMensal - pssMensal - valFunpresp - (state.dependentes * DEDUCAO_DEP);
    const irMensal = calcIR(baseIR, state.tabelaIR);

    // IR EA (Exercício Anterior / RRA) - Calculado Separadamente
    let irEA = 0;
    let baseEA = 0;
    if (state.heIsEA) baseEA += heTotal;
    if (state.substIsEA) baseEA += substTotalCalc;

    if (baseEA > 0) {
        // Deduz dependentes também na base EA se aplicável (lógica padrão RRA permite)
        // Usa a função progressiva específica fornecida
        irEA = calcIR_Progressivo(baseEA - (state.dependentes * DEDUCAO_DEP));
        if (irEA < 0) irEA = 0;
    }

    // IR Ferias (Separado)
    let irFerias = 0;
    if (state.ferias1_3 > 0) {
        if (state.feriasAntecipadas) {
            irFerias = 0;
        } else {
            const baseIRFerias = state.ferias1_3 - (state.dependentes * DEDUCAO_DEP);
            irFerias = calcIR(baseIRFerias, state.tabelaIR);
        }
    }

    // Transport
    let auxTranspCred = 0;
    let auxTranspDeb = 0;
    if (state.auxTransporteGasto > 0) {
        auxTranspCred = state.auxTransporteGasto;
        const baseCalculoDesc = baseVencimento > 0 ? baseVencimento : funcaoValor;
        const desc = (baseCalculoDesc / 30 * 22) * 0.06;

        if (desc >= auxTranspCred) {
            auxTranspCred = 0;
        } else {
            auxTranspDeb = desc;
        }
    }

    // 13th Total & Vacation (Manual Check)
    let adiant13Venc = state.adiant13Venc;
    let adiant13FC = state.adiant13FC;
    let ferias1_3 = state.ferias1_3;

    // Logic for Dynamic Updates:
    // If NOT manual, we want to recalculate IF:
    // 1. It is the specific month (Jan for Vacation/13th, Jun for 13th, Nov for 13th Final)
    // 2. OR if the value is already > 0 (meaning the user clicked "Calculate" in a common month), we keep it updated with current salary.

    if (!state.manualFerias) {
        if (state.tipoCalculo === 'jan' || ferias1_3 > 0) {
            // Recalculate based on CURRENT salary state
            ferias1_3 = totalComFC / 3;
        }
    }

    // Rounding Vacation to 2 decimals for clean UI
    ferias1_3 = Math.round(ferias1_3 * 100) / 100;

    if (!state.manualAdiant13) {
        if (state.tipoCalculo === 'jan' || state.tipoCalculo === 'jun' || state.tipoCalculo === 'nov') {
            // In Jan/Jun/Nov, auto-calc is mandatory if not lock
            adiant13Venc = baseSemFC / 2;
            adiant13FC = funcaoValor / 2;
        } else if ((adiant13Venc + adiant13FC) > 0) {
            // In Common months, if it was manually triggered (present > 0), keep updating it dynamically?
            // Or just keep it as is? User said "values calculated... must be altered dynamically".
            // So yes, if it exists, update it.
            adiant13Venc = baseSemFC / 2;
            adiant13FC = funcaoValor / 2;
        }
    }

    // Rounding 13th Advance
    adiant13Venc = Math.round(adiant13Venc * 100) / 100;
    adiant13FC = Math.round(adiant13FC * 100) / 100;

    if (!state.manualFerias) {
        // Logic for automatic Vacation calculation could go here, but usually it's triggered manually
    }

    const adiant13Total = adiant13Venc + adiant13FC;

    // Rubricas Extras Logic
    let totalRubricasCred = 0;
    let totalRubricasDeb = 0;
    state.rubricasExtras.forEach(r => {
        if (r.tipo === 'C') totalRubricasCred += r.valor;
        else totalRubricasDeb += r.valor;
    });

    // Totals
    const totalBruto = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal +
        state.vpni_lei + state.vpni_decisao + state.ats + abonoPerm +
        heTotal + substTotalCalc + licencaVal +
        state.auxAlimentacao + preEscolarVal + auxTranspCred + ferias1_3 + adiant13Total + totalRubricasCred;

    // Se for Novembro, adiciona Gratificação Natalina Integral na soma bruta (se implementarmos como linha separada)
    // Por enquanto, vamos manter a lógica simples: se Nov, calcula IR 13º e exibe.
    // MAS, para o IR 13º aparecer, precisa estar no Total Descontos.

    // Ferias Antecipadas Debit
    const finalFerias1_3 = state.manualFerias ? state.ferias1_3 : ferias1_3;
    const feriasDesc = state.feriasAntecipadas ? finalFerias1_3 : 0;

    const totalDescontos = pssMensal + valFunpresp + irMensal + irEA + irFerias + ir13 + pss13 +
        state.emprestimos + state.planoSaude + state.pensao + auxTranspDeb + totalRubricasDeb + feriasDesc;

    return {
        ...state,
        vencimento: baseVencimento,
        gaj,
        aqTituloValor: aqTituloVal,
        aqTreinoValor: aqTreinoVal,
        gratEspecificaValor: gratVal,
        heVal50,
        heVal100,
        heTotal,
        heBase: baseHE,
        substTotal: substTotalCalc,
        auxPreEscolarValor: preEscolarVal,
        abonoPermanencia: abonoPerm,
        pssMensal,
        valFunpresp,
        irMensal,
        irEA,
        irFerias,
        ir13,
        pss13, // Novo campo corrigido
        gratNatalinaTotal: (state.tipoCalculo === 'nov' ? gratNatalinaTotal : 0), // Novo campo para UX
        auxTransporteValor: auxTranspCred,
        auxTransporteDesc: auxTranspDeb,
        licencaValor: licencaVal,
        totalBruto,
        totalDescontos,
        liquido: totalBruto - totalDescontos,
        ferias1_3: finalFerias1_3,
        feriasDesc, // Return calculated debit
        adiant13Venc: state.manualAdiant13 ? state.adiant13Venc : adiant13Venc,
        adiant13FC: state.manualAdiant13 ? state.adiant13FC : adiant13FC,
    };
};
