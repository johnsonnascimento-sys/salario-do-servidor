import type { CourtConfig } from '../../../../types';
import type { PensionUrpReference } from '../../../../types/pension';

type Resolution = { reference: PensionUrpReference; error?: never } | { reference?: never; error: string };
const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const month = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Shared by form guidance and calculation; never substitutes a neighbouring month's URP. */
export const resolvePensionUrp = (
    config: CourtConfig['previdenciaComplementar'], competence: string, start: string,
): Resolution => {
    if (!month.test(competence)) return { error: 'competência da folha inválida para apuração da URP.' };
    if (!month.test(start) || start > competence) {
        return { error: 'informe o início da participação vinculada (inscrição ou eleição da base), anterior ou igual à competência.' };
    }
    const competencia = start.slice(0, 4) === competence.slice(0, 4) ? start : `${Number(competence.slice(0, 4)) - 1}-11`;
    const valor = config?.urpByCompetence?.[competencia];
    const fonte = config?.urpSourcesByCompetence?.[competencia];
    if (!Number.isFinite(valor) || !(valor! > 0) || (typeof fonte !== 'string' || !fonte.trim())) {
        return { error: `modalidade vinculada exige URP e fonte oficial da competência ${competencia}; parâmetro ausente ou inválido.` };
    }
    const unidadesMinimas = config?.minimumUrpUnits;
    if (!Number.isFinite(unidadesMinimas) || !(unidadesMinimas! > 0)) {
        return { error: 'quantidade mínima de URPs ausente ou inválida na configuração.' };
    }
    const minimo = Math.round((valor! * unidadesMinimas! + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(minimo) || minimo <= 0) return { error: 'mínimo em URP inválido na configuração.' };
    return { reference: { competencia, valor: valor!, fonte: fonte!.trim(), unidadesMinimas: unidadesMinimas!, minimo } };
};

export const validateLinkedPensionSalary = (value: number | undefined, reference: PensionUrpReference, maximum?: number): string | null => {
    if (!Number.isFinite(value) || value! < 0) return 'remuneração de participação deve ser um número não negativo.';
    if (value! < reference.minimo) return `remuneração de participação inferior ao mínimo de ${currency(reference.minimo)} (${reference.unidadesMinimas} URPs; referência ${reference.competencia}).`;
    if (maximum !== undefined && Number.isFinite(maximum) && value! > maximum) {
        return `remuneração de participação não pode exceder a remuneração integral elegível de ${currency(maximum)}.`;
    }
    return null;
};
