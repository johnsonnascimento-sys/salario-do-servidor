import React from 'react';
import { configurationToday, validateConfigVersionDate } from '../../services/admin/configVersionValidation';

export default function ConfigVersionDateField({ previous, value, onChange }: {
  previous: { valid_from: string; valid_to: string | null };
  value: string;
  onChange: (value: string) => void;
}) {
  const error = validateConfigVersionDate(previous, value);
  return <div className="mb-4">
    <label className="block text-body font-medium">
      Início da nova versão
      <input type="date" value={value} max={configurationToday()} required
        onChange={event => onChange(event.target.value)} aria-invalid={Boolean(error)}
        className="block rounded-md border border-gray-300 p-2 mt-1" />
    </label>
    <p className="text-body-xs mt-1">A versão anterior será preservada e encerrada no dia anterior à nova vigência.</p>
    {error && <p role="alert" className="text-body-xs text-error-600 mt-1">{error}</p>}
  </div>;
}
