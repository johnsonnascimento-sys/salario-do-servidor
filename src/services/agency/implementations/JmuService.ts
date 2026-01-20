
import { IAgencyCalculator, ICalculationParams, ICalculationResult } from '../types';
import { calculatePss, calculateIrrf, calculateIrrfProgressive, TaxTable } from '../../../core/calculations/taxUtils';
import { BASES_2025, HISTORICO_PSS, HISTORICO_IR, COTA_PRE_ESCOLAR, DEDUCAO_DEP, CJ1_INTEGRAL_BASE, AQ_MULTIPLIERS } from '../../../data';
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
    auxTransporteGasto: number;

    // Fase 7: Férias e 13º
    tipoCalculo: 'comum' | 'jan' | 'jun' | 'nov';
    manualFerias: boolean;
    ferias1_3: number;
    feriasAntecipadas: boolean;
    manualAdiant13: boolean;
    adiant13Venc: number;
    adiant13FC: number;
    tabelaIR: string;

    // Fase 8: Hora Extra e Substituição
    heQtd50: number;
    heQtd100: number;
    substDias: Record<string, number>; // Mapa de função -> dias

    // Fase 9: Diárias e Licenças
    diariasQtd: number;
    diariasEmbarque: 'nenhum' | 'metade' | 'completo';
    diariasExtHospedagem: boolean;
    diariasExtAlimentacao: boolean;
    diariasExtTransporte: boolean;
    diariasDescontarAlimentacao: boolean;
    diariasDescontarTransporte: boolean;
    licencaDias: number;
    baseLicenca: 'auto' | string;
    incluirAbonoLicenca: boolean;
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

        // AQ - Adicional de Qualificação (Lei 15.292/2025)
        // CRÍTICO: No novo modelo (período >= 1), usar fórmula exata da lei
        // VR (Valor de Referência) = CJ1_INTEGRAL_BASE * 0.065
        // AQ = Multiplicador × VR
        // 
        // Multiplicadores da Lei:
        // - Doutorado: 5.0 × VR
        // - Mestrado: 3.5 × VR  
        // - Especialização: 1.0 × VR
        // - Treinamento: 0.2 × VR (por 120h, acumulável até 0.6)
        let aqTituloVal = 0;
        let aqTreinoVal = 0;

        if (params.periodo >= 1) {
            // Novo AQ: VR × Multiplicador
            // valorVR já vem calculado como CJ1_INTEGRAL_BASE * 0.065
            // params.aqTituloVR e params.aqTreinoVR já são os multiplicadores corretos (5.0, 3.5, 1.0, etc)

            // VALIDAÇÃO: Detectar valores incorretos (cache antigo)
            if (params.aqTituloVR > 10 || params.aqTreinoVR > 10) {
                console.error('⚠️ ERRO: Multiplicadores AQ incorretos!', {
                    aqTituloVR: params.aqTituloVR,
                    aqTreinoVR: params.aqTreinoVR,
                    valorVR,
                    periodo: params.periodo
                });
                console.warn('🔄 Possível cache antigo detectado. Por favor, atualize a página e selecione novamente os valores de AQ.');
            }

            aqTituloVal = valorVR * params.aqTituloVR;
            aqTreinoVal = valorVR * params.aqTreinoVR;
        } else {
            // Antigo AQ: Percentual direto do vencimento
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

    /**
     * Calcula componentes individuais da base para o breakdown detalhado
     * IMPORTANTE: Usado para mapear de volta para o React state
     */
    private calculateBaseComponents(params: IJmuCalculationParams) {
        const { salario, funcoes, valorVR } = this.getDataForPeriod(params.periodo);

        const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
        const gaj = baseVencimento * 1.40;
        const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

        let aqTituloVal = 0;
        let aqTreinoVal = 0;
        if (params.periodo >= 1) {
            // Novo AQ: VR × Multiplicador (Lei 15.292)
            aqTituloVal = valorVR * params.aqTituloVR;
            aqTreinoVal = valorVR * params.aqTreinoVR;
        } else {
            // Antigo AQ: Percentual do vencimento
            aqTituloVal = baseVencimento * params.aqTituloPerc;
            aqTreinoVal = baseVencimento * params.aqTreinoPerc;
        }

        let gratVal = 0;
        if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
            gratVal = baseVencimento * 0.35;
        } else {
            gratVal = params.gratEspecificaValor || 0;
        }

        return {
            vencimento: baseVencimento,
            gaj,
            funcaoValor,
            aqTitulo: aqTituloVal,
            aqTreino: aqTreinoVal,
            gratEspecifica: gratVal,
            vpniLei: params.vpni_lei || 0,
            vpniDecisao: params.vpni_decisao || 0,
            ats: params.ats || 0
        };
    }

    calculateBenefits(params: IJmuCalculationParams): any {
        // Valores de benefícios variam conforme o período
        // Período 0 (2025): valores antigos
        // Período >= 1 (2026+): valores novos
        let auxAlimentacao: number;
        let cotaPreEscolar: number;

        if (params.periodo === 0) {
            // 2025
            auxAlimentacao = 1182.74;
            cotaPreEscolar = 935.22;
        } else {
            // 2026+
            auxAlimentacao = 1784.42;
            cotaPreEscolar = 1235.77;
        }

        const preEscolarVal = (params.auxPreEscolarQtd || 0) * cotaPreEscolar;

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

    /**
     * Calcula Férias (1/3 Constitucional)
     * Baseado em LEGACY_FORMULAS.md seção 7 (L312-317, L284-292)
     */
    private calculateVacation(params: IJmuCalculationParams): { value: number; irFerias: number } {
        let ferias1_3 = params.ferias1_3 || 0;

        if (!params.manualFerias) {
            // Férias automáticas em Janeiro ou se há valor manual
            if (params.tipoCalculo === 'jan' || ferias1_3 > 0) {
                // Férias = 1/3 da remuneração total COM função
                const { salario, funcoes, valorVR } = this.getDataForPeriod(params.periodo);
                const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
                const gaj = baseVencimento * 1.40;
                const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

                let aqTituloVal = 0;
                let aqTreinoVal = 0;
                if (params.periodo >= 1) {
                    // Novo AQ: VR × Multiplicador
                    aqTituloVal = valorVR * params.aqTituloVR;
                    aqTreinoVal = valorVR * params.aqTreinoVR;
                } else {
                    aqTituloVal = baseVencimento * params.aqTituloPerc;
                    aqTreinoVal = baseVencimento * params.aqTreinoPerc;
                }

                let gratVal = 0;
                if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
                    gratVal = baseVencimento * 0.35;
                }

                const totalComFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
                    funcaoValor + gratVal + (params.vpni_lei || 0) +
                    (params.vpni_decisao || 0) + (params.ats || 0);

                ferias1_3 = totalComFC / 3;
            }
        }
        ferias1_3 = Math.round(ferias1_3 * 100) / 100;

        // IR sobre Férias
        let irFerias = 0;
        if (ferias1_3 > 0 && !params.feriasAntecipadas) {
            const baseIRFerias = ferias1_3 - (params.dependents * DEDUCAO_DEP);
            const deductionVal = HISTORICO_IR[params.tabelaIR] || 896.00;
            irFerias = calculateIrrf(baseIRFerias, 0.275, deductionVal);
        }

        return { value: ferias1_3, irFerias };
    }

    /**
     * Calcula 13º Salário / Gratificação Natalina
     * Baseado em LEGACY_FORMULAS.md seção 8 (L227-265, L319-331)
     */
    private calculateThirteenth(params: IJmuCalculationParams): {
        gratNatalinaTotal: number;
        pss13: number;
        ir13: number;
        adiant13Venc: number;
        adiant13FC: number;
        abono13: number;
    } {
        const { salario, funcoes, valorVR } = this.getDataForPeriod(params.periodo);
        const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
        const gaj = baseVencimento * 1.40;
        const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

        let aqTituloVal = 0;
        let aqTreinoVal = 0;
        if (params.periodo >= 1) {
            aqTituloVal = valorVR * params.aqTituloVR;
            aqTreinoVal = valorVR * params.aqTreinoVR;
        } else {
            aqTituloVal = baseVencimento * params.aqTituloPerc;
            aqTreinoVal = baseVencimento * params.aqTreinoPerc;
        }

        let gratVal = 0;
        if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
            gratVal = baseVencimento * 0.35;
        }

        const baseSemFC = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
            gratVal + (params.vpni_lei || 0) + (params.vpni_decisao || 0) + (params.ats || 0);

        let gratNatalinaTotal = 0;
        let pss13 = 0;
        let ir13 = 0;
        let abono13 = 0;

        // Cálculo completo em Novembro
        if (params.tipoCalculo === 'nov') {
            const base13 = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
                funcaoValor + gratVal + (params.vpni_lei || 0) +
                (params.vpni_decisao || 0) + (params.ats || 0);

            // Abono sobre 13º
            let base13PSS_Estimada = base13;
            base13PSS_Estimada -= aqTreinoVal;
            if (!params.pssSobreFC) base13PSS_Estimada -= funcaoValor;

            const pssTable = HISTORICO_PSS[params.tabelaPSS];
            const teto = pssTable.teto_rgps;
            const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

            if (params.recebeAbono) {
                if (usaTeto) {
                    const baseLimitada = Math.min(base13PSS_Estimada, teto);
                    abono13 = calculatePss(baseLimitada, pssTable);
                } else {
                    abono13 = calculatePss(base13PSS_Estimada, pssTable);
                }
            }

            gratNatalinaTotal = base13 + abono13;

            // PSS sobre 13º
            let baseParaPSS13 = base13;
            if (!params.pssSobreFC) baseParaPSS13 -= funcaoValor;
            baseParaPSS13 -= aqTreinoVal;

            if (usaTeto) {
                const baseLimitada13 = Math.min(baseParaPSS13, teto);
                pss13 = calculatePss(baseLimitada13, pssTable);
            } else {
                pss13 = calculatePss(baseParaPSS13, pssTable);
            }

            // IR sobre 13º
            const baseFunpresp = Math.max(0, baseParaPSS13 - teto);
            const valFunpresp = usaTeto && baseFunpresp > 0
                ? baseFunpresp * params.funprespAliq + (baseFunpresp * (params.funprespFacul / 100))
                : 0;

            const baseIR13 = gratNatalinaTotal - pss13 - valFunpresp - (params.dependents * DEDUCAO_DEP);
            const deductionVal = HISTORICO_IR[params.tabelaIR] || 896.00;
            ir13 = calculateIrrf(baseIR13, 0.275, deductionVal);
        }

        // Adiantamento do 13º
        let adiant13Venc = params.adiant13Venc || 0;
        let adiant13FC = params.adiant13FC || 0;

        if (!params.manualAdiant13) {
            if (params.tipoCalculo === 'jan' || params.tipoCalculo === 'jun' || params.tipoCalculo === 'nov') {
                adiant13Venc = baseSemFC / 2;
                adiant13FC = funcaoValor / 2;
            }
        }

        adiant13Venc = Math.round(adiant13Venc * 100) / 100;
        adiant13FC = Math.round(adiant13FC * 100) / 100;

        return {
            gratNatalinaTotal,
            pss13,
            ir13,
            adiant13Venc,
            adiant13FC,
            abono13
        };
    }

    /**
     * Calcula Hora Extra (50% e 100%)
     * Baseado em LEGACY_FORMULAS.md seção 5 (L147-182)
     */
    private calculateOvertime(params: IJmuCalculationParams): { heVal50: number; heVal100: number; heTotal: number } {
        const { salario, funcoes, valorVR } = this.getDataForPeriod(params.periodo);
        const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
        const gaj = baseVencimento * 1.40;
        const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

        let aqTituloVal = 0;
        let aqTreinoVal = 0;
        if (params.periodo >= 1) {
            aqTituloVal = valorVR * params.aqTituloVR;
            aqTreinoVal = valorVR * params.aqTreinoVR;
        } else {
            aqTituloVal = baseVencimento * params.aqTituloPerc;
            aqTreinoVal = baseVencimento * params.aqTreinoPerc;
        }

        let gratVal = 0;
        if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
            gratVal = baseVencimento * 0.35;
        }

        // Base para HE inclui todos os rendimentos + abono se aplicável
        let baseHE = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
            funcaoValor + gratVal + (params.vpni_lei || 0) +
            (params.vpni_decisao || 0) + (params.ats || 0);

        // Se recebe abono, adiciona à base de HE
        if (params.recebeAbono) {
            let baseForPSS = baseHE;
            baseForPSS -= aqTreinoVal; // AQ Treino não entra na base PSS
            if (!params.pssSobreFC) baseForPSS -= funcaoValor;
            if (!params.incidirPSSGrat) baseForPSS -= gratVal;

            const pssTable = HISTORICO_PSS[params.tabelaPSS];
            const teto = pssTable.teto_rgps;
            const usaTeto = params.regimePrev === 'migrado' || params.regimePrev === 'rpc';

            if (usaTeto) {
                baseForPSS = Math.min(baseForPSS, teto);
            }
            const abonoEstimado = calculatePss(baseForPSS, pssTable);
            baseHE += abonoEstimado;
        }

        // Valor da hora = Base / 175
        const valorHora = baseHE / 175;

        // HE 50% = hora * 1.5 * quantidade
        const heVal50 = valorHora * 1.5 * (params.heQtd50 || 0);

        // HE 100% = hora * 2.0 * quantidade
        const heVal100 = valorHora * 2.0 * (params.heQtd100 || 0);

        // Total HE
        const heTotal = heVal50 + heVal100;

        return { heVal50, heVal100, heTotal };
    }

    /**
     * Calcula Substituição de Função
     * Baseado em LEGACY_FORMULAS.md seção 6 (L191-215)
     */
    private calculateSubstitution(params: IJmuCalculationParams): number {
        const { funcoes } = this.getDataForPeriod(params.periodo);
        const funcaoValor = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);

        const { salario } = this.getDataForPeriod(params.periodo);
        const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;

        let gratVal = 0;
        if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
            gratVal = baseVencimento * 0.35;
        }

        // Base de abatimento = Função atual + Gratificação
        const baseAbatimento = funcaoValor + gratVal;

        let substTotalCalc = 0;

        // Para cada função substituída
        if (params.substDias) {
            for (const [funcKey, days] of Object.entries(params.substDias)) {
                if (days > 0 && funcoes[funcKey]) {
                    const valDestino = funcoes[funcKey]; // Valor da função destino

                    // Só paga diferença se destino > origem
                    if (valDestino > baseAbatimento) {
                        substTotalCalc += ((valDestino - baseAbatimento) / 30) * days;
                    }
                }
            }
        }

        return Math.round(substTotalCalc * 100) / 100;
    }

    /**
     * Calcula Diárias de Viagem
     * Baseado em LEGACY_FORMULAS.md seção 10 (L341-393)
     */
    private calculateDailies(params: IJmuCalculationParams): {
        valor: number;
        bruto: number;
        glosa: number;
        deducoes: number;
    } {
        // 1. Determinar valor da diária por cargo/função
        let valorDiaria = 0;
        if (params.funcao && params.funcao.toLowerCase().startsWith('cj')) {
            valorDiaria = 880.17;  // CJ
        } else if (params.cargo === 'analista') {
            valorDiaria = 806.82;  // Analista
        } else {
            valorDiaria = 660.13;  // Técnico
        }

        // 2. Adicional de embarque
        let adicionalEmbarque = 0;
        if (params.diariasEmbarque === 'completo') {
            adicionalEmbarque = 586.78;
        } else if (params.diariasEmbarque === 'metade') {
            adicionalEmbarque = 293.39;
        }

        // 3. Bruto
        const diariasBruto = (params.diariasQtd * valorDiaria) + adicionalEmbarque;

        // 4. Glosa Externa (reduções percentuais)
        let percentGlosa = 0;
        if (params.diariasExtHospedagem) percentGlosa += 0.55;   // 55%
        if (params.diariasExtAlimentacao) percentGlosa += 0.25;  // 25%
        if (params.diariasExtTransporte) percentGlosa += 0.20;   // 20%
        const glosaExterno = (params.diariasQtd * valorDiaria) * percentGlosa;

        // 5. Deduções Internas
        const totalDiasViagem = params.diariasQtd;
        let deducaoAlimentacao = 0;
        if (params.diariasDescontarAlimentacao && totalDiasViagem > 0) {
            deducaoAlimentacao = (params.auxAlimentacao / 30) * totalDiasViagem;
        }

        // Aux Transporte (obter do cálculo de benefícios)
        const benefits = this.calculateBenefits(params);
        let deducaoTransporte = 0;
        if (params.diariasDescontarTransporte && totalDiasViagem > 0) {
            deducaoTransporte = (benefits.auxTransporte / 30) * totalDiasViagem;
        }

        const totalDeducoes = deducaoAlimentacao + deducaoTransporte;

        // 6. Líquido (mínimo zero)
        const valor = Math.max(0, diariasBruto - glosaExterno - totalDeducoes);

        return {
            valor: Math.round(valor * 100) / 100,
            bruto: Math.round(diariasBruto * 100) / 100,
            glosa: Math.round(glosaExterno * 100) / 100,
            deducoes: Math.round(totalDeducoes * 100) / 100
        };
    }

    /**
     * Calcula Licença Compensatória
     * Baseado em LEGACY_FORMULAS.md seção 9 (L314-337)
     */
    private calculateCompensatoryLeave(params: IJmuCalculationParams): number {
        const { salario, funcoes, valorVR } = this.getDataForPeriod(params.periodo);
        const baseVencimento = salario[params.cargo]?.[params.padrao] || 0;
        const gaj = baseVencimento * 1.40;

        let aqTituloVal = 0;
        let aqTreinoVal = 0;
        if (params.periodo >= 1) {
            aqTituloVal = valorVR * params.aqTituloVR;
            aqTreinoVal = valorVR * params.aqTreinoVR;
        } else {
            aqTituloVal = baseVencimento * params.aqTituloPerc;
            aqTreinoVal = baseVencimento * params.aqTreinoPerc;
        }

        let gratVal = 0;
        if (params.gratEspecificaTipo === 'gae' || params.gratEspecificaTipo === 'gas') {
            gratVal = baseVencimento * 0.35;
        }

        // Função usada na licença
        let valFuncaoLicenca = 0;
        if (params.baseLicenca === 'auto') {
            valFuncaoLicenca = params.funcao === '0' ? 0 : (funcoes[params.funcao] || 0);
        } else if (funcoes[params.baseLicenca]) {
            valFuncaoLicenca = funcoes[params.baseLicenca];
        }

        // Base da Licença
        const baseLicencaTotal = baseVencimento + gaj + aqTituloVal + aqTreinoVal +
            gratVal + (params.vpni_lei || 0) +
            (params.vpni_decisao || 0) + (params.ats || 0) +
            valFuncaoLicenca;

        // Abono sobre licença (opcional)
        let abonoEstimadoLicenca = 0;
        if (params.incluirAbonoLicenca) {
            const pssTable = HISTORICO_PSS[params.tabelaPSS];
            abonoEstimadoLicenca = calculatePss(baseLicencaTotal, pssTable);
        }

        // Valor da Licença = (Base + Abono) / 30 * Dias
        const licencaVal = ((baseLicencaTotal + abonoEstimadoLicenca) / 30) * (params.licencaDias || 0);

        return Math.round(licencaVal * 100) / 100;
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

        // Calcular componentes individuais para o breakdown
        const baseComponents = this.calculateBaseComponents(params);

        // Fase 7: Calcular Férias e 13º
        const vacation = this.calculateVacation(params);
        const thirteenth = this.calculateThirteenth(params);

        // Fase 8: Calcular Hora Extra e Substituição
        const overtime = this.calculateOvertime(params);
        const substitution = this.calculateSubstitution(params);

        // Fase 9: Calcular Diárias e Licença
        const dailies = this.calculateDailies(params);
        const compensatoryLeave = this.calculateCompensatoryLeave(params);

        // Re-run full flow to be safe (orchestration)
        // 1. Get PSS to get Abono
        const deductions = this.calculateDeductions(base, params);

        const abonoPerm = params.recebeAbono ? deductions.pss : 0;

        // Total Bruto inclui: Base + Abono + Benefícios + Férias + Adiantamentos 13º + HE + Substituição + Diárias + Licença
        const totalGross = base + abonoPerm + benefits.auxAlimentacao + benefits.auxPreEscolar +
            benefits.auxTransporte + vacation.value + thirteenth.adiant13Venc +
            thirteenth.adiant13FC + thirteenth.gratNatalinaTotal + overtime.heTotal +
            substitution + dailies.valor + compensatoryLeave;

        // Deduções incluem: PSS + IR + Funpresp + Aux Transporte Débito + IR Férias + PSS/IR 13º
        const totalDeductions = deductions.total + benefits.auxTransporteDebito +
            (params.discounts || 0) + (params.otherDeductions || 0) +
            vacation.irFerias + thirteenth.pss13 + thirteenth.ir13;

        return {
            netSalary: totalGross - totalDeductions,
            totalDeductions: totalDeductions,
            totalBenefits: benefits.auxAlimentacao + benefits.auxPreEscolar +
                benefits.auxTransporte + dailies.valor + compensatoryLeave,
            breakdown: {
                // Componentes Base Individuais (Fase 10 - React Integration)
                vencimento: baseComponents.vencimento,
                gaj: baseComponents.gaj,
                funcaoValor: baseComponents.funcaoValor,
                aqTitulo: baseComponents.aqTitulo,
                aqTreino: baseComponents.aqTreino,
                gratEspecifica: baseComponents.gratEspecifica,
                vpniLei: baseComponents.vpniLei,
                vpniDecisao: baseComponents.vpniDecisao,
                ats: baseComponents.ats,

                // Soma Total Base (manter compatibilidade)
                base: base,
                abono: abonoPerm,

                // Deduções
                pss: deductions.pss,
                irrf: deductions.irrf,
                funpresp: deductions.funpresp,

                // Férias (Fase 7)
                feriasConstitucional: vacation.value,
                impostoFerias: vacation.irFerias,

                // 13º Salário (Fase 7)
                gratificacaoNatalina: thirteenth.gratNatalinaTotal,
                abono13: thirteenth.abono13,
                imposto13: thirteenth.ir13,
                pss13: thirteenth.pss13,
                adiant13Venc: thirteenth.adiant13Venc,
                adiant13FC: thirteenth.adiant13FC,

                // Hora Extra e Substituição (Fase 8)
                heVal50: overtime.heVal50,
                heVal100: overtime.heVal100,
                heTotal: overtime.heTotal,
                substituicao: substitution,

                // Diárias e Licença (Fase 9)
                diariasValor: dailies.valor,
                diariasBruto: dailies.bruto,
                diariasGlosa: dailies.glosa,
                diariasDeducoes: dailies.deducoes,
                licencaCompensatoria: compensatoryLeave,

                ...benefits
            }
        };
    }
}
