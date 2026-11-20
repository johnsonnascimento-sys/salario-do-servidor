import type { CourtConfig } from '../../types';
import { CALCULATOR_SECTIONS, CALCULATOR_STEP } from './calculatorSections';
import { PRESET_CATALOG, type PredefinedRubricId } from './dynamicPayrollForm.helpers';

export type CalculatorSearchDestination =
    | { kind: 'step'; step: number }
    | { kind: 'element'; step: number; elementId: string }
    | { kind: 'preset'; step: number; presetId: PredefinedRubricId };

export type PresetSearchDestination = Extract<CalculatorSearchDestination, { kind: 'preset' }>;

interface SearchEntry {
    id: string;
    label: string;
    aliases: string[];
    destination: CalculatorSearchDestination;
}

const normalizeSearch = (value: string) => value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();

const sectionAliases: Record<number, string[]> = {
    [CALCULATOR_STEP.qualification]: ['AQ', 'títulos', 'treinamento', 'AQ títulos', 'AQ treinamento'],
    [CALCULATOR_STEP.incomeTax]: ['IR', 'IRRF'],
    [CALCULATOR_STEP.notes]: ['anotações'],
    [CALCULATOR_STEP.result]: ['holerite', 'contracheque', 'resultado da simulação']
};

const element = (step: number, elementId: string, label: string, aliases: string[] = []): SearchEntry => ({
    id: elementId, label, aliases, destination: { kind: 'element', step, elementId }
});

const fixedEntries = [
    element(CALCULATOR_STEP.competence, 'competencia', 'Mês e ano da folha', ['mês', 'ano', 'referência', 'enquadramento normativo']),
    element(CALCULATOR_STEP.basic, 'dados-principais', 'Dados principais', ['cargo', 'classe', 'padrão', 'FC/CJ', 'função', 'PSS sobre FC/CJ', 'vencimento básico', 'GAJ']),
    element(CALCULATOR_STEP.basic, 'gaacta-licenca', 'GAACTA / Licença Compensatória', ['GAACTA', 'licença compensatória']),
    element(CALCULATOR_STEP.basic, 'gratificacao-especifica', 'Gratificação específica (GAE / GAS)', ['GAE', 'GAS']),
    element(CALCULATOR_STEP.personalAdvantages, 'vantagem-vpni', 'VPNI', ['vantagem pessoal nominalmente identificada']),
    element(CALCULATOR_STEP.personalAdvantages, 'vantagem-ats', 'ATS', ['adicional por tempo de serviço', 'anuênio']),
    element(CALCULATOR_STEP.benefits, 'aux-transporte-fixed', 'Auxílio-transporte'),
    element(CALCULATOR_STEP.benefits, 'pre-escolar-fixed', 'Auxílio pré-escolar', ['creche', 'auxílio creche']),
    element(CALCULATOR_STEP.benefits, 'aux-alimentacao-fixed', 'Auxílio-alimentação', ['alimentação', 'vale alimentação']),
    element(CALCULATOR_STEP.pension, 'regime-previdenciario', 'Regime previdenciário', ['RPPS', 'PSS', 'previdência']),
    element(CALCULATOR_STEP.pension, 'abono-permanencia', 'Abono de permanência', ['abono']),
    element(CALCULATOR_STEP.pension, 'funpresp-settings', 'Funpresp-Jud', ['Funpresp', 'previdência complementar']),
    element(CALCULATOR_STEP.incomeTax, 'dependentes-ir', 'Dependentes para IR', ['dependentes', 'dedução por dependente'])
];

export const buildCalculatorSearchIndex = (config: Pick<CourtConfig, 'previdenciaComplementar' | 'transportIndemnity'>): SearchEntry[] => {
    const sections = CALCULATOR_SECTIONS.map(({ label }, step): SearchEntry => ({
        id: `step-${step}`, label, aliases: sectionAliases[step] ?? [], destination: { kind: 'step', step }
    }));
    const presets = PRESET_CATALOG.filter(item => item.id !== 'indenizacao_transporte' || config.transportIndemnity?.enabled)
        .map(({ id, label, description, tags, category }): SearchEntry => ({
            id, label, aliases: [description, ...tags], destination: { kind: 'preset', step: category === 'descontos' ? CALCULATOR_STEP.discounts : CALCULATOR_STEP.credits, presetId: id }
        }));
    return [...sections, ...fixedEntries.filter(entry => entry.id !== 'funpresp-settings' || config.previdenciaComplementar?.enabled), ...presets];
};

export const searchCalculator = (entries: SearchEntry[], input: string) => {
    const query = normalizeSearch(input);
    if (!query) return [];
    const queryWords = query.split(' ');

    return entries.flatMap(entry => {
        const label = normalizeSearch(entry.label);
        const aliases = entry.aliases.map(normalizeSearch);
        if (label === query || aliases.includes(query)) return [{ entry, rank: 0 }];
        if (label.startsWith(query)) return [{ entry, rank: 1 }];
        const matches = [label, ...aliases].some(text => {
            const words = text.split(' ');
            return queryWords.every(queryWord => words.some(word => word.startsWith(queryWord)));
        });
        return matches ? [{ entry, rank: 2 }] : [];
    }).sort((a, b) => a.rank - b.rank || a.entry.destination.step - b.entry.destination.step)
        .map(({ entry }) => entry);
};
