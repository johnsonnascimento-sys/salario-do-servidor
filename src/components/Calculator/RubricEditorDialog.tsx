import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import type { CalculatorCardHelp } from './CalculatorCardHeading';
import { useCalculatorTargetFocus } from './hooks/useCalculatorTargetFocus';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface RubricEditorControls {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
}

interface RubricEditorDialogProps {
    id: string;
    cardId: string;
    title: string;
    discount?: boolean;
    help?: CalculatorCardHelp;
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function RubricEditorDialog({ id, cardId, title, discount, help, open, onClose, children }: RubricEditorDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const helpButtonRef = useRef<HTMLButtonElement>(null);
    const returnScroll = useRef<number | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const focusCard = useCalculatorTargetFocus();
    const kind = discount ? 'Desconto' : 'Crédito';
    const actionClass = 'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-body-sm font-semibold text-neutral-700 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 dark:text-neutral-200 dark:hover:bg-neutral-800';

    useBrowserLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!open) {
            returnScroll.current = null;
            setHelpOpen(false);
            return;
        }
        if (!dialog) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.showModal();
        headingRef.current?.focus({ preventScroll: true });

        return () => {
            if (dialog.open) dialog.close();
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    useBrowserLayoutEffect(() => {
        if (!open || returnScroll.current === null || !scrollRef.current) return;
        scrollRef.current.scrollTop = helpOpen ? 0 : returnScroll.current;
        if (!helpOpen) returnScroll.current = null;
    }, [open, helpOpen]);

    const toggleHelp = () => {
        if (!helpOpen) returnScroll.current = scrollRef.current?.scrollTop ?? 0;
        setHelpOpen(!helpOpen);
    };

    const dismiss = () => {
        dialogRef.current?.close();
        onClose();
        focusCard(document.getElementById(cardId), { scroll: false });
    };

    return (
        <dialog
            ref={dialogRef}
            id={id}
            aria-labelledby={`${id}-kind ${id}-title`}
            onCancel={event => {
                event.preventDefault();
                if (helpOpen) {
                    setHelpOpen(false);
                    helpButtonRef.current?.focus({ preventScroll: true });
                    return;
                }
                dismiss();
            }}
            className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden
                bg-white text-neutral-900 backdrop:bg-neutral-950/55 dark:bg-neutral-900 dark:text-neutral-100
                min-[960px]:max-w-3xl min-[960px]:border-l min-[960px]:border-neutral-200 min-[960px]:shadow-xl
                dark:min-[960px]:border-neutral-700"
        >
            <div className="flex h-full min-w-0 flex-col">
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 pb-3
                    pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-neutral-700 min-[960px]:px-6">
                    <div className="min-w-0">
                        <p id={`${id}-kind`} className={`text-body-xs font-semibold ${discount
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-secondary-800 dark:text-secondary-300'}`}>{kind}</p>
                        <h2 ref={headingRef} id={`${id}-title`} tabIndex={-1}
                            className="text-h5 font-semibold [overflow-wrap:anywhere]">{title}</h2>
                    </div>
                    <div className="flex shrink-0 items-center">
                        {help && <button ref={helpButtonRef} type="button" onClick={toggleHelp}
                            aria-expanded={helpOpen} aria-controls={`${id}-help`} className={actionClass}>
                            <Info size={18} aria-hidden="true" /> Ajuda
                        </button>}
                        <button type="button" onClick={dismiss} className={actionClass}>
                            <X size={18} aria-hidden="true" /> Fechar
                        </button>
                    </div>
                </header>
                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4
                    pb-[max(1rem,env(safe-area-inset-bottom))] min-[960px]:px-6">
                    {help && <div id={`${id}-help`} role="note" hidden={!helpOpen} aria-label={help.label}
                        className="mb-4 space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-body-sm
                            text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        {helpOpen && help.content}
                    </div>}
                    {children}
                </div>
            </div>
        </dialog>
    );
}
