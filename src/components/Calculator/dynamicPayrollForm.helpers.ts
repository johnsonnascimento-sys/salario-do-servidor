import { CalculatorState } from '../../types';
import { toReferenceMonthIndex } from './referenceDateUtils';

export type PredefinedRubricId =
    | 'aq'
    | 'gratificacao'
    | 'vantagens'
    | 'abono'
    | 'ferias'
    | 'decimo'
    | 'hora_extra'
    | 'substituicao'
    | 'licenca'
    | 'pre_escolar'
    | 'aux_transporte'
    | 'diarias';

export interface PresetGrossLine {
    label: string;
    value: number;
    isDiscount?: boolean;
}

export interface PresetInstance {
    key: string;
    presetId: PredefinedRubricId;
    overtimeEntryId?: string;
    substitutionEntryId?: string;
}

export const PREDEFINED_OPTIONS: Array<{ id: PredefinedRubricId; label: string }> = [
    { id: 'gratificacao', label: 'Gratificacao Especifica (GAE/GAS)' },
    { id: 'vantagens', label: 'Vantagens Pessoais' },
    { id: 'abono', label: 'Abono de Permanencia' },
    { id: 'ferias', label: 'Ferias' },
    { id: 'decimo', label: '13o Salario' },
    { id: 'hora_extra', label: 'Horas Extras' },
    { id: 'substituicao', label: 'Substituicao' },
    { id: 'licenca', label: 'Licenca Compensatoria' },
    { id: 'pre_escolar', label: 'Auxilio Pre-Escolar' },
    { id: 'aux_transporte', label: 'Auxilio Transporte' },
    { id: 'diarias', label: 'Diarias de Viagem' }
];

export const MULTI_INSTANCE_PRESETS = new Set<PredefinedRubricId>(['hora_extra', 'substituicao']);
export const MULTI_INSTANCE_HINT_LABEL = 'Horas Extras, Substituicao';
export const DEFAULT_PRESETS: PredefinedRubricId[] = [];

export const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const toPositiveNumber = (value: string) => {
    return Math.max(0, toNumber(value));
};

export const roundCurrency = (value: number) => Math.round(value * 100) / 100;
export const toPercentLabel = (value: number) => `${(value * 100).toFixed(1).replace('.', ',')}%`;
export const toDecimalRateFromPercentInput = (value: string) => Math.max(0, toNumber(value) / 100);

export const isStepAligned = (value: number, step: number) => {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return false;
    const ratio = value / step;
    return Math.abs(ratio - Math.round(ratio)) < 1e-9;
};

export const buildRateOptions = (min: number, max: number, step: number): number[] => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0 || max < min) {
        return [];
    }

    const options: number[] = [];
    const totalSteps = Math.floor((max - min) / step);
    for (let i = 0; i <= totalSteps; i += 1) {
        options.push(Number((min + (i * step)).toFixed(6)));
    }

    if (options.length === 0 || Math.abs(options[options.length - 1] - max) > 1e-9) {
        options.push(Number(max.toFixed(6)));
    }

    return options;
};

export const createUniqueId = (prefix: string) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const formatReferenciaMesAno = (mesRef: string, anoRef: number) => {
    const mes = toReferenceMonthIndex(mesRef) || 1;
    return `${String(mes).padStart(2, '0')}/${anoRef}`;
};

export const isDiscountLabel = (label: string) => /desconto|cota-parte|corte|abatimento|restitui|dedu[cç][aã]o|glosa/i.test(label);

export const getPresetPickerLabel = (presetId: PredefinedRubricId, label: string) => (
    MULTI_INSTANCE_PRESETS.has(presetId) ? `${label} (pode repetir)` : label
);

export const buildCardTaxSummary = (
    items: Array<{ label: string; value: number }>,
    totalLabel: string,
    irDiscount: number,
    pssDiscount: number
): PresetGrossLine[] => {
    const normalizedItems = items.map(item => ({
        label: item.label,
        value: roundCurrency(item.value || 0)
    }));
    const totalGross = roundCurrency(normalizedItems.reduce((acc, item) => acc + item.value, 0));
    const irVal = roundCurrency(Math.max(0, irDiscount || 0));
    const pssVal = roundCurrency(Math.max(0, pssDiscount || 0));
    const totalDiscounts = roundCurrency(irVal + pssVal);

    const grossLines: PresetGrossLine[] = normalizedItems.map(item => ({
        label: `${item.label} Bruto`,
        value: item.value
    }));

    let allocatedDiscount = 0;
    const netLines: PresetGrossLine[] = normalizedItems.map((item, index) => {
        const isLast = index === normalizedItems.length - 1;
        const proportion = totalGross > 0 ? item.value / totalGross : 0;
        const discountShare = isLast
            ? roundCurrency(Math.max(0, totalDiscounts - allocatedDiscount))
            : roundCurrency(totalDiscounts * proportion);
        allocatedDiscount += discountShare;
        return {
            label: `${item.label} Liquido`,
            value: roundCurrency(Math.max(0, item.value - discountShare))
        };
    });

    const totalNet = roundCurrency(Math.max(0, totalGross - totalDiscounts));
    const lines: PresetGrossLine[] = [
        ...grossLines,
        { label: `Desconto IR (${totalLabel})`, value: irVal, isDiscount: true },
        { label: `Desconto PSS (${totalLabel})`, value: pssVal, isDiscount: true },
        ...netLines
    ];

    if (normalizedItems.length > 1) {
        lines.push(
            { label: `${totalLabel} Bruto`, value: totalGross },
            { label: `${totalLabel} Liquido`, value: totalNet }
        );
    }

    return lines;
};

export const hasPresetValue = (presetId: PredefinedRubricId, state: CalculatorState) => {
    switch (presetId) {
        case 'aq':
            return state.aqTituloPerc > 0 || state.aqTreinoPerc > 0 || state.aqTituloVR > 0 || state.aqTreinoVR > 0;
        case 'gratificacao':
            return state.gratEspecificaTipo !== '0' || state.gratEspecificaValor > 0;
        case 'vantagens':
            return state.vpni_lei > 0 || state.vpni_decisao > 0 || state.ats > 0;
        case 'abono':
            return state.recebeAbono;
        case 'ferias':
            return state.manualFerias || state.ferias1_3 > 0 || state.feriasAntecipadas;
        case 'decimo':
            return (
                state.manualAdiant13 ||
                state.adiant13Venc > 0 ||
                state.adiant13FC > 0 ||
                state.segunda13Venc > 0 ||
                state.segunda13FC > 0
            );
        case 'hora_extra':
            return (
                state.heQtd50 > 0 ||
                state.heQtd100 > 0 ||
                state.heIsEA ||
                state.heExcluirIR ||
                state.overtimeEntries.some(entry =>
                    entry.qtd50 > 0 ||
                    entry.qtd100 > 0 ||
                    entry.isEA ||
                    entry.excluirIR ||
                    entry.usarSubstituicaoFuncao ||
                    Object.values(entry.horasPorFuncao || {}).some(horas =>
                        Number(horas?.qtd50 || 0) > 0 || Number(horas?.qtd100 || 0) > 0
                    )
                )
            );
        case 'substituicao':
            return (
                Object.values(state.substDias).some(days => days > 0) ||
                state.substIsEA ||
                state.substPssIsEA ||
                state.substitutionEntries.some(entry =>
                    entry.isEA ||
                    entry.excluirIR ||
                    entry.pssIsEA ||
                    Object.values(entry.dias || {}).some(days => Number(days) > 0)
                )
            );
        case 'licenca':
            return state.licencaDias > 0;
        case 'pre_escolar':
            return state.auxPreEscolarQtd > 0;
        case 'aux_transporte':
            return state.auxTransporteGasto > 0;
        case 'diarias':
            return state.diariasQtd > 0 || state.diariasEmbarque !== 'nenhum';
        default:
            return false;
    }
};
