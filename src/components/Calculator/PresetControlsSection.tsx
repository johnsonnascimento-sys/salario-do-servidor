import React, { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, Plus, Search, X } from 'lucide-react';
import type { Rubrica } from '../../types';
import {
    MULTI_INSTANCE_PRESETS, PRESET_CATEGORIES, PRESET_CATALOG,
    type PredefinedRubricId, type PresetInstance
} from './dynamicPayrollForm.helpers';
import { rubricIcon } from './RubricCardHeading';
import type { PresetSearchDestination } from './calculatorSearchIndex';
import { useCalculatorTargetFocus } from './hooks/useCalculatorTargetFocus';

interface PresetControlsSectionProps {
    mode: Rubrica['tipo'] | null;
    instanceCount: number;
    enabledPresets: PresetInstance[];
    transportIndemnityEnabled: boolean;
    searchDestination?: PresetSearchDestination | null;
    onSearchFallback?: () => void;
    includePreset: (presetId: PredefinedRubricId) => string | undefined;
    addRubrica: (payload: Partial<Rubrica>) => string | void;
    onEditCard: (id: string) => void;
    children: React.ReactNode;
}

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/40 px-3 py-2 text-body-sm font-semibold text-secondary-800 hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-950';

export const PresetControlsSection: React.FC<PresetControlsSectionProps> = ({
    mode, instanceCount, enabledPresets, transportIndemnityEnabled, searchDestination, onSearchFallback,
    includePreset, addRubrica, onEditCard, children
}) => {
    const id = useId();
    const [openMode, setOpenMode] = useState<Rubrica['tipo'] | null>(null);
    const open = mode !== null && openMode === mode;
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('todos');
    const [exactSearch, setExactSearch] = useState<PresetSearchDestination | null>(null);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const addResultRef = useRef<HTMLButtonElement>(null);
    const focusTarget = useRef<{ id: string; edit: boolean } | null>(null);
    const handledSearch = useRef<PresetSearchDestination | null>(null);
    const focusCard = useCalculatorTargetFocus();
    const credit = mode === 'C';
    const addLabel = credit ? 'Adicionar crédito' : 'Adicionar desconto';
    const term = normalizeSearch(search.trim());
    const catalog = useMemo(() => PRESET_CATALOG.filter(item =>
        (item.category === 'descontos') === !credit &&
        (item.id !== 'indenizacao_transporte' || transportIndemnityEnabled)
    ), [credit, transportIndemnityEnabled]);
    const filtered = catalog.filter(item => exactSearch ? item.id === exactSearch.presetId :
        (category === 'todos' || item.category === category) &&
        normalizeSearch([item.label, item.description, ...item.tags].join(' ')).includes(term)
    );

    useLayoutEffect(() => {
        setOpenMode(current => current === mode ? current : null);
    }, [mode]);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!open || !dialog) return;
        dialog.showModal();
        searchRef.current?.focus({ preventScroll: true });

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            dialog.close();
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);

    useLayoutEffect(() => {
        if (open || !focusTarget.current) return;
        const target = focusTarget.current;
        focusTarget.current = null;
        if (target.id === 'trigger') {
            triggerRef.current?.focus();
            return;
        }

        if (target.id === 'heading' || !focusCard(document.getElementById(target.id))) onSearchFallback?.();
        else if (target.edit) onEditCard(target.id);
    }, [open, focusCard, onSearchFallback, onEditCard]);

    const close = useCallback((id = 'trigger', edit = false) => {
        focusTarget.current = { id, edit };
        setOpenMode(null);
    }, []);

    useLayoutEffect(() => {
        if (!searchDestination || !mode || handledSearch.current === searchDestination) return;
        handledSearch.current = searchDestination;
        const option = catalog.find(item => item.id === searchDestination.presetId);
        const first = option && enabledPresets.find(instance => instance.presetId === option.id);
        if (first) {
            const cardId = `preset-card-${first.key}`;
            if (open) close(cardId);
            else if (!focusCard(document.getElementById(cardId))) onSearchFallback?.();
        } else if (option) {
            setSearch(option.label);
            setCategory('todos');
            setExactSearch(searchDestination);
            setOpenMode(mode);
        } else if (open) {
            close('heading');
        } else {
            onSearchFallback?.();
        }
    }, [searchDestination, mode, catalog, enabledPresets, open, close, focusCard, onSearchFallback]);

    useLayoutEffect(() => {
        if (open && exactSearch) addResultRef.current?.focus();
    }, [open, exactSearch]);

    const addPreset = (presetId: PredefinedRubricId) => {
        const key = includePreset(presetId);
        if (key) close(`preset-card-${key}`, true);
    };

    const addManual = () => {
        const rubricId = addRubrica(credit ? { tipo: 'C', incideIR: true, incidePSS: true } : { tipo: 'D' });
        if (rubricId) close(`manual-rubrica-${rubricId}`, true);
    };

    return (
        <div className="min-w-0">
            {mode && <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-h5 font-semibold text-neutral-900 dark:text-neutral-100">
                    {credit ? 'Créditos adicionados' : 'Descontos adicionados'} ({instanceCount})
                </h3>
                <button ref={triggerRef} type="button" aria-expanded={open} aria-controls={`${id}-catalog`}
                    onClick={() => {
                        if (open) {
                            close();
                            return;
                        }
                        setSearch('');
                        setCategory('todos');
                        setExactSearch(null);
                        setOpenMode(mode);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-secondary-800 px-4 py-2 font-semibold text-white hover:bg-secondary-900">
                    <Plus className="h-4 w-4" aria-hidden="true" />{addLabel}
                </button>
            </div>}
            {mode && instanceCount === 0 && <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                Nenhum lançamento adicionado.
            </p>}
            {children}
            <dialog ref={dialogRef} id={`${id}-catalog`} aria-labelledby={`${id}-title`}
                onCancel={event => { event.preventDefault(); close(); }}
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        close();
                    }
                }}
                className="m-0 h-[100dvh] max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-white px-4
                    pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]
                    text-neutral-900 backdrop:bg-neutral-950/55 dark:bg-neutral-900 dark:text-neutral-100
                    min-[960px]:m-auto min-[960px]:h-auto min-[960px]:max-h-[85dvh] min-[960px]:w-[calc(100%_-_2rem)]
                    min-[960px]:max-w-[38rem] min-[960px]:rounded-2xl min-[960px]:border min-[960px]:border-neutral-200 min-[960px]:p-6
                    min-[960px]:shadow-xl dark:min-[960px]:border-neutral-700">
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <h3 id={`${id}-title`} className="text-h5 font-semibold">{addLabel}</h3>
                        <button type="button" onClick={() => close()} aria-label="Fechar catálogo"
                            className="inline-flex min-w-11 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-secondary/50 px-3 focus-within:ring-2 focus-within:ring-secondary">
                        <Search className="h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
                        <input ref={searchRef} type="search" value={search} onChange={event => {
                            setSearch(event.target.value);
                            setExactSearch(null);
                        }}
                            aria-label={credit ? 'Buscar verba ou adicional' : 'Buscar desconto'}
                            placeholder={credit ? 'Buscar verba ou adicional' : 'Buscar desconto'}
                            className="w-full bg-transparent py-2" />
                    </label>
                    {credit && <div role="group" aria-label="Categorias" className="flex flex-wrap gap-2">
                        {[{ id: 'todos', title: 'Todos' }, ...PRESET_CATEGORIES.filter(item => catalog.some(option => option.category === item.id))].map(item => (
                            <button key={item.id} type="button" onClick={() => {
                                setCategory(item.id);
                                setExactSearch(null);
                            }} aria-pressed={item.id === category}
                                className={`rounded-full border px-3 text-body-sm font-semibold ${item.id === category
                                    ? 'border-secondary-800 bg-secondary-800 text-white'
                                    : 'border-neutral-200 hover:border-secondary dark:border-neutral-700'}`}>
                                {item.title}
                            </button>
                        ))}
                    </div>}
                    <ul className="space-y-2" aria-label="Rubricas disponíveis">
                        {filtered.map(item => {
                            const instances = enabledPresets.filter(instance => instance.presetId === item.id);
                            const [first] = instances;
                            const repeatable = MULTI_INSTANCE_PRESETS.has(item.id);
                            const Icon = rubricIcon(item.id);
                            return (
                                <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${credit
                                        ? 'bg-secondary-50 text-secondary-800 dark:bg-secondary-950 dark:text-secondary-300'
                                        : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-24 flex-1">
                                        <h4 className="break-words font-semibold">{item.label}</h4>
                                        <p className="text-body-sm text-neutral-600 dark:text-neutral-300">{item.description}</p>
                                        {first && <p className="text-body-xs font-semibold text-secondary-800 dark:text-secondary-300">
                                            {repeatable ? `${instances.length} ${instances.length === 1 ? 'lançamento' : 'lançamentos'}` : 'Adicionado'}
                                        </p>}
                                    </div>
                                    <div className="ml-auto flex flex-wrap justify-end gap-2">
                                        {first && <button type="button" className={actionClass}
                                            aria-label={`Ver lançamento de ${item.label}`}
                                            onClick={() => close(`preset-card-${first.key}`)}>
                                            {repeatable ? <ArrowDownRight aria-hidden="true" className="h-4 w-4" /> : 'Ver lançamento'}
                                        </button>}
                                        {(!first || repeatable) && <button ref={exactSearch ? addResultRef : undefined} type="button" className={actionClass}
                                            aria-label={`${first ? 'Adicionar outro lançamento de' : 'Adicionar'} ${item.label}`}
                                            onClick={() => addPreset(item.id)}>
                                            {first ? 'Adicionar outro' : 'Adicionar'}
                                        </button>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    {filtered.length === 0 && <p role="status" className="text-neutral-600 dark:text-neutral-300">Nenhuma rubrica encontrada.</p>}
                    <button type="button" onClick={addManual} className={actionClass}>
                        <Plus className="h-4 w-4" aria-hidden="true" />{addLabel} avulso
                    </button>
                </div>
            </dialog>
        </div>
    );
};
