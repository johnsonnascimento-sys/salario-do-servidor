import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
    title: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ title, defaultOpen = false, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 dark:bg-transparent dark:hover:bg-neutral-700/50 transition-colors"
            >
                <h4 className="text-body font-bold text-neutral-700 dark:text-neutral-300">
                    {title}
                </h4>
                <ChevronDown
                    className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>
            {isOpen && (
                <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
                    {children}
                </div>
            )}
        </div>
    );
};
