import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Clock,
    ArrowLeftRight,
    Award,
    Shield,
    Sun,
    Gift,
    CalendarClock,
    Plane,
    Car,
    Coins,
    Baby,
    Bus,
    FileSpreadsheet,
    Plus,
    Check,
    Search,
    ArrowDownRight,
    X,
    Sparkles,
    Scale
} from 'lucide-react';
import { Rubrica } from '../../types';
import {
    PredefinedRubricId,
    MULTI_INSTANCE_PRESETS,
    PRESET_CATEGORIES,
    PRESET_CATALOG,
    PresetInstance
} from './dynamicPayrollForm.helpers';

interface PresetOption {
    id: PredefinedRubricId;
    label: string;
}

interface PresetControlsSectionProps {
    mode: 'C' | 'D';
    styles: Record<string, string>;
    selectedPreset: PredefinedRubricId | '';
    setSelectedPreset: (value: PredefinedRubricId | '') => void;
    availablePresets: PresetOption[];
    includePreset: (presetId?: PredefinedRubricId) => void;
    multiInstanceHintLabel: string;
    enabledPresets?: PresetInstance[];
    transportIndemnityEnabled?: boolean;
    gaactaAvailable?: boolean;
    addRubrica?: (payload?: Rubrica['tipo'] | Partial<Rubrica>) => void;
    rubricas?: Rubrica[];
}

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    hora_extra: Clock,
    substituicao: ArrowLeftRight,
    gaacta: Award,
    gratificacao: Shield,
    ferias: Sun,
    decimo: Gift,
    licenca: CalendarClock,
    diarias: Plane,
    indenizacao_transporte: Car,
    abono: Coins,
    pre_escolar: Baby,
    aux_transporte: Bus,
    vantagens: FileSpreadsheet,
    vpni: FileSpreadsheet,
    ats: Award,
    pensao: Scale
};

export const PresetControlsSection: React.FC<PresetControlsSectionProps> = ({
    mode,
    styles,
    includePreset,
    enabledPresets = [],
    transportIndemnityEnabled = true,
    gaactaAvailable = true,
    addRubrica,
    rubricas = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    useEffect(() => setSearchTerm(''), [mode]);
    const pendingFocus = useRef<{ kind: 'preset' | 'manual'; previousIds: string[]; presetId: string } | null>(null);
    const highlightTimer = useRef<ReturnType<typeof setTimeout>>();
    const highlightedElement = useRef<HTMLElement | null>(null);
    const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const focusCard = (id: string) => {
        const element = document.getElementById(id);
        if (!element) return;
        highlightedElement.current?.classList.remove('ring-2', 'ring-primary-600', 'ring-offset-2');
        clearTimeout(highlightTimer.current);
        element.focus({ preventScroll: true });
        element.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        element.classList.add('ring-2', 'ring-primary-600', 'ring-offset-2');
        highlightedElement.current = element;
        highlightTimer.current = setTimeout(() => element.classList.remove('ring-2', 'ring-primary-600', 'ring-offset-2'), 1800);
    };

    useEffect(() => () => clearTimeout(highlightTimer.current), []);
    useEffect(() => {
        const pending = pendingFocus.current;
        if (!pending) return;
        const added = pending.kind === 'preset'
            ? enabledPresets.find(instance => instance.presetId === pending.presetId && !pending.previousIds.includes(instance.key))
            : rubricas.find(rubrica => !pending.previousIds.includes(rubrica.id));
        if (!added) return;
        pendingFocus.current = null;
        focusCard('key' in added ? `preset-card-${added.key}` : `manual-rubrica-${added.id}`);
    }, [enabledPresets, rubricas]);

    // Contagem de instâncias ativas por presetId e atalhos manuais (VPNI, ATS)
    const activeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        enabledPresets.forEach(instance => {
            counts[instance.presetId] = (counts[instance.presetId] || 0) + 1;
        });

        if (rubricas && rubricas.length > 0) {
            rubricas.forEach(r => {
                if (r.tipo === 'C') {
                    const desc = (r.descricao || '').trim().toUpperCase();
                    if (desc === 'VPNI' || desc.startsWith('VPNI')) {
                        counts['vpni'] = (counts['vpni'] || 0) + 1;
                    }
                    if (desc === 'ATS' || desc.startsWith('ATS')) {
                        counts['ats'] = (counts['ats'] || 0) + 1;
                    }
                }
            });
        }

        return counts;
    }, [enabledPresets, rubricas]);

    // Filtra o catálogo com base no termo de busca e disponibilidade do órgão
    const filteredCatalog = useMemo(() => {
        const term = normalizeSearch(searchTerm.trim());
        return PRESET_CATALOG.filter(item => {
            if ((item.category === 'descontos') !== (mode === 'D')) return false;
            if (item.id === 'indenizacao_transporte' && !transportIndemnityEnabled) return false;
            if (item.id === 'gaacta' && !gaactaAvailable) return false;

            if (!term) return true;

            const matchLabel = normalizeSearch(item.label).includes(term);
            const matchDesc = normalizeSearch(item.description).includes(term);
            const matchTags = item.tags.some(tag => normalizeSearch(tag).includes(term));
            return matchLabel || matchDesc || matchTags;
        });
    }, [searchTerm, transportIndemnityEnabled, gaactaAvailable, mode]);

    const scrollToPresetCard = (presetId: string) => {
        if (presetId === 'vpni' || presetId === 'ats') {
            const rubrica = rubricas.find(item => item.tipo === 'C' && item.descricao.trim().toLowerCase().startsWith(presetId));
            if (rubrica) focusCard(`manual-rubrica-${rubrica.id}`);
            return;
        }
        const instance = enabledPresets.find(item => item.presetId === presetId);
        if (instance) focusCard(`preset-card-${instance.key}`);
    };

    const handleAddManual = (payload: Partial<Rubrica>) => {
        if (!addRubrica) return;
        pendingFocus.current = { kind: 'manual', previousIds: rubricas.map(item => item.id), presetId: '' };
        addRubrica(payload);
    };

    const handleAddPreset = (presetId: string) => {
        if (presetId === 'vpni' || presetId === 'ats') {
            handleAddManual({ descricao: presetId.toUpperCase(), tipo: 'C', incideIR: true, incidePSS: true });
            return;
        }
        pendingFocus.current = { kind: 'preset', previousIds: enabledPresets.map(item => item.key), presetId };
        includePreset(presetId as PredefinedRubricId);
    };

    return (
        <div className="space-y-4">
            {/* Barra superior de ações e busca rápida */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="search"
                        aria-label="Buscar verba ou adicional"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={mode === 'C' ? 'Buscar verba (ex.: hora extra)...' : 'Buscar desconto (ex.: pensão alimentícia)...'}
                        className={`${styles.input} pl-9 pr-12 w-full`}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            aria-label="Limpar busca"
                            className="absolute right-0 top-1/2 min-h-11 min-w-11 flex items-center justify-center -translate-y-1/2 text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

            </div>

            {addRubrica && (
                <button type="button" onClick={() => handleAddManual(mode === 'C' ? { tipo: 'C', incideIR: true, incidePSS: true } : { tipo: 'D' })}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/30 px-4 py-2 font-semibold text-primary hover:bg-primary/10">
                    <Plus className="h-4 w-4" /> {mode === 'C' ? 'Adicionar crédito avulso' : 'Adicionar desconto avulso'}
                </button>
            )}

            {/* Categorias e Chips Visuais */}
            {filteredCatalog.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="text-body">Nenhum adicional ou verba encontrada para &ldquo;{searchTerm}&rdquo;.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {PRESET_CATEGORIES.map(category => {
                        const itemsInCategory = filteredCatalog.filter(item => item.category === category.id);
                        if (itemsInCategory.length === 0) return null;

                        return (
                            <details key={category.id} open={Boolean(searchTerm)} className="group rounded-xl border border-neutral-200 bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-900/30">
                                <summary className="flex min-h-11 cursor-pointer list-none flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">
                                    <span className="min-w-0"><span className="block text-body font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">{category.title}</span><span className="mt-0.5 block text-body text-neutral-500 dark:text-neutral-400">{category.subtitle}</span></span>
                                    <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-body text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{itemsInCategory.length}{itemsInCategory.some(item => (activeCounts[item.id] || 0) > 0) ? ` · ${itemsInCategory.reduce((sum, item) => sum + (activeCounts[item.id] || 0), 0)} ativa(s)` : ''}</span>
                                </summary>
                                <div className="space-y-2 px-3 pb-3">

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                    {itemsInCategory.map(item => {
                                        const count = activeCounts[item.id] || 0;
                                        const isAdded = count > 0;
                                        const isMulti = MULTI_INSTANCE_PRESETS.has(item.id);
                                        const IconComponent = PRESET_ICONS[item.id] || Sparkles;

                                        return (
                                            <div
                                                key={item.id}
                                                className={`group relative flex flex-col justify-between p-3 rounded-xl border transition-all ${
                                                    isAdded
                                                        ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 dark:border-primary/40 shadow-xs'
                                                        : 'bg-white dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-700/80 hover:border-primary/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 shadow-xs'
                                                }`}
                                            >
                                                {/* Topo do chip: Ícone e Título */}
                                                <div className="flex items-start gap-2.5 mb-2">
                                                    <div className={`p-2 rounded-lg shrink-0 ${
                                                        isAdded
                                                            ? 'bg-primary text-white shadow-xs'
                                                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 group-hover:bg-primary/10 group-hover:text-primary transition-colors'
                                                    }`}>
                                                        <IconComponent className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <h5 className="text-body font-semibold text-neutral-800 dark:text-neutral-200 leading-snug break-words" title={item.label}>
                                                                {item.label}
                                                            </h5>
                                                        </div>
                                                        <p className="text-body break-words text-neutral-500 dark:text-neutral-400 mt-0.5" title={item.description}>
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Rodapé do chip: Ações e Status */}
                                                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                                                    {isAdded ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => scrollToPresetCard(item.id)}
                                                                className="inline-flex min-h-11 items-center gap-1 text-body font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                                                                title="Rolar suavemente até o card aberto na tela"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>{count > 1 ? `${count} ativas` : 'Adicionado'}</span>
                                                                <ArrowDownRight className="w-3 h-3 ml-0.5 opacity-70" />
                                                            </button>

                                                            {isMulti && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddPreset(item.id)}
                                                                    className="inline-flex min-h-11 items-center gap-1 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-body font-bold uppercase transition-colors"
                                                                    title="Adicionar mais uma instância deste card"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    Outra
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddPreset(item.id)}
                                                            className="w-full inline-flex min-h-11 items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-neutral-100 hover:bg-primary hover:text-white text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-primary dark:hover:text-white transition-colors text-body font-semibold"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>Adicionar</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}


        </div>
    );
};
