import React, { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
    title: React.ReactNode;
    summary?: React.ReactNode;
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    expandWhen?: boolean;
    children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({
    title, summary, defaultOpen = false, open, onOpenChange, expandWhen = false, children,
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen || expandWhen);
    const id = useId();
    const expanded = open ?? isOpen;

    useEffect(() => {
        if (expandWhen) {
            setIsOpen(true);
            onOpenChange?.(true);
        }
    }, [expandWhen, onOpenChange]);

    const toggle = () => {
        setIsOpen(!expanded);
        onOpenChange?.(!expanded);
    };

    return (
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-800">
            <button
                type="button"
                id={`${id}-trigger`}
                aria-expanded={expanded}
                aria-controls={`${id}-content`}
                onClick={toggle}
                className="w-full min-h-11 px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700 focus-visible:outline-offset-[-2px]"
            >
                <span className="min-w-0">
                    <span className="block text-body font-semibold text-neutral-800 dark:text-neutral-100">{title}</span>
                    {summary && <span className="mt-1 block text-body text-neutral-600 dark:text-neutral-300 break-words">{summary}</span>}
                </span>
                <ChevronDown aria-hidden="true" className={`w-5 h-5 shrink-0 text-neutral-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <div
                id={`${id}-content`}
                aria-labelledby={`${id}-trigger`}
                hidden={!expanded}
                className="px-4 py-4 border-t border-neutral-200 dark:border-neutral-700"
            >
                {children}
            </div>
        </div>
    );
};
