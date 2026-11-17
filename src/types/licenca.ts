export type LicencaBaseComponent = 'vencimento' | 'gaj' | 'funcao' | 'aqTitulo' | 'aqTreino' | 'gratificacao' | 'vpni' | 'ats';

export interface LicencaComposicaoBase {
    parcelas?: Partial<Record<LicencaBaseComponent, boolean>>;
    rubricas?: Record<string, boolean>;
}
