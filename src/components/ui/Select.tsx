/**
 * Select Component - Componente de Select Reutilizável
 * 
 * Segue o DESIGN_SYSTEM.md com estilos padronizados
 */

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options?: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({
    label,
    error,
    helperText,
    options,
    className = '',
    id,
    children,
    ...props
}) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={selectId}
                    className="block text-body-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1.5"
                >
                    {label}
                </label>
            )}
            <select
                id={selectId}
                className={`
                    w-full bg-white dark:bg-neutral-800 
                    border ${error ? 'border-error-500' : 'border-neutral-200 dark:border-neutral-700'}
                    rounded-xl py-3 px-4 
                    text-neutral-900 dark:text-white 
                    focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent 
                    transition-all
                    ${className}
                `}
                {...props}
            >
                {options ? (
                    options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))
                ) : (
                    children
                )}
            </select>
            {error && (
                <p className="mt-1 text-body text-error-500">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-body text-neutral-500 dark:text-neutral-400">{helperText}</p>
            )}
        </div>
    );
};
