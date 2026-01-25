/**
 * Card Component - Componente de Card Reutilizável
 * 
 * Segue o DESIGN_SYSTEM.md com estilos padronizados
 */

import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> & {
    Header: React.FC<CardHeaderProps>;
    Content: React.FC<CardContentProps>;
} = ({ children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-card ${className}`}>
            {children}
        </div>
    );
};

Card.Header = ({ children, className = '' }) => {
    return (
        <div className={`p-6 border-b border-neutral-200 dark:border-neutral-700 ${className}`}>
            {children}
        </div>
    );
};

Card.Content = ({ children, className = '' }) => {
    return (
        <div className={`p-6 ${className}`}>
            {children}
        </div>
    );
};
