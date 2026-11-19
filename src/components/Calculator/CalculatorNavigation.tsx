import React, { useEffect, useId, useRef, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { CALCULATOR_SECTIONS as sections } from './calculatorSections';

interface CalculatorNavigationProps {
    step: number;
    onChange: (step: number) => void;
    mobileOpen: boolean;
    onCloseMobile: (restoreFocus?: boolean) => void;
}

export const CalculatorNavigation: React.FC<CalculatorNavigationProps> = ({ step, onChange, mobileOpen, onCloseMobile }) => {
    const [collapsed, setCollapsed] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const navId = useId();

    useEffect(() => {
        if (!mobileOpen) return;
        dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
        const desktop = window.matchMedia('(min-width: 960px)');
        const closeAtDesktop = () => { if (desktop.matches) onCloseMobile(false); };
        desktop.addEventListener('change', closeAtDesktop);
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onCloseMobile();
            } else if (event.key === 'Tab' && dialogRef.current) {
                const buttons: NodeListOf<HTMLButtonElement> = dialogRef.current.querySelectorAll('button:not(:disabled)');
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            desktop.removeEventListener('change', closeAtDesktop);
        };
    }, [mobileOpen, onCloseMobile]);
    const items = (compact: boolean, surface: 'mobile' | 'desktop') => sections.map(({ label, Icon, hint }, index) => {
        const current = step === index;
        const hintId = hint && !compact ? `${navId}-${surface}-${index}` : undefined;
        return (
            <button key={label} type="button" onClick={() => { onCloseMobile(false); onChange(index); }}
                aria-current={current ? 'step' : undefined} aria-label={compact || hint ? label : undefined}
                aria-describedby={hintId} title={compact ? [label, hint].filter(Boolean).join(' · ') : undefined}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 ${current ? 'bg-secondary-800 text-white' : 'text-neutral-700 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700'}`}>
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!compact && <span>
                    {label}
                    {hint && <span id={hintId} className={`mt-0.5 block text-body-xs font-normal ${current ? 'text-secondary-100' : 'text-neutral-600 dark:text-neutral-300'}`}>{hint}</span>}
                </span>}
            </button>
        );
    });
    return <nav aria-label="Etapas da simulação" className={`min-w-0 min-[960px]:shrink-0 ${mobileOpen ? '' : 'hidden min-[960px]:block'} ${collapsed ? 'min-[960px]:w-16' : 'min-[960px]:w-56'}`}>
        <div className="min-[960px]:hidden">
            {mobileOpen && <div className="fixed inset-0 z-[60] flex items-end bg-neutral-950/60" onClick={event => { if (event.target === event.currentTarget) onCloseMobile(); }}>
                <div ref={dialogRef} id="calculator-mobile-navigation" role="dialog" aria-modal="true" aria-labelledby="calculator-mobile-navigation-title" className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-4 shadow-xl dark:bg-neutral-900" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden="true" />
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h2 id="calculator-mobile-navigation-title" className="text-h4 font-bold text-neutral-900 dark:text-white">Etapas da simulação</h2>
                        <button type="button" onClick={() => onCloseMobile()} aria-label="Fechar menu de etapas" className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"><X className="h-5 w-5" /></button>
                    </div>
                    <p className="mb-3 text-body-sm text-neutral-600 dark:text-neutral-300">Escolha uma etapa para acessá-la diretamente.</p>
                    <div className="space-y-1">{items(false, 'mobile')}</div>
                </div>
            </div>}
        </div>
        <div className="hidden rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800 min-[960px]:block">
            <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir etapas' : 'Recolher etapas'} aria-expanded={!collapsed} className="mb-2 flex min-h-11 w-full items-center justify-center rounded-lg text-neutral-600 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700">
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="mr-2 h-5 w-5" /> Recolher etapas</>}
            </button>
            <div className="space-y-1">{items(collapsed, 'desktop')}</div>
        </div>
    </nav>;
};
