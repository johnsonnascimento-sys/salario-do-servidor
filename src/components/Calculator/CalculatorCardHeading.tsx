import React, { useId, useRef, useState } from 'react';
import { Info, Trash2 } from 'lucide-react';

interface CalculatorCardHeadingProps {
    children: React.ReactNode;
    help?: { label: string; content: React.ReactNode };
    remove?: { label: string; onClick: () => void };
}

const actionClass = 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 dark:text-neutral-300 dark:hover:bg-neutral-700';

export function CalculatorCardHeading({ children, help, remove }: CalculatorCardHeadingProps) {
    const [helpOpen, setHelpOpen] = useState(false);
    const helpId = useId();
    const helpButton = useRef<HTMLButtonElement>(null);

    return (
        <div onKeyDown={event => {
            if (event.key === 'Escape' && helpOpen) {
                event.stopPropagation();
                setHelpOpen(false);
                helpButton.current?.focus();
            }
        }}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 self-center [overflow-wrap:anywhere]">{children}</div>
                {(help || remove) && <div className="flex shrink-0 items-start gap-1">
                    {help && <button type="button" ref={helpButton} className={actionClass}
                        id={`${helpId}-trigger`} aria-label={help.label} aria-expanded={helpOpen} aria-controls={helpId}
                        onClick={() => setHelpOpen(open => !open)}>
                        <Info className="h-5 w-5" aria-hidden="true" />
                    </button>}
                    {remove && <button type="button" className={`${actionClass} hover:text-error-700 dark:hover:text-error-300`}
                        aria-label={remove.label} title="Remover da simulação" onClick={remove.onClick}>
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>}
                </div>}
            </div>
            {help && <div id={helpId} hidden={!helpOpen} role="note" aria-labelledby={`${helpId}-trigger`}
                className="mt-2 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-body-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {helpOpen && help.content}
            </div>}
        </div>
    );
}
