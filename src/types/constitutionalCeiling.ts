export interface ConstitutionalCeilingVersion {
    valid_from: string;
    valid_to: string | null;
    amount: number;
    source: string;
}

export interface ConstitutionalCeilingReference {
    versions: ConstitutionalCeilingVersion[];
}

export type AbateTetoRubricKind = 'monthly' | 'excluded' | 'separate';

interface AbateTetoPeriod {
    valid_from: string;
    valid_to: string | null;
}

export interface AbateTetoRuleVersion extends AbateTetoPeriod {
    rubrics: Record<string, { kind: AbateTetoRubricKind; provision: string }>;
    source: string;
}

export interface AbateTetoRules {
    versions: AbateTetoRuleVersion[];
}

export interface AbateTetoActivation {
    versions: Array<AbateTetoPeriod & { enabled: boolean }>;
}

export interface AbateTetoCompositionItem {
    code: string;
    label: string;
    amount: number;
    kind: AbateTetoRubricKind;
    provision: string;
    selected: boolean;
    defaultSelected: boolean;
}

export interface AbateTetoMemory {
    status: 'ready' | 'pending' | 'out_of_scope';
    competence: string;
    reason?: string;
    limit?: number;
    amount: number;
    components?: Array<{ code: string; label: string; amount: number; kind: AbateTetoRubricKind; provision: string }>;
    composicaoBase?: AbateTetoCompositionItem[];
    isCustomized?: boolean;
    monthlyGross?: number;
    irBefore?: number;
    irAfter?: number;
    rppsBefore?: number;
    rppsAfter?: number;
    source?: string;
}
