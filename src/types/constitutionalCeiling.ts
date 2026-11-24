export interface ConstitutionalCeilingVersion {
    valid_from: string;
    valid_to: string | null;
    amount: number;
    source: string;
}

export interface ConstitutionalCeilingReference {
    versions: ConstitutionalCeilingVersion[];
}
