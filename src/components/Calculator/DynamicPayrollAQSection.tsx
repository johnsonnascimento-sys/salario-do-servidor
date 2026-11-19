import { CalculatorCardHeading } from './CalculatorCardHeading';
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
        <CalculatorCardHeading help={{ label: "Sobre o Adicional de Qualificação", content: <>
            <p>O AQ reconhece títulos e ações de capacitação em áreas de interesse do órgão. A regra anterior utiliza percentuais do vencimento básico; a Lei nº 15.292/2025 utiliza múltiplos do Valor de Referência (VR).</p>
            <p className="mt-2">O VR corresponde a 6,5% do valor integral da CJ-1. O reconhecimento e a implementação observam as condições legais e a regulamentação do órgão.</p>
            <p className="mt-2"><a href="https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11416.htm" target="_blank" rel="noopener noreferrer" className="font-medium underline">Lei nº 11.416/2006, arts. 14 e 15 · Lei nº 15.292/2025</a></p>
        </> }}>
            <span className="text-body-sm font-semibold">Critérios e valor de referência</span>
        </CalculatorCardHeading>
        {renderPreset(AQ_INSTANCE)}
        <div className="mt-2"><PresetGrossSummary compact lines={getPresetGrossLines(AQ_INSTANCE)} /></div>
    </div>
);
