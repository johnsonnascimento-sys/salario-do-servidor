/** A draft cannot be finalized while its pension assessment is unresolved. */
export class PensionCalculationPendingError extends Error {
    readonly code = 'PENSION_CALCULATION_PENDING';
    readonly rubricaIds: string[];

    constructor(rubricaIds: string[], message = 'Apuração pendente: a Funpresp das rubricas por competência original ainda não foi vinculada à apuração histórica. Revise essas rubricas antes de concluir o holerite.') {
        super(message);
        this.name = 'PensionCalculationPendingError';
        this.rubricaIds = [...rubricaIds];
    }
}
