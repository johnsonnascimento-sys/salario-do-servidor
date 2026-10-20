import React, { useId } from 'react';
import type { PensionParticipation } from '../../types/pension';
import { PENSION_HELP_CLASS, PENSION_PARTICIPATION_HELP } from './pensionHelp';

export const PensionParticipationSelect: React.FC<{
    value: PensionParticipation;
    onChange: (value: PensionParticipation) => void;
    className?: string;
    label?: string;
    labelClassName?: string;
    sponsoredDisabled?: boolean;
}> = ({ value, onChange, className, label = 'Participação no plano', labelClassName, sponsoredDisabled = false }) => {
    const id = useId();
    const helpId = `${id}-help`;
    return <div>
        <label htmlFor={id} className={labelClassName}>{label}</label>
        <select id={id} aria-describedby={helpId} className={className} value={value}
            onChange={event => onChange(event.target.value as PensionParticipation)}>
            <option value="nao">Não participa</option>
            <option value="patrocinado" disabled={sponsoredDisabled}>Patrocinada — com contrapartida{sponsoredDisabled ? ' (exige RPPS com teto)' : ''}</option>
            <option value="vinculado">Vinculada — sem contrapartida</option>
        </select>
        <p id={helpId} className={PENSION_HELP_CLASS}>{PENSION_PARTICIPATION_HELP[value]}</p>
    </div>;
};
