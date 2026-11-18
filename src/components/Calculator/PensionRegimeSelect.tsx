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
    disabled?: boolean;
    compact?: boolean;
}> = ({ value, onChange, className, label = 'Regime previdenciário', labelClassName, disabled = false, compact = false }) => {
    const id = useId();
    const helpId = `${id}-help`;
    return <div data-pension-selection-field tabIndex={-1} role="group" aria-labelledby={`${id}-label`}>
        <label id={`${id}-label`} htmlFor={id} className={labelClassName}>{label}</label>
        <select id={id} aria-describedby={compact ? undefined : helpId} className={className} value={pensionRegimeGroup(value)} disabled={disabled}
            onChange={event => {
                if (disabled) return;
                event.currentTarget?.focus?.();
                onChange(selectPensionRegime(value, event.target.value));
            }}>
            <option value="antigo">{compact ? 'Sem limite do teto do INSS' : 'RPPS sem teto do RGPS'}</option>
            <option value="rpc">{compact ? 'Limitada ao teto do INSS' : 'RPPS limitado ao teto do RGPS'}</option>
        </select>
        {!compact && <p id={helpId} className={PENSION_HELP_CLASS}>{PENSION_REGIME_HELP[pensionRegimeGroup(value)]}</p>}
    </div>;
};
