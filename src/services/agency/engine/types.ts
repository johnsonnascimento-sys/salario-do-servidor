import type { IrEaContext } from '../../../types/irEa';
/**
 * Interface de Parametros de Calculo da Agencia
 *
 * Superset de ICalculationParams com campos da implementacao atual da agencia.
 */

import { ICalculationParams } from '../types';
import { CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../../types';
import type { PensionParticipation, PensionRetroEntry } from '../../../types/pension';

export interface IAgencyCalculationParams extends ICalculationParams {
    irEaContext?: IrEaContext;
    heCompetenciasEA?: string[];
    substCompetenciasEA?: string[];
    orgSlug: string; // Agency slug (pju, jmu, stm) for fetching correct config
    agencyConfig?: CourtConfig;
    periodo: number;
    cargo: string;
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
    tabelaPSS: string;
    pssSobreFC: boolean;
    incidirPSSGrat: boolean;
    funprespParticipacao: PensionParticipation;
    funprespAliq: number;
    funprespFacul: number;
    competencia?: string;
    funprespBaseIntegral?: number;
    funprespVinculadaInicio?: string;
    funprespRevisarOpcoes?: boolean;
    funprespIncluirFC?: boolean;
    funprespIncluirGAS?: boolean;
    funprespIncluirGAE?: boolean;
    funprespIncluirAQTreino?: boolean;
    funprespFaculValor?: number;
    funprespFaculForma?: 'folha' | 'externo';
    pensionRetroEntries?: PensionRetroEntry[];
    auxAlimentacao: number;
    auxPreEscolarQtd: number;
    cotaPreEscolar?: number;
    auxTransporteGasto: number;

    // Ferias e 13o
    tipoCalculo: 'comum' | 'jan' | 'jun' | 'nov';
    manualFerias: boolean;
    ferias1_3: number;
    feriasAntecipadas: boolean;
    feriasDesc: number;
    feriasDescManual: boolean;
    manualAdiant13: boolean;
    adiant13Venc: number;
    adiant13FC: number;
    segunda13Venc: number;
    segunda13FC: number;
    tabelaIR: string;

    // Hora Extra e Substituicao
    heQtd50: number;
    heQtd100: number;
    heIsEA: boolean;
    hePssIsEA: boolean;
    heExcluirIR: boolean;
    overtimeEntries?: OvertimeEntry[];
    substitutionEntries?: SubstitutionEntry[];
    substDias: Record<string, number>; // Mapa de funcao -> dias
    substIsEA: boolean;
    substPssIsEA: boolean;

    // Diarias e Licencas
    diariasQtd: number;
    diariasEmbarque: 'nenhum' | 'metade' | 'completo';
    diariasTrechosTransporte?: string[];
    diariasModoDesconto: 'periodo' | 'manual';
    diariasDataInicio: string;
    diariasDataFim: string;
    diariasFeriados?: string[];
    diariasDiasDescontoAlimentacao: number;
    diariasDiasDescontoTransporte: number;
    diariasExtHospedagem: boolean;
    diariasExtAlimentacao: boolean;
    diariasExtTransporte: boolean;
    diariasDescontarAlimentacao: boolean;
    diariasDescontarTransporte: boolean;
    diariasAssessoramentoMagistrado?: boolean;
    diariasAcompanhamentoIntegral?: boolean;
    diariasAutoridadeAssistida?: 'ministro_cjf' | 'ministro_stm' | 'desembargador_trf' | 'juiz_federal' | 'juiz_militar';
    diariasEquipeTrabalho?: boolean;
    diariasEquipeTrabalhoMaiorCargo?: string;
    licencaDias: number;
    baseLicenca: 'auto' | string;
    incluirAbonoLicenca: boolean;
    rubricasExtras?: Rubrica[];
    // GAACTA (Resolução STM nº 397/2026)
    gaactaAtivo?: boolean;
    gaactaValor?: number;
    gaactaPercentual?: number;
    gaactaRecesso?: boolean;
    gaactaIncideVencimento?: boolean;
    gaactaIncideGAJ?: boolean;
    gaactaIncideFuncao?: boolean;
    gaactaIncideAQTitulo?: boolean;
    gaactaIncideAQTreino?: boolean;
    gaactaIncideATS?: boolean;
    gaactaIncideVPNI?: boolean;
    gaactaIncideAbono?: boolean;
    gaactaIncideGrat?: boolean;
    gaactaOutrasParcelas?: number;
    gaactaManualBase?: boolean;
    gaactaBaseManualValor?: number;
    gaactaRubricasInclusas?: Record<string, boolean>;
    abonoPermanencia?: number;
    calculatedPss?: number;
}
