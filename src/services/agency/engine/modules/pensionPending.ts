import type { IAgencyCalculationParams } from '../types';

/** A draft cannot be finalized while its historical complementary contribution is unknown. */
export class PensionCalculationPendingError extends Error {
    readonly code = 'PENSION_CALCULATION_PENDING';
    readonly rubricaIds: string[];

    constructor(rubricaIds: string[]) {
        super('Apuração pendente: a Funpresp das rubricas por competência original ainda não foi vinculada à apuração histórica. Revise essas rubricas antes de concluir o holerite.');
        this.name = 'PensionCalculationPendingError';
        this.rubricaIds = [...rubricaIds];
    }
}

export const assertPensionRubricsReady = (
    params: Pick<IAgencyCalculationParams, 'rubricasExtras'>,
): void => {
    const pending = (params.rubricasExtras || []).filter(rubrica =>
        rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada &&
        Number.isFinite(Number(rubrica.valor)) && Number(rubrica.valor) > 0,
    );
    // Existing unlinked adjustments cannot establish which rubric or competence they cover.
    // This check deliberately does not use the participant's current regime or modality.
    if (pending.length > 0) throw new PensionCalculationPendingError(pending.map(rubrica => rubrica.id));
};
