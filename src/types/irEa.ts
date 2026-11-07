/** Context and audit memory for one paying agency and one receipt month. */
export interface IrEaDocumentedAdjustment {
    valor: number;
    descricao: string;
    fundamento: string;
}

export interface IrEaContext {
    mesPagamento?: string;
    mesesRraInformados?: number;
    referenciaMeses?: string;
    ajustesBaseDocumentados?: IrEaDocumentedAdjustment[];
    deduzirDependentes?: boolean;
}

export interface IrTableMetadata {
    validFrom: string;
    validTo?: string;
    reference: string;
    rra: {
        reductionApplicable: boolean;
        deductDependents: boolean;
        deductComplementaryPension: boolean;
        reduction?: {
            status: 'verified' | 'pending';
            mode?: 'total';
            verifiedMonths?: number[];
            exemptIncome: number;
            partialIncome: number;
            maxReduction: number;
            intercept: number;
            slope: number;
            reference: string;
        };
    };
}

export interface IrEaMemory {
    status: 'ready' | 'none';
    mesPagamento: string;
    competencias: string[];
    meses: number;
    tabela: string;
    baseBruta: number;
    deducoes: number;
    baseCalculo: number;
    impostoAntesReducao: number;
    reducao: number;
    imposto: number;
    ajustesBaseDocumentados?: IrEaDocumentedAdjustment[];
    dependentesDeduzidos?: number;
    dependentesValor?: number;
    avisos: string[];
}

export interface CalculatedOvertimeEntry {
    id: string;
    heVal50: number;
    heVal100: number;
    heTotal: number;
    isEA: boolean;
    excluirIR: boolean;
}

export interface CalculatedSubstitutionEntry {
    id: string;
    total: number;
    isEA: boolean;
    excluirIR: boolean;
    pssIsEA: boolean;
}
