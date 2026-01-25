/**
 * Button Component - Componente de Botão Reutilizável
 * 
 * Segue o DESIGN_SYSTEM.md com variantes e tamanhos padronizados
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}) => {
    const baseClasses = 'font-display font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses: Record<ButtonVariant, string> = {
        primary: 'bg-gradient-to-r from-secondary to-primary text-white hover:shadow-lg hover:shadow-secondary/25',
        secondary: 'bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white hover:border-primary',
        ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
        danger: 'bg-error-500 text-white hover:bg-error-600 hover:shadow-lg hover:shadow-error-500/25'
    };

    const sizeClasses: Record<ButtonSize, string> = {
        sm: 'px-3 py-1.5 text-body rounded-lg',
        md: 'px-4 py-2 text-body-lg rounded-xl',
        lg: 'px-6 py-3 text-body-xl rounded-xl'
    };

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
