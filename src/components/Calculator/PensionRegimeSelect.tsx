import React, { useId } from 'react';
import type { CalculatorState } from '../../types';
import { PENSION_HELP_CLASS, PENSION_REGIME_HELP } from './pensionHelp';

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
    label?: string;
    labelClassName?: string;
}> = ({ value, onChange, className, label = 'Regime previdenciário', labelClassName }) => {
    const id = useId();
    const helpId = `${id}-help`;
    return <div>
        <label htmlFor={id} className={labelClassName}>{label}</label>
        <select id={id} aria-describedby={helpId} className={className} value={pensionRegimeGroup(value)}
            onChange={event => onChange(selectPensionRegime(value, event.target.value))}>
            <option value="antigo">RPPS sem teto do RGPS</option>
            <option value="rpc">RPPS limitado ao teto do RGPS</option>
        </select>
        <p id={helpId} className={PENSION_HELP_CLASS}>{PENSION_REGIME_HELP[pensionRegimeGroup(value)]}</p>
    </div>;
};
