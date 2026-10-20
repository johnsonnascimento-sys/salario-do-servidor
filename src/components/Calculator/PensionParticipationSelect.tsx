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
    allowed?: PensionParticipation[];
    unavailableReasons?: Partial<Record<PensionParticipation, string>>;
    disabled?: boolean;
}> = ({ value, onChange, className, label = 'Participação no plano', labelClassName, sponsoredDisabled = false,
    allowed, unavailableReasons, disabled = false }) => {
    const id = useId();
    const helpId = `${id}-help`;
    return <div data-pension-selection-field tabIndex={-1} role="group" aria-labelledby={`${id}-label`}>
        <label id={`${id}-label`} htmlFor={id} className={labelClassName}>{label}</label>
        <select id={id} aria-describedby={helpId} className={className} value={value} disabled={disabled}
            onChange={event => {
                const next = event.target.value as PensionParticipation;
                if (disabled || (allowed && !allowed.includes(next)) || (next === 'patrocinado' && sponsoredDisabled)) return;
                event.currentTarget?.focus?.();
                if (['nao', 'patrocinado', 'vinculado'].includes(next)) onChange(next);
            }}>
            <option value="nao" disabled={allowed && !allowed.includes('nao')}>Não participa</option>
            <option value="patrocinado" disabled={sponsoredDisabled || (allowed && !allowed.includes('patrocinado'))}>Patrocinada — com contrapartida</option>
            <option value="vinculado" disabled={allowed && !allowed.includes('vinculado')}>Vinculada — sem contrapartida</option>
        </select>
        <p id={helpId} className={PENSION_HELP_CLASS}>{PENSION_PARTICIPATION_HELP[value]}</p>
        {unavailableReasons && Object.entries(unavailableReasons).map(([key, reason]) => <p key={key} className={PENSION_HELP_CLASS}>
            {key === 'patrocinado' ? 'Patrocinada indisponível' : 'Vinculada indisponível'}: {reason}
        </p>)}
    </div>;
};
