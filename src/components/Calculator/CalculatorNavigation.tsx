import React, { useState } from 'react';
import { UserRound, Shield, PlusCircle, MinusCircle, FileText, PanelLeftClose, PanelLeftOpen, ChevronDown } from 'lucide-react';

const sections = [
    { label: 'Dados e AQ', Icon: UserRound },
    { label: 'Previdência', Icon: Shield },
    { label: 'Créditos', Icon: PlusCircle },
    { label: 'Descontos', Icon: MinusCircle },
    { label: 'Resultado', Icon: FileText }
];

interface CalculatorNavigationProps {
    step: number;
    onChange: (step: number) => void;
}

export const CalculatorNavigation: React.FC<CalculatorNavigationProps> = ({ step, onChange }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const items = (compact: boolean) => sections.map(({ label, Icon }, index) => (
        <button key={label} type="button" onClick={() => { setMobileOpen(false); onChange(index); }} aria-current={step === index ? 'step' : undefined} aria-label={compact ? label : undefined} title={compact ? label : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-700 ${step === index ? 'bg-primary-800 text-white' : 'text-neutral-700 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700'}`}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{!compact && <span>{label}</span>}
        </button>
    ));
    return <nav aria-label="Etapas da simulação" className={`min-w-0 lg:shrink-0 ${collapsed ? 'lg:w-16' : 'lg:w-56'}`}>
        <div className="rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800 lg:hidden">
            <button type="button" aria-expanded={mobileOpen} aria-controls="calculator-mobile-navigation" onClick={() => setMobileOpen(open => !open)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left font-semibold text-neutral-800 dark:text-neutral-100">
                <span>Etapa: {sections[step].label}</span><ChevronDown className={`h-5 w-5 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
            </button>
            <div id="calculator-mobile-navigation" hidden={!mobileOpen} className="space-y-1 pt-1">{items(false)}</div>
        </div>
        <div className="hidden rounded-xl bg-neutral-100 p-2 dark:bg-neutral-800 lg:block">
            <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expandir menu de etapas' : 'Recolher menu de etapas'} aria-expanded={!collapsed} className="mb-2 flex min-h-11 w-full items-center justify-center rounded-lg text-neutral-600 hover:bg-white dark:text-neutral-200 dark:hover:bg-neutral-700">
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <><PanelLeftClose className="mr-2 h-5 w-5" /> Recolher menu</>}
            </button>
            <div className="space-y-1">{items(collapsed)}</div>
        </div>
    </nav>;
};
