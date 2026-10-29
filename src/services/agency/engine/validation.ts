import type { IAgencyCalculationParams } from './types';

export class CalculationValidationError extends Error {
    constructor(public readonly field: string, message: string) {
        super(message);
        this.name = 'CalculationValidationError';
    }
}

export const assertNonNegativeFinite = (field: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        const prefix = field.startsWith('funpresp') || field.startsWith('pensionRetroEntries') ? 'Previdência: ' : '';
        throw new CalculationValidationError(field, `${prefix}valor inválido em ${field}: informe um número finito e não negativo.`);
    }
};

/** Signed pension adjustments are permitted, but must still be finite. */
export function validateCalculationParams(params: IAgencyCalculationParams): void {
    for (const [field, value] of Object.entries(params)) {
        if (field === 'agencyConfig' || field === 'pensionRetroEntries') continue;
        if (typeof value === 'number') assertNonNegativeFinite(field, value);
    }
    for (const [key, days] of Object.entries(params.substDias || {})) assertNonNegativeFinite(`substDias.${key}`, days);
    params.rubricasExtras?.forEach((entry, index) => assertNonNegativeFinite(`rubricasExtras.${index}.valor`, entry.valor));
    params.substitutionEntries?.forEach((entry, index) => {
        for (const [key, days] of Object.entries(entry.dias || {})) assertNonNegativeFinite(`substitutionEntries.${index}.dias.${key}`, days);
    });
    params.overtimeEntries?.forEach((entry, index) => {
        assertNonNegativeFinite(`overtimeEntries.${index}.qtd50`, entry.qtd50);
        assertNonNegativeFinite(`overtimeEntries.${index}.qtd100`, entry.qtd100);
        for (const [key, hours] of Object.entries(entry.horasPorFuncao || {})) {
            assertNonNegativeFinite(`overtimeEntries.${index}.horasPorFuncao.${key}.qtd50`, hours.qtd50);
            assertNonNegativeFinite(`overtimeEntries.${index}.horasPorFuncao.${key}.qtd100`, hours.qtd100);
        }
    });
    params.pensionRetroEntries?.forEach((entry, index) => {
        for (const [key, value] of Object.entries(entry)) {
            if (typeof value !== 'number') continue;
            if (key === 'ajusteRpps' || key === 'ajusteComplementar') {
                if (!Number.isFinite(value)) throw new CalculationValidationError(`pensionRetroEntries.${index}.${key}`, 'Previdência: ajuste deve ser um número finito.');
            } else assertNonNegativeFinite(`pensionRetroEntries.${index}.${key}`, value);
        }
    });
}

type ThirteenthInputs = Pick<IAgencyCalculationParams, 'manualAdiant13' | 'adiant13Venc' | 'adiant13FC' | 'segunda13Venc' | 'segunda13FC'>;

export function getThirteenthPendingFields(params: ThirteenthInputs): Array<'adiant13Venc' | 'adiant13FC'> {
    if (!params.manualAdiant13) return [];
    const pending: Array<'adiant13Venc' | 'adiant13FC'> = [];
    if (params.segunda13Venc > 0 && !(params.adiant13Venc > 0)) pending.push('adiant13Venc');
    if (params.segunda13FC > 0 && !(params.adiant13FC > 0)) pending.push('adiant13FC');
    return pending;
}

export function validateThirteenthInputs(params: ThirteenthInputs): void {
    for (const field of ['adiant13Venc', 'adiant13FC', 'segunda13Venc', 'segunda13FC'] as const) {
        assertNonNegativeFinite(field, params[field]);
    }
    const field = getThirteenthPendingFields(params)[0];
    if (field) throw new CalculationValidationError(field, `Informe a primeira parcela de ${field === 'adiant13Venc' ? 'vencimento' : 'FC/CJ'} antes de calcular a segunda parcela.`);
}
