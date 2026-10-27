import { CalculatorState, SalaryTable, FuncoesTable, CourtConfig, TaxTable } from '../types';

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

const requireConfig = (config?: CourtConfig): CourtConfig => {
    if (!config) {
        throw new Error('CourtConfig is required for calculations.');
    }
    return config;
};

interface AdjustmentEntry {
    period: number;
    percentage: number;
}

const normalizePercentage = (value: number) => (value > 1 ? value / 100 : value);

const findCorrectionTable = (periodo: number, config: CourtConfig): AdjustmentEntry[] | null => {
    const schedule =
        (config as any).adjustment_schedule ||
        (config.values as any)?.adjustment_schedule ||
        (config.values as any)?.reajustes;

    if (!Array.isArray(schedule)) {
        return null;
    }

    return schedule
        .filter((entry: AdjustmentEntry) => Number.isFinite(entry?.period) && Number.isFinite(entry?.percentage))
        .filter((entry: AdjustmentEntry) => entry.period <= periodo)
        .sort((a: AdjustmentEntry, b: AdjustmentEntry) => a.period - b.period);
};

const applyCorrections = (base: number, periodo: number, config: CourtConfig): number => {
    const schedule = findCorrectionTable(periodo, config);
    if (!schedule || schedule.length === 0) {
        return base;
    }

    return schedule.reduce((value, entry) => {
        return value * (1 + normalizePercentage(entry.percentage));
    }, base);
};

export const getTablesForPeriod = (periodo: number, config?: CourtConfig) => {
    const resolved = requireConfig(config);
    const payrollRules = resolved.payrollRules;
    if (!payrollRules) {
        throw new Error('CourtConfig.payrollRules is required for calculations.');
    }
    const BASES = resolved.bases;
    const CJ1_BASE = resolved.values?.cj1_integral_base ?? 0;

    const newSal: SalaryTable = {};
    for (let cargo in BASES.salario) {
        if (!newSal[cargo]) {
            newSal[cargo] = {};
        }
        for (let padrao in BASES.salario[cargo]) {
            newSal[cargo][padrao] = applyCorrections(BASES.salario[cargo][padrao], periodo, resolved);
        }
    }

    const newFunc: FuncoesTable = {};
    for (let key in BASES.funcoes) {
        newFunc[key] = applyCorrections(BASES.funcoes[key], periodo, resolved);
    }

    // Dynamic VR Calculation
    const cj1Adjusted = applyCorrections(CJ1_BASE, periodo, resolved);
    const valorVR = Math.round(cj1Adjusted * payrollRules.vrRateOnCj1 * 100) / 100;

    return { salario: newSal, funcoes: newFunc, valorVR };
};

export const calcPSS = (base: number, tabelaKey: string, config?: CourtConfig) => {
    let total = 0;
    const HIST_PSS = requireConfig(config).historico_pss;
    const table: TaxTable = HIST_PSS[tabelaKey];
    if (!table) return 0;

    for (let f of table.faixas) {
        if (base > f.min) {
            let teto = Math.min(base, f.max);
            if (teto > f.min) total += (teto - f.min) * f.rate;
        }
    }
    return total;
};

export const calcIR = (base: number, deductionKey: string, config?: CourtConfig) => {
    const resolved = requireConfig(config);
    const payrollRules = resolved.payrollRules;
    if (!payrollRules) {
        throw new Error('CourtConfig.payrollRules is required for calculations.');
    }
    const HIST_IR = resolved.historico_ir;
    const deduction = HIST_IR[deductionKey] || 0;
    let val = (base * payrollRules.irrfTopRate) - deduction;
    return val > 0 ? val : 0;
};

// Lógica de IR Progressivo conforme código original (Holerite 8249)
export const calcIR_Progressivo = (baseCalculo: number, deductionKey: string, config?: CourtConfig) => {
    const resolved = requireConfig(config);
    const brackets = resolved.historico_ir_brackets?.[deductionKey] || [];
    if (!Array.isArray(brackets) || brackets.length === 0) {
        return 0;
    }

    const sorted = [...brackets].sort((a, b) => a.min - b.min);
    const faixa = sorted.find((item) => baseCalculo > item.min && baseCalculo <= item.max) ||
        sorted[sorted.length - 1];

    const imposto = (baseCalculo * faixa.rate) - faixa.deduction;
    return imposto > 0 ? imposto : 0;
};

// Helper to calculate the Fixed Base (Remuneração Fixa)
export const calculateBaseFixa = (
    state: CalculatorState,
    funcoes: FuncoesTable,
    salario: SalaryTable,
    valorVR: number,
    gajRate: number,
    gratRate: number,
    noFunctionCode: string
): { baseSemFC: number; totalComFC: number; funcaoValor: number } => {
    const baseVencimento = salario[state.cargo]?.[state.padrao] || 0;
    const gaj = baseVencimento * gajRate;
    const funcaoValor = state.funcao === noFunctionCode ? 0 : (funcoes[state.funcao] || 0);

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
        gratVal = baseVencimento * gratRate;
    } else {
        gratVal = 0;
    }

    const baseSemFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;
    const totalComFC = baseSemFC + funcaoValor;

    return { baseSemFC, totalComFC, funcaoValor };
};

export const calculateAll = (state: CalculatorState, config?: CourtConfig): CalculatorState => {
    const resolvedConfig = requireConfig(config);
    const payrollRules = resolvedConfig.payrollRules;
    if (!payrollRules) {
        throw new Error('CourtConfig.payrollRules is required for calculations.');
    }
    const noFunctionCode = resolvedConfig.careerCatalog?.noFunctionCode ?? '';
    const { salario, funcoes, valorVR } = getTablesForPeriod(state.periodo, config);
    const { baseSemFC, totalComFC, funcaoValor: funcaoValorCalc } = calculateBaseFixa(
        state,
        funcoes,
        salario,
        valorVR,
        payrollRules.gajRate,
        payrollRules.specificGratificationRate,
        noFunctionCode
    );

    const HIST_PSS = resolvedConfig.historico_pss;
    const PRE_SCHOOL = resolvedConfig.values?.pre_school ?? 0;
    const DEDUC_DEP = resolvedConfig.values?.deducao_dep ?? 0;

    // 1. Basic Income
    const baseVencimento = salario[state.cargo]?.[state.padrao] || 0;
    const gaj = baseVencimento * payrollRules.gajRate;
    const funcaoValor = state.funcao === noFunctionCode ? 0 : (funcoes[state.funcao] || 0);

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
    const gratType = (state.gratEspecificaTipo || '').toLowerCase().trim();
    if (gratType === 'gae' || gratType === 'gas') {
        gratVal = round2(baseVencimento * payrollRules.specificGratificationRate);
    } else {
        gratVal = 0;
    }

    // 4. Variables
    const preEscolarVal = state.auxPreEscolarQtd * PRE_SCHOOL;

    // HE Calculation
    let baseHE = 0;
    if (state.manualBaseHE) {
        baseHE = state.heBase;
    } else {
        baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;
        if (state.recebeAbono) {
            let baseForPSS = baseHE;
            baseForPSS -= aqTreinoVal;
            if (!state.pssSobreFC) baseForPSS -= funcaoValor;
            if (!state.incidirPSSGrat) baseForPSS -= gratVal;

            const teto = HIST_PSS[state.tabelaPSS].teto_rgps;
            const usaTeto = state.regimePrev === 'migrado' || state.regimePrev === 'rpc';

            if (usaTeto) {
                baseForPSS = Math.min(baseForPSS, teto);
            }
            const abonoEstimado = calcPSS(baseForPSS, state.tabelaPSS, config);
            baseHE += abonoEstimado;
        }
    }

    const valorHora = baseHE / payrollRules.overtimeMonthHours;
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
                substTotalCalc += ((valDestino - baseAbatimento) / payrollRules.monthDayDivisor) * days;
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
        abonoEstimadoLicenca = calcPSS(baseLicencaTotal, state.tabelaPSS, config);
    }

    const licencaVal = ((baseLicencaTotal + abonoEstimadoLicenca) / payrollRules.monthDayDivisor) * state.licencaDias;

    // 5. Total Base for PSS
    let basePSS = baseVencimento + gaj + aqTituloVal + state.vpni_lei + state.vpni_decisao + state.ats;
    if (state.incidirPSSGrat) basePSS += gratVal;
    if (state.pssSobreFC) basePSS += funcaoValor;

    const teto = HIST_PSS[state.tabelaPSS].teto_rgps;
    const usaTeto = state.regimePrev === 'migrado' || state.regimePrev === 'rpc';

    let pssMensal = 0;
    let baseFunpresp = 0;

    if (usaTeto) {
        const baseLimitada = Math.min(basePSS, teto);
        pssMensal = calcPSS(baseLimitada, state.tabelaPSS, config);
        baseFunpresp = Math.max(0, basePSS - teto);
    } else {
        pssMensal = calcPSS(basePSS, state.tabelaPSS, config);
    }

    let valFunpresp = 0;
    if (usaTeto && baseFunpresp > 0 && state.funprespParticipacao === 'patrocinado') {
        valFunpresp = baseFunpresp * state.funprespAliq + (baseFunpresp * state.funprespFacul);
    }

    const abonoPerm = state.recebeAbono ? pssMensal : 0;

    // 13th
    let gratNatalinaTotal = 0;
    let ir13 = 0;
    let pss13 = 0;

    if (state.tipoCalculo === 'nov') {
        let base13 = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats;

        let abono13Estimado = 0;
        let base13PSS_Estimada = base13;

        if (!state.pssSobreFC) base13PSS_Estimada -= funcaoValor;
        base13PSS_Estimada -= aqTreinoVal;

        if (state.recebeAbono) {
            if (usaTeto) {
                const baseLimitada = Math.min(base13PSS_Estimada, teto);
                abono13Estimado = calcPSS(baseLimitada, state.tabelaPSS, config);
            } else {
                abono13Estimado = calcPSS(base13PSS_Estimada, state.tabelaPSS, config);
            }
        }

        gratNatalinaTotal = base13 + abono13Estimado;

        let baseParaPSS13 = base13;
        if (!state.pssSobreFC) baseParaPSS13 -= funcaoValor;
        baseParaPSS13 -= aqTreinoVal;

        if (usaTeto) {
            const baseLimitada13 = Math.min(baseParaPSS13, teto);
            pss13 = calcPSS(baseLimitada13, state.tabelaPSS, config);
        } else {
            pss13 = calcPSS(baseParaPSS13, state.tabelaPSS, config);
        }

        const baseIR13 = gratNatalinaTotal - pss13 - valFunpresp - (state.dependentes * DEDUC_DEP);
        ir13 = calcIR(baseIR13, state.tabelaIR, config);
    }

    let totalTribMensal = baseVencimento + gaj + aqTituloVal + aqTreinoVal + funcaoValor + gratVal + state.vpni_lei + state.vpni_decisao + state.ats + abonoPerm;
    if (!state.substIsEA) totalTribMensal += substTotalCalc;
    if (!state.heIsEA) totalTribMensal += heTotal;

    const baseIR = totalTribMensal - pssMensal - valFunpresp - (state.dependentes * DEDUC_DEP);
    const irMensal = calcIR(baseIR, state.tabelaIR, config);

    let irEA = 0;
    let baseEA = 0;
    if (state.heIsEA) baseEA += heTotal;
    if (state.substIsEA) baseEA += substTotalCalc;

    if (baseEA > 0) {
        irEA = calcIR_Progressivo(baseEA - (state.dependentes * DEDUC_DEP), state.tabelaIR, config);
        if (irEA < 0) irEA = 0;
    }

    let irFerias = 0;
    if (state.ferias1_3 > 0) {
        if (state.feriasAntecipadas) {
            irFerias = 0;
        } else {
            const baseIRFerias = state.ferias1_3 - (state.dependentes * DEDUC_DEP);
            irFerias = calcIR(baseIRFerias, state.tabelaIR, config);
        }
    }

    let auxTranspCred = 0;
    let auxTranspDeb = 0;
    if (state.auxTransporteGasto > 0) {
        auxTranspCred = state.auxTransporteGasto;
        const baseCalculoDesc = baseVencimento > 0 ? baseVencimento : funcaoValor;
        const desc =
            (baseCalculoDesc / payrollRules.monthDayDivisor * payrollRules.transportWorkdays) *
            payrollRules.transportDiscountRate;

        if (desc >= auxTranspCred) {
            auxTranspCred = 0;
        } else {
            auxTranspDeb = desc;
        }
    }

    let adiant13Venc = state.adiant13Venc;
    let adiant13FC = state.adiant13FC;
    let ferias1_3 = state.ferias1_3;

    if (!state.manualFerias) {
        if (state.tipoCalculo === 'jan' || ferias1_3 > 0) {
            ferias1_3 = totalComFC / 3;
        }
    }
    ferias1_3 = Math.round(ferias1_3 * 100) / 100;

    if (!state.manualAdiant13) {
        if (state.tipoCalculo === 'jan' || state.tipoCalculo === 'jun' || state.tipoCalculo === 'nov') {
            adiant13Venc = baseSemFC / 2;
            adiant13FC = funcaoValor / 2;
        } else if ((adiant13Venc + adiant13FC) > 0) {
            adiant13Venc = baseSemFC / 2;
            adiant13FC = funcaoValor / 2;
        }
    }
    adiant13Venc = Math.round(adiant13Venc * 100) / 100;
    adiant13FC = Math.round(adiant13FC * 100) / 100;

    const adiant13Total = adiant13Venc + adiant13FC;

    let totalRubricasCred = 0;
    let totalRubricasDeb = 0;
    state.rubricasExtras.forEach(r => {
        if (r.tipo === 'C') totalRubricasCred += r.valor;
        else totalRubricasDeb += r.valor;
    });

    const isNov = state.tipoCalculo === 'nov';

    const credito13 = isNov ? gratNatalinaTotal : adiant13Total;

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

    let abonoPerm13 = 0;
    if (isNov && state.recebeAbono && pss13 > 0) {
        abonoPerm13 = pss13;
    }

    const finalTotalBruto = totalBruto + abonoPerm13;

    const finalFerias1_3 = state.manualFerias ? state.ferias1_3 : ferias1_3;
    const feriasDesc = state.feriasAntecipadas ? finalFerias1_3 : 0;

    // Diarias
    const dailiesConfig = resolvedConfig.dailies;
    let valorDiaria = 0;
    if (state.funcao && state.funcao.toLowerCase().startsWith('cj')) {
        valorDiaria = dailiesConfig?.rates?.cj ?? 0;
    } else {
        valorDiaria = dailiesConfig?.rates?.[state.cargo] ?? 0;
    }

    let adicionalEmbarque = 0;
    if (state.diariasEmbarque === 'completo') adicionalEmbarque = dailiesConfig?.embarkationAdditional?.completo ?? 0;
    else if (state.diariasEmbarque === 'metade') adicionalEmbarque = dailiesConfig?.embarkationAdditional?.metade ?? 0;

    const diariasBruto = (state.diariasQtd * valorDiaria) + adicionalEmbarque;

    let deducaoAlimentacao = 0;
    let deducaoTransporte = 0;
    let glosaExterno = 0;
    const totalDiasViagem = state.diariasQtd;

    const baseGlosa = (state.diariasQtd * valorDiaria);
    let percentGlosa = 0;

    if (state.diariasExtHospedagem) percentGlosa += dailiesConfig?.externalGloss?.hospedagem ?? 0;
    if (state.diariasExtAlimentacao) percentGlosa += dailiesConfig?.externalGloss?.alimentacao ?? 0;
    if (state.diariasExtTransporte) percentGlosa += dailiesConfig?.externalGloss?.transporte ?? 0;

    glosaExterno = baseGlosa * percentGlosa;

    if (state.diariasDescontarAlimentacao && totalDiasViagem > 0) {
        deducaoAlimentacao = (state.auxAlimentacao / payrollRules.monthDayDivisor) * totalDiasViagem;
    }

    if (state.diariasDescontarTransporte && totalDiasViagem > 0) {
        const baseTransp = auxTranspCred > 0 ? auxTranspCred : 0;
        if (baseTransp > 0) {
            deducaoTransporte = (baseTransp / payrollRules.monthDayDivisor) * totalDiasViagem;
        }
    }

    const diariasLiquido = Math.max(0, diariasBruto - deducaoAlimentacao - deducaoTransporte - glosaExterno);

    const totalDescontos = pssMensal + valFunpresp + irMensal + irEA + irFerias + ir13 + pss13 +
        state.emprestimos + state.planoSaude + state.pensao + auxTranspDeb + totalRubricasDeb + feriasDesc + debito13 +
        deducaoAlimentacao + deducaoTransporte + glosaExterno;

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
        pss13,
        gratNatalinaTotal: (state.tipoCalculo === 'nov' ? gratNatalinaTotal : 0),
        auxTransporteValor: auxTranspCred,
        auxTransporteDesc: auxTranspDeb,
        licencaValor: licencaVal,
        totalBruto: finalTotalBruto + diariasBruto,
        totalDescontos,
        liquido: finalTotalBruto + diariasBruto - totalDescontos,
        ferias1_3: finalFerias1_3,
        feriasDesc,
        adiant13Venc: state.manualAdiant13 ? state.adiant13Venc : adiant13Venc,
        adiant13FC: state.manualAdiant13 ? state.adiant13FC : adiant13FC,
        abonoPerm13,
        diariasValorTotal: diariasLiquido,
        diariasBruto,
        diariasDescAlim: deducaoAlimentacao,
        diariasDescTransp: deducaoTransporte,
        diariasExtHospedagem: state.diariasExtHospedagem,
        diariasExtAlimentacao: state.diariasExtAlimentacao,
        diariasExtTransporte: state.diariasExtTransporte
    };
};
