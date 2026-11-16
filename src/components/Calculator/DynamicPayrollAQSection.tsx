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
            <details className="relative">
                <summary aria-label="Sobre o Adicional de Qualificação" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 dark:text-neutral-300 dark:hover:bg-neutral-700"><span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold">i</span></summary>
                <div className="absolute left-0 top-full z-20 mt-1 w-72 max-w-[min(18rem,80vw)] rounded-xl border border-neutral-200 bg-white p-4 text-body-xs text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    <p>O AQ reconhece títulos e ações de capacitação em áreas de interesse do órgão. A regra anterior utiliza percentuais do vencimento básico; a Lei nº 15.292/2025 utiliza múltiplos do Valor de Referência (VR).</p>
                    <p className="mt-2">O VR corresponde a 6,5% do valor integral da CJ-1. O reconhecimento e a implementação observam as condições legais e a regulamentação do órgão.</p>
                </div>
            </details>
            <a href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm" target="_blank" rel="noopener noreferrer" className="text-body-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded hover:underline">Lei nº 11.416/2006, arts. 14 e 15 · Lei nº 15.292/2025</a>
        </div>
        <p className="mb-3 text-body text-neutral-600 dark:text-neutral-300">Selecione os títulos reconhecidos e a carga de treinamento registrada para esta competência.</p>
        {renderPreset(AQ_INSTANCE)}
        <div className="mt-2"><PresetGrossSummary compact lines={getPresetGrossLines(AQ_INSTANCE)} /></div>
    </div>
);
