/** Auditable pension inputs. Monetary amounts are BRL; rates are decimal. */
export type PensionParticipation = 'nao' | 'patrocinado' | 'vinculado';

/** Classification validated against the catalog applicable to this competence. */
export interface PensionRubricAssessment {
    rubricaId: string;
    ruleId: string;
    classification: 'obrigatoria' | 'facultativa' | 'excluida' | 'pendente';
    source: string;
    competencia: string;
    optionDate?: string;
    optionReference?: string;
    optionAmountConfirmed?: boolean;
}

export interface PensionRetroLink {
    rubricaId: string;
    valor: number;
}

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
    /** Presence identifies the linked flow; legacy standalone adjustments omit this field. */
    vinculos?: PensionRetroLink[];
    regraHistoricaId?: string;
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
    enquadramentos?: PensionRubricAssessment[];
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
    regraHistoricaId?: string;
    fonteHistorica?: string;
    teto?: number;
    baseRppsDevida?: number;
    baseComplementarDevida?: number;
    enquadramentos?: PensionRubricAssessment[];
}

export interface PensionMemory {
    mensal: PensionCalculationMemory;
    thirteenth?: PensionCalculationMemory;
    retroativos: PensionRetroMemory[];
}
