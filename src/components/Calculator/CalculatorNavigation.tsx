import React, { useEffect, useRef, useState } from 'react';
import { UserRound, Award, Shield, ReceiptText, PlusCircle, MinusCircle, StickyNote, FileText, PanelLeftClose, PanelLeftOpen, List, X } from 'lucide-react';

const sections = [
    { label: 'Dados básicos', Icon: UserRound },
    { label: 'Adicional de Qualificação (AQ)', Icon: Award },
    { label: 'Previdência', Icon: Shield },
    { label: 'Imposto de Renda', Icon: ReceiptText },
    { label: 'Créditos', Icon: PlusCircle },
    { label: 'Descontos', Icon: MinusCircle },
    { label: 'Observações / Notas', Icon: StickyNote },
    { label: 'Resultado', Icon: FileText }
];

interface CalculatorNavigationProps {
    step: number;
    onChange: (step: number) => void;
}

export const CalculatorNavigation: React.FC<CalculatorNavigationProps> = ({ step, onChange }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mobileOpen) return;
        dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileOpen(false);
                triggerRef.current?.focus();
            } else if (event.key === 'Tab' && dialogRef.current) {
                const buttons: NodeListOf<HTMLButtonElement> = dialogRef.current.querySelectorAll('button:not(:disabled)');
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [mobileOpen]);

    const closeMobile = () => {
        setMobileOpen(false);
        triggerRef.current?.focus();
    };
    const items = (compact: boolean) => sections.map(({ label, Icon }, index) => (
        <button key={label} type="button" onClick={() => { setMobileOpen(false); onChange(index); }} aria-current={step === index ? 'step' : undefined} aria-label={compact ? label : undefined} title={compact ? label : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700 ${step === index ? 'bg-primary-800 text-white' : 'text-neutral-700 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700'}`}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{!compact && <span>{label}</span>}
        </button>
    ));
    return <nav aria-label="Etapas da simulação" className={`min-w-0 lg:shrink-0 ${collapsed ? 'lg:w-16' : 'lg:w-56'}`}>
        <div className="lg:hidden">
            <p className="mb-3 text-body-sm font-semibold text-neutral-600 dark:text-neutral-300">Etapa {step + 1} de {sections.length}: {sections[step].label}</p>
            <button ref={triggerRef} type="button" aria-expanded={mobileOpen} aria-controls="calculator-mobile-navigation" onClick={() => setMobileOpen(true)} style={{ bottom: 'calc(var(--calculator-bar-height, 100px) + 1rem)' }} className="fixed right-4 z-40 flex min-h-11 items-center gap-2 rounded-2xl bg-primary-800 px-4 py-3 font-bold text-white shadow-xl hover:bg-primary-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700">
                <List className="h-5 w-5" aria-hidden="true" /> Etapas
            </button>
            {mobileOpen && <div className="fixed inset-0 z-[60] flex items-end bg-neutral-950/60" onClick={event => { if (event.target === event.currentTarget) closeMobile(); }}>
                <div ref={dialogRef} id="calculator-mobile-navigation" role="dialog" aria-modal="true" aria-labelledby="calculator-mobile-navigation-title" className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-4 shadow-xl dark:bg-neutral-900" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" aria-hidden="true" />
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h2 id="calculator-mobile-navigation-title" className="text-h4 font-bold text-neutral-900 dark:text-white">Etapas da simulação</h2>
                        <button type="button" onClick={closeMobile} aria-label="Fechar menu de etapas" className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"><X className="h-5 w-5" /></button>
                    </div>
                    <p className="mb-3 text-body-sm text-neutral-600 dark:text-neutral-300">Escolha uma etapa para acessá-la diretamente.</p>
                    <div className="space-y-1">{items(false)}</div>
                </div>
            </div>}
        </div>
        <div className="hidden rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800 lg:block">
            <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir etapas' : 'Recolher etapas'} aria-expanded={!collapsed} className="mb-2 flex min-h-11 w-full items-center justify-center rounded-lg text-neutral-600 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700">
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="mr-2 h-5 w-5" /> Recolher etapas</>}
            </button>
            <div className="space-y-1">{items(collapsed)}</div>
        </div>
    </nav>;
};
