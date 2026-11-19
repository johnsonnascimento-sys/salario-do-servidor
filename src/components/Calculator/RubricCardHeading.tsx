import React from 'react';
import { ArrowLeftRight, Car, Clock, FileSpreadsheet, Gift, Pencil, Plane, Scale, Sun } from 'lucide-react';
import { CalculatorCardHeading } from './CalculatorCardHeading';
import { formatCurrency } from '../../utils/calculations';
import type { PredefinedRubricId, PresetGrossLine } from './dynamicPayrollForm.helpers';

const icons: Partial<Record<PredefinedRubricId, typeof Clock>> = {
    hora_extra: Clock,
    substituicao: ArrowLeftRight,
    ferias: Sun,
    decimo: Gift,
    diarias: Plane,
    indenizacao_transporte: Car,
    pensao: Scale
};

export const rubricIcon = (id?: PredefinedRubricId) => (id && icons[id]) || FileSpreadsheet;

const amountLabels = {
    gross: 'Bruto',
    net: 'Líquido',
    discount: 'Desconto'
};

interface RubricCardHeadingProps {
    title: string;
    presetId?: PredefinedRubricId;
    discount?: boolean;
    amount?: { value: number; kind: NonNullable<PresetGrossLine['cardAmount']> };
    net?: number;
    notice?: string;
    help?: React.ComponentProps<typeof CalculatorCardHeading>['help'];
    remove?: React.ComponentProps<typeof CalculatorCardHeading>['remove'];
    panelId: string;
    expanded: boolean;
    onToggle: () => void;
}

export function RubricCardHeading({
    title, presetId, discount, amount, net, notice, help, remove, panelId, expanded, onToggle
}: RubricCardHeadingProps) {
    const Icon = rubricIcon(presetId);
    const label = (
        <div className="flex min-w-0 items-center gap-2">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${discount
                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-secondary-50 text-secondary-800 dark:bg-secondary-950 dark:text-secondary-300'}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
                <h4 className="[overflow-wrap:anywhere] font-semibold text-neutral-900 dark:text-neutral-100">{title}</h4>
                {notice && <p className="text-body-xs font-medium text-amber-800 dark:text-amber-300">{notice}</p>}
            </div>
        </div>
    );
    const amounts = amount && (
        <dl className={`grid gap-1 tabular-nums ${discount ? 'text-red-700 dark:text-red-300' : ''}`}>
            <div>
                <dt className="text-body-xs">{amountLabels[amount.kind]}</dt>
                <dd className="break-words font-semibold">{formatCurrency(amount.value)}</dd>
            </div>
            {!expanded && amount.kind !== 'net' && net !== undefined && <div className="text-body-xs">
                <dt className="text-body-xs">{amountLabels.net}</dt>
                <dd className="font-bold">{formatCurrency(net)}</dd>
            </div>}
        </dl>
    );
    const edit = (
        <button type="button" data-rubric-edit aria-expanded={expanded} aria-controls={panelId}
            aria-label={`${expanded ? 'Recolher' : 'Editar'} ${title}`} onClick={onToggle}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-body-sm font-semibold text-secondary-800 hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-950">
            {!expanded && <Pencil className="hidden h-4 w-4 sm:block" aria-hidden="true" />}
            {expanded ? 'Recolher' : 'Editar'}
        </button>
    );
    return (
        <CalculatorCardHeading help={help} remove={remove} statement={{ amount: amounts, edit }}>
            {label}
        </CalculatorCardHeading>
    );
}
