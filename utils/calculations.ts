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
            baseForPSS -= aqTreinoVal;
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

    const licencaVal = ((baseLicencaTotal + abonoEstimadoLicenca) / 30) * state.licencaDias;

    // 5. Total Base for PSS
    let basePSS = baseVencimento + gaj + aqTituloVal + state.vpni_lei + state.vpni_decisao + state.ats;



    if (state.incidirPSSGrat) {
        basePSS += gratVal;
    }

    if (state.pssSobreFC) basePSS += funcaoValor;
    // AQ Treino never enters PSS base

    // HE e Subst entram na base PSS se NÃO forem EA (Indenizatórias/EA não incidem PSS normalmente no simulador padrão, mas aqui segue regra do usuário)
    // Nota: Geralmente HE incide PSS. Se for EA, pode não incidir. 
    // No código original (JS): "SE NÃO FOR EA, ENTRA NA BASE PSS."
    // Update: User rules dictate HE does NOT enter PSS base (Not incorporated).
    // if (!state.heIsEA) basePSS += heTotal; 

    // Substitution removed from PSS base by user request


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

        // [FIXED] Do NOT override base13 with manual advance * 2.
        // The 13th Integral (Credit) should be the Full Monthly Salary (calculated above in line 253).
        // The Manual Advance input should ONLY be used for the Debit (discount).
        // If we override base13 here, we artificially lower the PSS/IR base if the advance was small.
        // base13 = ... (Removed)

        // Ajuste da Base do 13º (Gross) para incluir Abono se aplicável (Mirroring ui.js behavior)
        // ui.js adds 'valAbonoEstimado' to 'baseGN' if recebeAbono is true.

        let abono13Estimado = 0;
        let base13PSS_Estimada = base13;

        // Remove items from PSS Base if unchecked (Refining the base for PSS calc)
        if (!state.pssSobreFC) base13PSS_Estimada -= funcaoValor;
        base13PSS_Estimada -= aqTreinoVal;

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
        baseParaPSS13 -= aqTreinoVal;

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
    const isNov = state.tipoCalculo === 'nov';
    const isJun = state.tipoCalculo === 'jun';

    // Credit: Adiantamento (Jun) OR Integral (Nov)
    const credito13 = isNov ? gratNatalinaTotal : adiant13Total;

    // Debit: Adiantamento (Nov)
    let debito13 = 0;
    if (isNov) {
        if (state.manualDecimoTerceiroNov) {
            debito13 = state.decimoTerceiroNovVenc + state.decimoTerceiroNovFC;
        } else {
            debito13 = adiant13Total;
        }
    }

    const totalBruto = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal +
        state.vpni_lei + state.vpni_decisao + state.ats + abonoPerm +
        heTotal + substTotalCalc + licencaVal +
        state.auxAlimentacao + preEscolarVal + auxTranspCred + ferias1_3 + totalRubricasCred + credito13;

    // Abono de Permanência sobre 13º (Credit) - logic: matches PSS 13
    let abonoPerm13 = 0;
    if (isNov && state.recebeAbono && pss13 > 0) {
        abonoPerm13 = pss13;
        // Adding to Total Bruto immediately (or could be separate variable if needed for display)
        // But totalBruto above is const. Let's make it let or just add it to a new finalBruto.
    }

    const finalTotalBruto = totalBruto + abonoPerm13;

    // Ferias Antecipadas Debit
    const finalFerias1_3 = state.manualFerias ? state.ferias1_3 : ferias1_3;
    const feriasDesc = state.feriasAntecipadas ? finalFerias1_3 : 0;

    // --- CÁLCULO DE DIÁRIAS (Novo Módulo) ---
    // 1. Determinar Valor Base
    let valorDiaria = 0;
    // Se Função começa com 'cj' (CJ-1 a CJ-4), usa valor de CJ
    // Nota: O código da função é tipo 'cj1', 'cj2'...
    if (state.funcao && state.funcao.toLowerCase().startsWith('cj')) {
        valorDiaria = 880.17; // Valor para CJ
    } else if (state.cargo === 'analista') {
        valorDiaria = 806.82; // Valor Analista
    } else {
        valorDiaria = 660.13; // Valor Técnico (Default se tec ou nenhum)
    }

    // 2. Adicional Embarque
    let adicionalEmbarque = 0;
    if (state.diariasEmbarque === 'completo') adicionalEmbarque = 586.78;
    else if (state.diariasEmbarque === 'metade') adicionalEmbarque = 293.39;

    // 3. Bruto Diárias (Indenizatório)
    const diariasBruto = (state.diariasQtd * valorDiaria) + (state.diariasMeiaQtd * (valorDiaria / 2)) + adicionalEmbarque;

    // 4. Deduções (Alimentação e Transporte) e Art. 4º (Benefício Externo)
    let deducaoAlimentacao = 0;
    let deducaoTransporte = 0;
    let glosaExterno = 0; // Dedução do Art. 4º
    const totalDiasViagem = state.diariasQtd + state.diariasMeiaQtd; // Considera total de dias afastados

    // Dedução por Benefício Externo (Art. 4º Parágrafo Único)
    // Cumulativo: 55% Hospedagem, 25% Alimentação, 20% Transporte
    const baseGlosa = (state.diariasQtd * valorDiaria) + (state.diariasMeiaQtd * (valorDiaria / 2));
    let percentGlosa = 0;

    if (state.diariasExtHospedagem) percentGlosa += 0.55;
    if (state.diariasExtAlimentacao) percentGlosa += 0.25;
    if (state.diariasExtTransporte) percentGlosa += 0.20;

    glosaExterno = baseGlosa * percentGlosa;

    if (state.diariasDescontarAlimentacao && totalDiasViagem > 0) {
        // Se já recebeu alimentação externa (glosa 25%), ainda desconta o auxílio do órgão?
        // Sim, pois são coisas distintas: 
        // 1. Glosa: Você não gasta com comida lá, então a diária diminui.
        // 2. Restituição: Você recebeu auxílio para comer aqui, mas viajou, então devolve.
        deducaoAlimentacao = (state.auxAlimentacao / 30) * totalDiasViagem;
    }

    if (state.diariasDescontarTransporte && totalDiasViagem > 0) {
        const baseTransp = auxTranspCred > 0 ? auxTranspCred : 0;
        if (baseTransp > 0) {
            deducaoTransporte = (baseTransp / 30) * totalDiasViagem;
        }
    }

    const diariasLiquido = Math.max(0, diariasBruto - deducaoAlimentacao - deducaoTransporte - glosaExterno);

    // Diárias entram no total líquido mas NÃO no Rendimento Tributável (Total Bruto Padrão geralmente é tributável?)
    // O 'totalBruto' atual soma tudo (inclusive auxílios indenizatórios).
    // Se o usuário quer separadamente: BRUTO entra no Total Bruto, e DESCONTOS no Total Descontos.

    const totalDescontos = pssMensal + valFunpresp + irMensal + irEA + irFerias + ir13 + pss13 +
        state.emprestimos + state.planoSaude + state.pensao + auxTranspDeb + totalRubricasDeb + feriasDesc + debito13 +
        deducaoAlimentacao + deducaoTransporte + glosaExterno; // Include Diarias Deductions

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
        totalBruto: finalTotalBruto + diariasBruto, // Add Gross Diarias to Total Received
        totalDescontos,
        liquido: finalTotalBruto + diariasBruto - totalDescontos,
        ferias1_3: finalFerias1_3,
        feriasDesc, // Return calculated debit
        adiant13Venc: state.manualAdiant13 ? state.adiant13Venc : adiant13Venc,
        adiant13FC: state.manualAdiant13 ? state.adiant13FC : adiant13FC,
        abonoPerm13, // Return calculated Abono 13
        diariasValorTotal: diariasLiquido, // Keep liquid for Accordion Total
        diariasBruto, // Return calculated Gross
        diariasDescAlim: deducaoAlimentacao,
        diariasDescTransp: deducaoTransporte,
        diariasExtHospedagem: state.diariasExtHospedagem,
        diariasExtAlimentacao: state.diariasExtAlimentacao,
        diariasExtTransporte: state.diariasExtTransporte
    };
};
