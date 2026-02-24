/**
 * Interface de Parametros de Calculo - JMU
 *
 * Superset de ICalculationParams com campos especificos da JMU.
 */

import { ICalculationParams } from '../../types';
import { CourtConfig, Rubrica } from '../../../../types';

export interface IJmuCalculationParams extends ICalculationParams {
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
    funprespAliq: number;
    funprespFacul: number;
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
    substDias: Record<string, number>; // Mapa de funcao -> dias
    substIsEA: boolean;

    // Diarias e Licencas
    diariasQtd: number;
    diariasEmbarque: 'nenhum' | 'metade' | 'completo';
    diariasModoDesconto: 'periodo' | 'manual';
    diariasDataInicio: string;
    diariasDataFim: string;
    diariasDiasDescontoAlimentacao: number;
    diariasDiasDescontoTransporte: number;
    diariasExtHospedagem: boolean;
    diariasExtAlimentacao: boolean;
    diariasExtTransporte: boolean;
    diariasDescontarAlimentacao: boolean;
    diariasDescontarTransporte: boolean;
    licencaDias: number;
    baseLicenca: 'auto' | string;
    incluirAbonoLicenca: boolean;
    rubricasExtras?: Rubrica[];
}
