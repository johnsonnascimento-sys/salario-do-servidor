import React from 'react';

interface AdPlaceholderProps {
    format: 'horizontal' | 'rectangle' | 'vertical' | 'in-feed';
    label?: string;
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ format, label }) => {
    const formatStyles = {
        horizontal: 'w-full h-24 md:h-28',
        rectangle: 'w-72 h-64',
        vertical: 'w-40 h-96',
        'in-feed': 'w-full h-32',
    };

    const formatLabels = {
        horizontal: 'Banner 728x90',
        rectangle: 'Retângulo 300x250',
        vertical: 'Arranha-céu 160x600',
        'in-feed': 'Anúncio In-Feed',
    };

    return (
        <div
            className={`${formatStyles[format]} bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-900/30 dark:to-warning-800/30 border-2 border-dashed border-warning-400 dark:border-warning-600 rounded-lg flex flex-col items-center justify-center gap-2 text-warning-700 dark:text-warning-400`}
        >
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-body uppercase tracking-wide">Anúncio</span>
            </div>
            <span className="text-body-xs opacity-75">{label || formatLabels[format]}</span>
            <span className="text-label opacity-50">Simulação AdSense</span>
        </div>
    );
};

export default AdPlaceholder;
