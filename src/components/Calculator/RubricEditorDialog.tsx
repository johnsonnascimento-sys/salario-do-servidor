import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
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
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export function RubricEditorDialog({ id, cardId, title, discount, open, onClose, children }: RubricEditorDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const focusCard = useCalculatorTargetFocus();
    const kind = discount ? 'Desconto' : 'Crédito';

    useBrowserLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!open || !dialog) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.showModal();
        headingRef.current?.focus({ preventScroll: true });

        return () => {
            if (dialog.open) dialog.close();
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

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
            onCancel={event => { event.preventDefault(); dismiss(); }}
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
                    <button type="button" onClick={dismiss}
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-body-sm font-semibold
                            text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800">
                        <X size={18} aria-hidden="true" /> Fechar
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4
                    pb-[max(1rem,env(safe-area-inset-bottom))] min-[960px]:px-6">
                    {children}
                </div>
            </div>
        </dialog>
    );
}
