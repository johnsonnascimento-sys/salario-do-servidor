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
    | 'gaacta'
    | 'pre_escolar'
    | 'aux_transporte'
    | 'diarias'
    | 'indenizacao_transporte'
    | 'pensao';

export interface PresetGrossLine {
    label: string;
    value: number;
    isDiscount?: boolean;
    displayValue?: string;
    cardAmount?: 'gross' | 'net' | 'discount';
}

export interface PresetInstance {
    key: string;
    presetId: PredefinedRubricId;
    overtimeEntryId?: string;
    substitutionEntryId?: string;
}

export const PREDEFINED_OPTIONS: Array<{ id: PredefinedRubricId; label: string }> = [
    { id: 'decimo', label: '13o Salario' },
    { id: 'abono', label: 'Abono de Permanencia' },
    { id: 'diarias', label: 'Diarias de Viagem' },
    { id: 'ferias', label: 'Ferias' },
    { id: 'gratificacao', label: 'Gratificacao Especifica (GAE/GAS)' },
    { id: 'gaacta', label: 'Gratificação por Atividades de Alta Complexidade (GAACTA)' },
    { id: 'hora_extra', label: 'Horas Extras' },
    { id: 'indenizacao_transporte', label: 'Indenização de Transporte' },
    { id: 'licenca', label: 'Licenca Compensatoria' },
    { id: 'pensao', label: 'Pensão Alimentícia' },
    { id: 'substituicao', label: 'Substituicao' }
];

export const MULTI_INSTANCE_PRESETS = new Set<string>(['hora_extra', 'substituicao']);
export const DEFAULT_PRESETS: PredefinedRubricId[] = [];

export interface PresetCatalogItem {
    id: PredefinedRubricId;
    label: string;
    description: string;
    category: 'trabalho' | 'direitos' | 'indenizacoes' | 'descontos';
    tags: string[];
}

export const PRESET_CATEGORIES = [
    {
        id: 'trabalho',
        title: 'Trabalho'
    },
    {
        id: 'direitos',
        title: 'Férias e 13º'
    },
    {
        id: 'indenizacoes',
        title: 'Indenizações e viagens'
    },
    { id: 'descontos', title: 'Descontos' }
] as const;

export const PRESET_CATALOG: PresetCatalogItem[] = [
    {
        id: 'hora_extra',
        label: 'Horas extras',
        description: 'Serviço extraordinário',
        category: 'trabalho',
        tags: ['hora extra', 'he', 'jornada', 'divisor', '50%', '100%']
    },
    {
        id: 'substituicao',
        label: 'Substituição de Função',
        description: 'Exercício temporário em cargo ou função',
        category: 'trabalho',
        tags: ['substituicao', 'funcao de confianca', 'cargo em comissao', 'titular', 'dias', 'fc', 'cj']
    },
    {
        id: 'ferias',
        label: 'Férias',
        description: 'Terço constitucional e antecipações',
        category: 'direitos',
        tags: ['ferias', '1/3', 'terco', 'constitucional', 'antecipadas']
    },
    {
        id: 'decimo',
        label: '13º salário',
        description: 'Gratificação natalina',
        category: 'direitos',
        tags: ['13', 'decimo', 'terceiro', 'natalina', 'adiantamento', 'segunda']
    },
    {
        id: 'diarias',
        label: 'Diárias de Viagem',
        description: 'Pagamento separado do holerite',
        category: 'indenizacoes',
        tags: ['diarias', 'viagem', 'embarque', 'transporte', 'deslocamento', 'equipe']
    },
    {
        id: 'indenizacao_transporte',
        label: 'Indenização de Transporte',
        description: 'Diligências externas',
        category: 'indenizacoes',
        tags: ['indenizacao', 'transporte', 'oficial de justica', 'mandados', 'diligencias', 'jmu', 'cjf']
    },
    {
        id: 'pensao',
        label: 'Pensão Alimentícia',
        description: 'Percentual ou valor fixo',
        category: 'descontos',
        tags: ['pensao', 'alimenticia', 'alimentos', 'judicial', 'desconto', '%', 'fixo']
    }
];

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
            return false;
        case 'abono':
            return state.recebeAbono;
        case 'gaacta':
            return Boolean(state.gaactaAtivo);
        case 'ferias':
            return state.tipoCalculo === 'jan' || state.manualFerias || state.ferias1_3 > 0 || state.feriasAntecipadas;
        case 'decimo':
            if (state.thirteenthPayroll) return ['jan', 'jun', 'nov'].includes(state.tipoCalculo) || state.thirteenthPayroll.firstSelected || state.thirteenthPayroll.secondSelected;
            return (
                ['jan', 'jun', 'nov'].includes(state.tipoCalculo) ||
                state.segunda13ModoVenc === 'automatico' || state.segunda13ModoVenc === 'manual' ||
                state.segunda13ModoFC === 'automatico' || state.segunda13ModoFC === 'manual' ||
                state.manualAdiant13 ||
                state.adiant13Venc > 0 ||
                state.adiant13FC > 0 ||
                state.segunda13Venc > 0 ||
                state.segunda13FC > 0
            );
        case 'hora_extra':
            return (
                state.overtimeEntries.length > 0 ||
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
                state.substitutionEntries.length > 0 ||
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
        case 'indenizacao_transporte':
            return Boolean(state.transporteIndenizacaoAtivo);
        case 'diarias':
            // No modo por datas, a quantidade é derivada pelo motor e pode
            // permanecer zerada na entrada salva. Mesmo uma data incompleta
            // precisa continuar visível para o usuário concluir a viagem.
            return state.diariasQtd > 0 || state.diariasEmbarque !== 'nenhum' ||
                Boolean(state.diariasDataInicio || state.diariasDataFim) ||
                (Array.isArray(state.diariasTrechosTransporte) && state.diariasTrechosTransporte.length > 0);
        case 'pensao':
            return Boolean(state.pensaoAlimenticiaAtiva || (state.pensao && state.pensao > 0));
        default:
            return false;
    }
};
