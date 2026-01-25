/**
 * Interface de Parâmetros de Cálculo - JMU
 * 
 * Superset de ICalculationParams com campos específicos da JMU
 */

import { ICalculationParams } from '../../types';
import { CourtConfig } from '../../../../types';

export interface IJmuCalculationParams extends ICalculationParams {
    orgSlug: string; // Agency slug (pju, jmu, stm) for fetching correct config
    agencyConfig?: CourtConfig;
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
    cotaPreEscolar?: number;
    auxTransporteGasto: number;

    // Férias e 13º
    tipoCalculo: 'comum' | 'jan' | 'jun' | 'nov';
    manualFerias: boolean;
    ferias1_3: number;
    feriasAntecipadas: boolean;
    manualAdiant13: boolean;
    adiant13Venc: number;
    adiant13FC: number;
    tabelaIR: string;

    // Hora Extra e Substituição
    heQtd50: number;
    heQtd100: number;
    substDias: Record<string, number>; // Mapa de função -> dias

    // Diárias e Licenças
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
