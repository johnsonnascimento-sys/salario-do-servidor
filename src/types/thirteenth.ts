export interface ThirteenthEntry {
    id: string;
    target: string;
    description: string;
    amount: number;
    origin?: 'legacy';
}

export interface ThirteenthPayrollInput {
    version: 1;
    firstSelected: boolean;
    secondSelected: boolean;
    firstMode: 'automatico' | 'informado';
    secondMode: 'automatico' | 'manual';
    advances: ThirteenthEntry[];
    secondEntries: ThirteenthEntry[];
}

export interface ThirteenthReferenceItem {
    id: string;
    label: string;
    amount: number;
}

export interface ThirteenthReference {
    components: ThirteenthReferenceItem[];
    groups: ThirteenthReferenceItem[];
    referenceTotal: number;
    cargoTotal: number;
    functionTotal: number;
}

export interface ThirteenthCalculationMemory extends ThirteenthReference {
    version: 1;
    firstSelected: boolean;
    secondSelected: boolean;
    firstMode: ThirteenthPayrollInput['firstMode'];
    secondMode: ThirteenthPayrollInput['secondMode'];
    advances: ThirteenthEntry[];
    secondEntries: ThirteenthEntry[];
    firstTotal: number;
    secondTotal: number;
}
