import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownRight, Plus, Search, X } from 'lucide-react';
import type { Rubrica } from '../../types';
import {
    MULTI_INSTANCE_PRESETS, PRESET_CATEGORIES, PRESET_CATALOG,
    type PredefinedRubricId, type PresetInstance
} from './dynamicPayrollForm.helpers';
import { rubricIcon } from './RubricCardHeading';

interface PresetControlsSectionProps {
    mode: Rubrica['tipo'] | null;
    instanceCount: number;
    enabledPresets: PresetInstance[];
    transportIndemnityEnabled: boolean;
    includePreset: (presetId: PredefinedRubricId) => string | undefined;
    addRubrica: (payload: Partial<Rubrica>) => string | void;
    expandCard: (id: string) => void;
    children: React.ReactNode;
}

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const desktopQuery = '(min-width: 960px)';
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/40 px-3 py-2 text-body-sm font-semibold text-secondary-800 hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-950';

export const PresetControlsSection: React.FC<PresetControlsSectionProps> = ({
    mode, instanceCount, enabledPresets, transportIndemnityEnabled, includePreset, addRubrica, expandCard, children
}) => {
    const id = useId();
    const [openMode, setOpenMode] = useState<Rubrica['tipo'] | null>(null);
    const open = mode !== null && openMode === mode;
    const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(desktopQuery).matches));
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('todos');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const focusTarget = useRef<string | null>(null);
    const highlighted = useRef<HTMLElement | null>(null);
    const highlightTimer = useRef<ReturnType<typeof setTimeout>>();
    const credit = mode === 'C';
    const addLabel = credit ? 'Adicionar crédito' : 'Adicionar desconto';
    const term = normalizeSearch(search.trim());
    const catalog = PRESET_CATALOG.filter(item =>
        (item.category === 'descontos') === !credit &&
        (item.id !== 'indenizacao_transporte' || transportIndemnityEnabled)
    );
    const filtered = catalog.filter(item =>
        (category === 'todos' || item.category === category) &&
        normalizeSearch([item.label, item.description, ...item.tags].join(' ')).includes(term)
    );

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const media = window.matchMedia(desktopQuery);
        const resize = () => setDesktop(media.matches);
        media.addEventListener('change', resize);
        return () => media.removeEventListener('change', resize);
    }, []);

    useEffect(() => {
        if (openMode !== mode) setOpenMode(null);
    }, [mode, openMode]);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!open || !dialog) return;
        if (desktop) dialog.show();
        else dialog.showModal();
        if (desktop) searchRef.current?.focus({ preventScroll: true });

        const previousOverflow = document.body.style.overflow;
        if (!desktop) document.body.style.overflow = 'hidden';
        return () => {
            dialog.close();
            if (!desktop) document.body.style.overflow = previousOverflow;
        };
    }, [open, desktop]);

    useLayoutEffect(() => {
        if (open || !focusTarget.current) return;
        const target = focusTarget.current;
        focusTarget.current = null;
        if (target === 'trigger') {
            triggerRef.current?.focus();
            return;
        }

        const card = document.getElementById(target);
        if (!card) return;
        highlighted.current?.removeAttribute('data-rubric-highlight');
        clearTimeout(highlightTimer.current);
        card.setAttribute('data-rubric-highlight', '');
        highlighted.current = card;
        (card.querySelector<HTMLElement>('[data-rubric-edit]') ?? card).focus({ preventScroll: true });
        card.scrollIntoView({
            block: 'start',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
        highlightTimer.current = setTimeout(() => card.removeAttribute('data-rubric-highlight'), 1800);
    }, [open]);

    useEffect(() => () => {
        clearTimeout(highlightTimer.current);
        highlighted.current?.removeAttribute('data-rubric-highlight');
    }, []);

    const close = (target = 'trigger') => {
        focusTarget.current = target;
        setOpenMode(null);
    };

    const reveal = (cardId: string, edit = false) => {
        if (edit) expandCard(cardId);
        close(cardId);
    };

    const addPreset = (presetId: PredefinedRubricId) => {
        const key = includePreset(presetId);
        if (key) reveal(`preset-card-${key}`, true);
    };

    const addManual = () => {
        const rubricId = addRubrica(credit ? { tipo: 'C', incideIR: true, incidePSS: true } : { tipo: 'D' });
        if (rubricId) reveal(`manual-rubrica-${rubricId}`, true);
    };

    return (
        <div className={`grid min-w-0 items-start gap-5 ${open ? 'min-[960px]:grid-cols-[minmax(0,1fr)_minmax(20rem,50%)]' : ''}`}>
            <div className="min-w-0 space-y-4">
                {mode && <div className="flex flex-wrap items-center justify-between gap-3">
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
                            setOpenMode(mode);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-secondary-800 px-4 py-2 font-semibold text-white hover:bg-secondary-900">
                        <Plus className="h-4 w-4" aria-hidden="true" />{addLabel}
                    </button>
                </div>}
                {mode && instanceCount === 0 && <p className="rounded-xl border border-dashed border-neutral-300 p-4 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                    Nenhum lançamento adicionado.
                </p>}
                {children}
            </div>
            <dialog ref={dialogRef} id={`${id}-catalog`} aria-labelledby={`${id}-title`}
                onCancel={event => { event.preventDefault(); close(); }}
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        close();
                    }
                }}
                className="m-0 h-[100dvh] max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-white p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 min-[960px]:static min-[960px]:h-auto min-[960px]:overflow-visible min-[960px]:overscroll-auto min-[960px]:rounded-xl min-[960px]:border min-[960px]:border-neutral-200 dark:min-[960px]:border-neutral-700">
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
                        <input ref={searchRef} type="search" value={search} onChange={event => setSearch(event.target.value)}
                            aria-label={credit ? 'Buscar verba ou adicional' : 'Buscar desconto'}
                            placeholder={credit ? 'Buscar verba ou adicional' : 'Buscar desconto'}
                            className="w-full bg-transparent py-2" />
                    </label>
                    {credit && <div role="group" aria-label="Categorias" className="flex flex-wrap gap-2">
                        {[{ id: 'todos', title: 'Todos' }, ...PRESET_CATEGORIES.filter(item => catalog.some(option => option.category === item.id))].map(item => (
                            <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={item.id === category}
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
                                            onClick={() => reveal(`preset-card-${first.key}`)}>
                                            {repeatable ? <ArrowDownRight aria-hidden="true" className="h-4 w-4" /> : 'Ver lançamento'}
                                        </button>}
                                        {(!first || repeatable) && <button type="button" className={actionClass}
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
