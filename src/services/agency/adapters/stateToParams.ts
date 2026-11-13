import { CalculatorState, CourtConfig } from '../../../types';
import { IAgencyCalculationParams } from '../engine/types';

/**
 * Adaptador: Converte estado React para parâmetros do motor de cálculo da agência.
 * 
 * @param state - Estado completo da calculadora React
 * @param orgSlug - Slug da agência (pju, jmu, stm)
 * @returns Parâmetros formatados para o motor de cálculo da agência.
 */
export function mapStateToAgencyParams(
    state: CalculatorState,
    orgSlug: string = 'jmu',
    agencyConfig?: CourtConfig
): IAgencyCalculationParams {
    const competencia = `${state.anoRef}-${String(['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'].indexOf(state.mesRef.toUpperCase()) + 1).padStart(2, '0')}`;
    return {
        // Base (ICalculationParams)
        grossSalary: 0, // Ignorado pelo JMU (calcula de cargo/padrao)
        dependents: state.dependentes,
        // The header is the receipt month for this single-payroll simulation.
        irEaContext: {
            ...state.irEaContext,
            mesPagamento: competencia,
            deduzirDependentes: state.irEaContext?.deduzirDependentes ?? (state.dependentes > 0 ? true : false)
        },
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
        funprespParticipacao: state.funprespParticipacao,
        funprespAliq: state.funprespAliq,
        funprespFacul: state.funprespFacul,
        funprespRevisarOpcoes: state.funprespRevisarOpcoes,
        funprespBaseIntegral: state.funprespBaseIntegral,
        funprespVinculadaInicio: state.funprespVinculadaInicio,
        funprespIncluirFC: state.funprespIncluirFC,
        funprespIncluirGAS: state.funprespIncluirGAS,
        funprespIncluirGAE: state.funprespIncluirGAE,
        funprespIncluirAQTreino: state.funprespIncluirAQTreino,
        funprespFaculValor: state.funprespFaculValor,
        funprespFaculForma: state.funprespFaculForma,
        pensionRetroEntries: state.pensionRetroEntries,
        competencia,

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
        feriasIncideVencimento: state.feriasIncideVencimento !== false,
        feriasIncideGAJ: state.feriasIncideGAJ !== false,
        feriasIncideFuncao: state.feriasIncideFuncao !== false,
        feriasIncideAQTitulo: state.feriasIncideAQTitulo !== false,
        feriasIncideAQTreino: state.feriasIncideAQTreino !== false,
        feriasIncideATS: state.feriasIncideATS !== false,
        feriasIncideVPNI: state.feriasIncideVPNI !== false,
        feriasIncideAbono: state.feriasIncideAbono !== false,
        feriasIncideGrat: state.feriasIncideGrat !== false,
        feriasOutrasParcelas: state.feriasOutrasParcelas || 0,
        feriasRubricasInclusas: state.feriasRubricasInclusas || {},
        manualAdiant13: state.manualAdiant13,
        adiant13Venc: state.adiant13Venc,
        adiant13FC: state.adiant13FC,
        segunda13Venc: state.segunda13Venc,
        segunda13FC: state.segunda13FC,
        decimoIncideVencimento: state.decimoIncideVencimento !== false,
        decimoIncideGAJ: state.decimoIncideGAJ !== false,
        decimoIncideFuncao: state.decimoIncideFuncao !== false,
        decimoIncideAQTitulo: state.decimoIncideAQTitulo !== false,
        decimoIncideAQTreino: state.decimoIncideAQTreino !== false,
        decimoIncideATS: state.decimoIncideATS !== false,
        decimoIncideVPNI: state.decimoIncideVPNI !== false,
        decimoIncideAbono: state.decimoIncideAbono !== false,
        decimoIncideGrat: state.decimoIncideGrat !== false,
        decimoOutrasParcelas: state.decimoOutrasParcelas || 0,
        decimoRubricasInclusas: state.decimoRubricasInclusas || {},

        // Hora Extra e Substituição (Fase 8)
        heQtd50: state.heQtd50 || 0,
        heQtd100: state.heQtd100 || 0,
        heIsEA: state.heIsEA,
        hePssIsEA: false,
        heExcluirIR: state.heExcluirIR,
        overtimeEntries: state.overtimeEntries,
        substitutionEntries: state.substitutionEntries,
        substDias: state.substDias,
        substIsEA: state.substIsEA,
        substPssIsEA: state.substPssIsEA,

        // Diárias e Licença (Fase 9)
        diariasQtd: state.diariasQtd || 0,
        diariasEmbarque: mapDiariasEmbarque(state.diariasEmbarque),
        diariasTrechosTransporte: state.diariasTrechosTransporte || [],
        diariasModoDesconto: state.diariasModoDesconto,
        diariasDataInicio: state.diariasDataInicio,
        diariasDataFim: state.diariasDataFim,
        diariasFeriados: state.diariasFeriados || [],
        diariasDiasDescontoAlimentacao: state.diariasDiasDescontoAlimentacao,
        diariasDiasDescontoTransporte: state.diariasDiasDescontoTransporte,
        diariasExtHospedagem: state.diariasExtHospedagem,
        diariasExtAlimentacao: state.diariasExtAlimentacao,
        diariasExtTransporte: state.diariasExtTransporte,
        diariasDescontarAlimentacao: state.diariasDescontarAlimentacao,
        diariasDescontarTransporte: state.diariasDescontarTransporte,
        diariasAssessoramentoMagistrado: Boolean(state.diariasAssessoramentoMagistrado),
        diariasAcompanhamentoIntegral: Boolean(state.diariasAcompanhamentoIntegral),
        diariasAutoridadeAssistida: (orgSlug === 'jmu' || orgSlug === 'stm')
            ? (state.diariasAutoridadeAssistida === 'juiz_federal' || state.diariasAutoridadeAssistida === 'juiz_militar' ? 'juiz_federal' : 'ministro_stm')
            : (state.diariasAutoridadeAssistida === 'ministro_cjf' || state.diariasAutoridadeAssistida === 'ministro_stm' ? 'ministro_cjf' : state.diariasAutoridadeAssistida === 'juiz_federal' || state.diariasAutoridadeAssistida === 'juiz_militar' ? 'juiz_federal' : 'desembargador_trf'),
        diariasEquipeTrabalho: Boolean(state.diariasEquipeTrabalho),
        diariasEquipeTrabalhoMaiorCargo: state.diariasEquipeTrabalhoMaiorCargo,
        licencaDias: Math.max(0, Math.floor(Number(state.licencaDias) || 0)),
        transporteIndenizacaoAtivo: state.transporteIndenizacaoAtivo === true,
        transporteIndenizacaoDias: state.transporteIndenizacaoDias ?? 0,
        baseLicenca: state.baseLicenca,
        incluirAbonoLicenca: state.incluirAbonoLicenca,
        // GAACTA (Resolução STM nº 397/2026)
        gaactaAtivo: Boolean(state.gaactaAtivo),
        gaactaValor: state.gaactaValor || 0,
        gaactaPercentual: state.gaactaPercentual || 0,
        gaactaRecesso: Boolean(state.gaactaRecesso),
        gaactaIncideVencimento: state.gaactaIncideVencimento !== false,
        gaactaIncideGAJ: state.gaactaIncideGAJ !== false,
        gaactaIncideFuncao: state.gaactaIncideFuncao !== false,
        gaactaIncideAQTitulo: state.gaactaIncideAQTitulo !== false,
        gaactaIncideAQTreino: state.gaactaIncideAQTreino !== false,
        gaactaIncideATS: state.gaactaIncideATS !== false,
        gaactaIncideVPNI: state.gaactaIncideVPNI !== false,
        gaactaIncideAbono: state.gaactaIncideAbono !== false,
        gaactaIncideGrat: Boolean(state.gaactaIncideGrat),
        gaactaOutrasParcelas: state.gaactaOutrasParcelas || 0,
        gaactaManualBase: Boolean(state.gaactaManualBase),
        gaactaBaseManualValor: state.gaactaBaseManualValor || 0,
        gaactaRubricasInclusas: state.gaactaRubricasInclusas || {},
        abonoPermanencia: state.abonoPermanencia || 0,
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
