import React from 'react';

interface AdPlaceholderProps {
    format: 'horizontal' | 'rectangle' | 'vertical' | 'in-feed';
    label?: string;
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ format, label }) => {
    const formatStyles = {
        horizontal: 'w-full h-24 md:h-28',
        rectangle: 'w-[300px] h-[250px]',
        vertical: 'w-[160px] h-[600px]',
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
            className={`${formatStyles[format]} bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 border-2 border-dashed border-amber-400 dark:border-amber-600 rounded-lg flex flex-col items-center justify-center gap-2 text-amber-700 dark:text-amber-400`}
        >
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
                </svg>
                <span className="font-bold text-sm uppercase tracking-wide">Anúncio</span>
            </div>
            <span className="text-xs opacity-75">{label || formatLabels[format]}</span>
            <span className="text-[10px] opacity-50">Simulação AdSense</span>
        </div>
    );
};

export default AdPlaceholder;
