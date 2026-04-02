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
    <div className={styles.innerBox}>
        <h4 className={styles.innerBoxTitle}>Adicional de Qualificacao</h4>
        {renderPreset(AQ_INSTANCE)}
        <PresetGrossSummary lines={getPresetGrossLines(AQ_INSTANCE)} />
    </div>
);
