import React from 'react';
import type { CalculatorState } from '../../types';

type PensionRegime = CalculatorState['regimePrev'];

// Presentation aliases only. Persisted regime codes remain backwards compatible.
export const pensionRegimeGroup = (regime: PensionRegime): 'antigo' | 'rpc' =>
    regime === 'migrado' || regime === 'rpc' ? 'rpc' : 'antigo';

export const selectPensionRegime = (current: PensionRegime, group: string): PensionRegime => {
    if (group !== 'antigo' && group !== 'rpc') return current;
    return pensionRegimeGroup(current) === group ? current : group;
};

export const PensionRegimeSelect: React.FC<{
    value: PensionRegime;
    onChange: (value: PensionRegime) => void;
    className?: string;
}> = ({ value, onChange, className }) => (
    <select className={className} value={pensionRegimeGroup(value)}
        onChange={event => onChange(selectPensionRegime(value, event.target.value))}>
        <option value="antigo">RPPS sem teto do RGPS</option>
        <option value="rpc">RPPS limitado ao teto do RGPS</option>
    </select>
);
