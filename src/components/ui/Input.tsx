/**
 * Input Component - Componente de Input Reutilizável
 * 
 * Segue o DESIGN_SYSTEM.md com estilos padronizados
 */

import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    className = '',
    id,
    ...props
}) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-body-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1.5"
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`
                    w-full bg-white dark:bg-neutral-800 
                    border ${error ? 'border-error-500' : 'border-neutral-200 dark:border-neutral-700'}
                    rounded-xl py-3 px-4 
                    text-neutral-900 dark:text-white 
                    placeholder-neutral-400 
                    focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent 
                    transition-all
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-body text-error-500">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-body text-neutral-500 dark:text-neutral-400">{helperText}</p>
            )}
        </div>
    );
};
