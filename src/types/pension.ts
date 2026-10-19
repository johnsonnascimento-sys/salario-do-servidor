/** Auditable pension inputs. Monetary amounts are BRL; rates are decimal. */
export type PensionParticipation = 'nao' | 'patrocinado' | 'vinculado';

export interface PensionRetroEntry {
    id: string;
    competencia: string;
    modo?: 'completo' | 'manual';
    tipo?: 'mensal' | '13';
    destinoIR?: 'mensal' | 'ea' | '13';
    tabelaPSS?: string;
    regimePrev?: 'antigo' | 'migrado' | 'novo_antigo' | 'rpc';
    participacao?: PensionParticipation;
    baseRppsOriginal?: number;
    baseRppsDevida?: number;
    baseComplementarOriginal?: number;
    baseComplementarDevida?: number;
    contribuicaoRppsRecolhida?: number;
    contribuicaoComplementarRecolhida?: number;
    aliquotaNormal?: number;
    aliquotaFacultativa?: number;
    salarioParticipacaoVinculado?: number;
    inicioVinculado?: string;
    ajusteRpps?: number;
    ajusteComplementar?: number;
    justificativa?: string;
}

export interface PensionCalculationMemory {
    competencia: string;
    tipo: 'mensal' | '13';
    participacao: PensionParticipation;
    teto: number;
    baseRppsIntegral: number;
    baseRpps: number;
    baseComplementarIntegral: number;
    baseComplementar: number;
    aliquotaNormal: number;
    aliquotaFacultativa: number;
    normal: number;
    facultativa: number;
    facultativaExterna: number;
    aporteFolha: number;
    aporteExterno: number;
    patrocinador: number;
    descontoFolha: number;
    dedutivelIRFolha: number;
    deducaoSujeitaLimiteAnual: number;
    componentes: Record<string, number>;
    avisos?: string[];
}

export interface PensionRetroMemory {
    id: string;
    competencia: string;
    modo: 'completo' | 'manual';
    tipo: 'mensal' | '13';
    rpps: number;
    destinoIR: 'mensal' | 'ea' | '13';
    complementar: number;
    justificativa?: string;
    entrada?: PensionRetroEntry;
}

export interface PensionMemory {
    mensal: PensionCalculationMemory;
    thirteenth?: PensionCalculationMemory;
    retroativos: PensionRetroMemory[];
}
