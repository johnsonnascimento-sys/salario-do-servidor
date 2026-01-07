import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccordionProps {
    title: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    className?: string; // Wrapper classes (bg, border, etc)
    headerClassName?: string; // Header specific classes
    contentClassName?: string; // Content specific classes
    alwaysOpen?: boolean; // If true, acts as a static card
}

export function Accordion({
    title,
    children,
    defaultOpen = false,
    className = "",
    headerClassName = "",
    contentClassName = "",
    alwaysOpen = false
}: AccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen || alwaysOpen);

    const toggle = () => {
        if (!alwaysOpen) setIsOpen(!isOpen);
    };

    return (
        <div className={`overflow-hidden transition-all duration-200 ${className}`}>
            <div
                onClick={toggle}
                className={`flex justify-between items-center cursor-pointer select-none ${headerClassName}`}
            >
                <div className="flex-1">
                    {title}
                </div>
                {!alwaysOpen && (
                    <div className="ml-2 text-gray-500">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                )}
            </div>

            {/* Content */}
            {(isOpen || alwaysOpen) && (
                <div className={`animate-in slide-in-from-top-2 duration-200 ${contentClassName}`}>
                    {children}
                </div>
            )}
        </div>
    );
}
