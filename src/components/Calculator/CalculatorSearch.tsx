import React, { useEffect, useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { CourtConfig } from '../../types';
import { CALCULATOR_SECTIONS } from './calculatorSections';
import { buildCalculatorSearchIndex, searchCalculator, type CalculatorSearchDestination } from './calculatorSearchIndex';

interface CalculatorSearchProps {
    courtConfig: CourtConfig;
    onSelect: (destination: CalculatorSearchDestination) => void;
    className?: string;
}

export const CalculatorSearch = ({ courtConfig, onSelect, className }: CalculatorSearchProps) => {
    const id = useId();
    const listId = `${id}-results`;
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const index = useMemo(() => buildCalculatorSearchIndex(courtConfig), [courtConfig]);
    const results = useMemo(() => searchCalculator(index, query), [index, query]);
    const showResults = expanded && Boolean(query.trim());
    const hasOptions = showResults && results.length > 0;
    const activeResult = hasOptions ? results[activeIndex] : undefined;
    const activeId = activeResult ? `${listId}-${activeResult.id}` : undefined;

    useEffect(() => {
        if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
    }, [activeId]);

    const dismiss = () => {
        setExpanded(false);
        setActiveIndex(-1);
    };

    const select = (destination: CalculatorSearchDestination) => {
        dismiss();
        setQuery('');
        onSelect(destination);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape' && showResults) {
            event.preventDefault();
            dismiss();
        } else if (event.key === 'Enter' && hasOptions) {
            event.preventDefault();
            select((activeResult ?? results[0]).destination);
        } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
            event.preventDefault();
            setExpanded(true);
            const current = activeResult ? activeIndex : -1;
            const next = event.key === 'ArrowDown' ? current + 1 : current <= 0 ? results.length - 1 : current - 1;
            setActiveIndex(next % results.length);
        }
    };

    return (
        <div role="search" aria-label="Calculadora" className={`relative w-full ${className ?? 'mb-4 max-w-md min-[960px]:mb-5'}`} onBlur={dismiss}>
            <label htmlFor={id} className="flex min-h-11 items-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 focus-within:ring-2 focus-within:ring-secondary-600 dark:border-neutral-600 dark:bg-neutral-900">
                <Search className="h-5 w-5 shrink-0 text-secondary-700 dark:text-secondary-300" aria-hidden="true" />
                <span className="sr-only">Buscar na calculadora</span>
                <input id={id} type="search" role="combobox" autoComplete="off" aria-autocomplete="list"
                    aria-expanded={hasOptions} aria-controls={hasOptions ? listId : undefined} aria-activedescendant={activeId}
                    placeholder="Buscar na calculadora" value={query}
                    className="min-w-0 w-full bg-transparent py-2 text-body text-neutral-900 outline-none placeholder:text-neutral-600 dark:text-neutral-100 dark:placeholder:text-neutral-400"
                    onFocus={() => setExpanded(true)} onKeyDown={handleKeyDown}
                    onChange={event => {
                        setQuery(event.target.value);
                        setActiveIndex(-1);
                        setExpanded(true);
                    }} />
            </label>
            <p role="status" className="sr-only">
                {showResults && (results.length === 0 ? 'Nenhuma opção encontrada.'
                    : results.length === 1 ? '1 opção encontrada.' : `${results.length} opções encontradas.`)}
            </p>
            {showResults && !hasOptions && <p className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-body-sm text-neutral-600 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">Nenhuma opção encontrada.</p>}
            {hasOptions && <ul id={listId} role="listbox" aria-label="Opções da calculadora"
                className="absolute left-0 top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                {results.map((entry, resultIndex) => {
                    const section = CALCULATOR_SECTIONS[entry.destination.step].label;
                    const active = resultIndex === activeIndex;
                    return (
                        <li key={entry.id} id={`${listId}-${entry.id}`} role="option" aria-selected={active}
                            className={`min-h-11 cursor-pointer break-words rounded-lg px-3 py-2 text-body ${active
                                ? 'bg-secondary-100 dark:bg-secondary-900' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => select(entry.destination)}>
                            <span className="block font-semibold text-neutral-900 dark:text-neutral-100">{entry.label}</span>
                            {entry.label !== section && <span className="block text-body-xs text-neutral-600 dark:text-neutral-300">{section}</span>}
                        </li>
                    );
                })}
            </ul>}
        </div>
    );
};
