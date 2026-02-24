import { CalculatorState, CourtConfig } from '../../../types';
import { IJmuCalculationParams } from '../implementations/jmu/types';

/**
 * Adaptador: Converte estado React para parâmetros do JmuService
 * 
 * @param state - Estado completo da calculadora React
 * @param orgSlug - Slug da agência (pju, jmu, stm)
 * @returns Parâmetros formatados para o JmuService
 */
export function mapStateToJmuParams(
    state: CalculatorState,
    orgSlug: string = 'jmu',
    agencyConfig?: CourtConfig
): IJmuCalculationParams {
    return {
        // Base (ICalculationParams)
        grossSalary: 0, // Ignorado pelo JMU (calcula de cargo/padrao)
        dependents: state.dependentes,
        discounts: state.emprestimos + state.planoSaude + state.pensao,
        otherDeductions: 0,
        rubricasExtras: state.rubricasExtras,

        // Agency Slug
        orgSlug: orgSlug,
        agencyConfig,

        // Core Params
        periodo: state.periodo,
        cargo: state.cargo,
        padrao: state.padrao,
        funcao: state.funcao,

        // AQ
        aqTituloPerc: state.aqTituloPerc,
        aqTreinoPerc: state.aqTreinoPerc,
        aqTituloVR: state.aqTituloVR,
        aqTreinoVR: state.aqTreinoVR,

        // Renda Fixa
        recebeAbono: state.recebeAbono,
        gratEspecificaTipo: state.gratEspecificaTipo,
        gratEspecificaValor: state.gratEspecificaValor || 0,
        vpni_lei: state.vpni_lei,
        vpni_decisao: state.vpni_decisao,
        ats: state.ats,

        // Deduções e Regime
        regimePrev: state.regimePrev,
        tabelaPSS: state.tabelaPSS,
        tabelaIR: state.tabelaIR,
        pssSobreFC: state.pssSobreFC,
        incidirPSSGrat: state.incidirPSSGrat,
        funprespAliq: state.funprespAliq,
        funprespFacul: state.funprespFacul,

        // Benefícios
        auxAlimentacao: state.auxAlimentacao,
        auxPreEscolarQtd: state.auxPreEscolarQtd,
        auxTransporteGasto: state.auxTransporteGasto,
        cotaPreEscolar: state.cotaPreEscolar,

        // Férias e 13º (Fase 7)
        tipoCalculo: state.tipoCalculo,
        manualFerias: state.manualFerias,
        ferias1_3: state.ferias1_3,
        feriasAntecipadas: state.feriasAntecipadas,
        feriasDesc: state.feriasDesc,
        feriasDescManual: state.feriasDescManual,
        manualAdiant13: state.manualAdiant13,
        adiant13Venc: state.adiant13Venc,
        adiant13FC: state.adiant13FC,
        segunda13Venc: state.segunda13Venc,
        segunda13FC: state.segunda13FC,

        // Hora Extra e Substituição (Fase 8)
        heQtd50: state.heQtd50 || 0,
        heQtd100: state.heQtd100 || 0,
        heIsEA: state.heIsEA,
        hePssIsEA: false,
        substDias: state.substDias,
        substIsEA: state.substIsEA,
        substPssIsEA: state.substPssIsEA,

        // Diárias e Licença (Fase 9)
        diariasQtd: state.diariasQtd || 0,
        diariasEmbarque: mapDiariasEmbarque(state.diariasEmbarque),
        diariasModoDesconto: state.diariasModoDesconto,
        diariasDataInicio: state.diariasDataInicio,
        diariasDataFim: state.diariasDataFim,
        diariasDiasDescontoAlimentacao: state.diariasDiasDescontoAlimentacao,
        diariasDiasDescontoTransporte: state.diariasDiasDescontoTransporte,
        diariasExtHospedagem: state.diariasExtHospedagem,
        diariasExtAlimentacao: state.diariasExtAlimentacao,
        diariasExtTransporte: state.diariasExtTransporte,
        diariasDescontarAlimentacao: state.diariasDescontarAlimentacao,
        diariasDescontarTransporte: state.diariasDescontarTransporte,
        licencaDias: state.licencaDias || 0,
        baseLicenca: state.baseLicenca,
        incluirAbonoLicenca: state.incluirAbonoLicenca,
    };
}

/**
 * Helper: Mapeia valores de diariasEmbarque do state para o formato do Service
 */
function mapDiariasEmbarque(value: string): 'nenhum' | 'metade' | 'completo' {
    if (value === 'metade') return 'metade';
    if (value === 'completo') return 'completo';
    return 'nenhum'; // Default safe
}
