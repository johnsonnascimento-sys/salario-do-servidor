import React from 'react';
import { PresetGrossSummary } from './PresetGrossSummary';
import { PresetGrossLine, PresetInstance } from './dynamicPayrollForm.helpers';

interface DynamicPayrollAQSectionProps {
    styles: Record<string, string>;
    renderPreset: (instance: PresetInstance) => React.ReactNode;
    getPresetGrossLines: (instance: PresetInstance) => PresetGrossLine[];
}

const AQ_INSTANCE: PresetInstance = { key: 'aq-fixed', presetId: 'aq' };

export const DynamicPayrollAQSection: React.FC<DynamicPayrollAQSectionProps> = ({
    styles,
    renderPreset,
    getPresetGrossLines
}) => (
    <div className={styles.card}>
        <div className="flex flex-wrap items-center gap-2 mb-2">
            <h4 className={`${styles.innerBoxTitle} !mb-0`}>Adicional de Qualificação (AQ)</h4>
            <a href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm" target="_blank" rel="noopener noreferrer" className="text-body-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded hover:underline">Lei nº 11.416/2006, arts. 14 e 15 · Lei nº 15.292/2025</a>
        </div>
        <p className="mb-3 text-body text-neutral-600 dark:text-neutral-300">O AQ reconhece conhecimentos adicionais obtidos em títulos, cursos e ações de capacitação em áreas de interesse do órgão. Na regra anterior, títulos e treinamento eram calculados em percentuais do vencimento básico. Com a Lei nº 15.292/2025, o cálculo passou a usar múltiplos do Valor de Referência (VR), inclusive para conjuntos de horas de capacitação.</p>
        <p className="mb-3 text-body text-neutral-600 dark:text-neutral-300">O VR é a base monetária fixada no Anexo X da Lei nº 11.416/2006, correspondente a 6,5% do valor integral da CJ-1. O reconhecimento e a implementação do adicional observam as condições legais e a regulamentação do órgão.</p>
        <p className="mb-3 text-body text-neutral-600 dark:text-neutral-300">Selecione os títulos reconhecidos e a carga de treinamento registrada para esta competência.</p>
        {renderPreset(AQ_INSTANCE)}
        <div className="mt-4"><PresetGrossSummary lines={getPresetGrossLines(AQ_INSTANCE)} /></div>
    </div>
);
