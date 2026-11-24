import type { Rubrica } from '../../../../types';
import type { IAgencyCalculationParams } from '../types';
import { getEffectiveBasicSalary } from './baseCalculations';

type AtsContext = Pick<IAgencyCalculationParams, 'periodo' | 'cargo' | 'padrao' | 'agencyConfig' | 'commissionProfile'>;

const usesAtsPercentage = (rubrica: Rubrica) =>
    rubrica.tipo === 'C' && rubrica.vantagemPessoal === 'ATS' && rubrica.atsPercentual !== undefined;

export function getAtsCalculationContext({ agencyConfig, periodo, cargo, padrao }: AtsContext) {
    const limit = agencyConfig?.payrollRules?.atsPercentageLimit;
    return {
        limit: typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? limit : undefined,
        basicSalary: agencyConfig?.payrollRules ? getEffectiveBasicSalary(periodo, agencyConfig, cargo, padrao) : undefined
    };
}

export function calculateAtsPercentage(percentual: number, { limit, basicSalary }: ReturnType<typeof getAtsCalculationContext>) {
    if (limit === undefined) return { error: 'O limite percentual de ATS não está configurado para este órgão.' };
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > limit) {
        return { error: `Informe um percentual de ATS entre 0% e ${limit.toLocaleString('pt-BR')}%.` };
    }
    if (basicSalary === undefined || !Number.isFinite(basicSalary) || basicSalary <= 0) {
        return { error: 'Selecione uma competência, um cargo e um padrão com vencimento básico disponível para calcular o ATS.' };
    }
    const cents = basicSalary * percentual;
    // Compensa a imprecisão binária em produtos que caem exatamente no meio centavo.
    return { amount: Math.round(cents + Number.EPSILON * cents) / 100 };
}

export function resolveAtsRubrics(rubricas: Rubrica[], context: AtsContext) {
    if (context.commissionProfile) return { rubricas: rubricas.filter(rubrica => !rubrica.vantagemPessoal) };
    if (!rubricas.some(usesAtsPercentage)) return { rubricas };

    const calculationContext = getAtsCalculationContext(context);
    let error: string | undefined;
    const resolved = rubricas.map(rubrica => {
        if (!usesAtsPercentage(rubrica)) return rubrica;
        const result = calculateAtsPercentage(rubrica.atsPercentual!, calculationContext);
        error ??= result.error;
        return {
            ...rubrica,
            valor: result.amount ?? 0,
            pensionOptionAmountConfirmed: result.amount !== undefined &&
                rubrica.pensionOptionAmountConfirmed === true && rubrica.pensionOptionConfirmedValue === result.amount
        };
    });
    return { rubricas: resolved, error };
}
