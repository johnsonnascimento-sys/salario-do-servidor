import React, { useEffect, useMemo, useState } from 'react';
import { JsonObject } from '../../types/admin';

interface JsonEditorProps {
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  className?: string;
}

export default function JsonEditor({ value, onChange, className }: JsonEditorProps) {
  const initialText = useMemo(() => JSON.stringify(value ?? {}, null, 2), [value]);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(initialText);
    setError(null);
  }, [initialText]);

  const handleChange = (next: string) => {
    setText(next);
    try {
      const parsed = JSON.parse(next);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setError('JSON deve ser um objeto valido.');
        return;
      }
      setError(null);
      onChange(parsed as JsonObject);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-2 text-body-xs text-error-600 font-bold bg-error-50 px-2 py-1 rounded border border-error-200">
          JSON invalido: {error}
        </div>
      )}
      <textarea
        rows={18}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className={className || 'font-mono text-body-xs w-full p-4 rounded-md border shadow-sm focus:ring-secondary-500 focus:border-secondary-500 border-gray-300 bg-gray-50'}
      />
    </div>
  );
}
