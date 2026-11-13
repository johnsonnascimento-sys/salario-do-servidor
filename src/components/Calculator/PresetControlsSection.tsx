import React, { useState, useMemo } from 'react';
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
    GripVertical,
    ArrowDownRight,
    X,
    Sparkles
} from 'lucide-react';
import { Rubrica } from '../../types';
import {
    PredefinedRubricId,
    MULTI_INSTANCE_PRESETS,
    MULTI_INSTANCE_HINT_LABEL,
    PRESET_CATEGORIES,
    PRESET_CATALOG,
    PresetCatalogItem,
    PresetInstance
} from './dynamicPayrollForm.helpers';

interface PresetOption {
    id: PredefinedRubricId;
    label: string;
}

interface PresetControlsSectionProps {
    styles: Record<string, string>;
    selectedPreset: PredefinedRubricId | '';
    setSelectedPreset: (value: PredefinedRubricId | '') => void;
    availablePresets: PresetOption[];
    includePreset: (presetId?: PredefinedRubricId) => void;
    reorderMode: boolean;
    setReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
    enabledPresetCount: number;
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
    ats: Award
};

export const PresetControlsSection: React.FC<PresetControlsSectionProps> = ({
    styles,
    availablePresets,
    includePreset,
    reorderMode,
    setReorderMode,
    enabledPresetCount,
    enabledPresets = [],
    transportIndemnityEnabled = true,
    gaactaAvailable = true,
    addRubrica,
    rubricas = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');

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
        const term = searchTerm.trim().toLowerCase();
        return PRESET_CATALOG.filter(item => {
            if (item.id === 'indenizacao_transporte' && !transportIndemnityEnabled) return false;
            if (item.id === 'gaacta' && !gaactaAvailable) return false;

            if (!term) return true;

            const matchLabel = item.label.toLowerCase().includes(term);
            const matchDesc = item.description.toLowerCase().includes(term);
            const matchTags = item.tags.some(tag => tag.toLowerCase().includes(term));
            return matchLabel || matchDesc || matchTags;
        });
    }, [searchTerm, transportIndemnityEnabled, gaactaAvailable]);

    const scrollToManualRubricasSection = () => {
        const el = document.getElementById('manual-rubricas-section');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.add('ring-2', 'ring-primary', 'shadow-md');
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-primary', 'shadow-md');
            }, 1800);
        }
    };

    const scrollToPresetCard = (presetId: string) => {
        if (presetId === 'vpni' || presetId === 'ats') {
            scrollToManualRubricasSection();
            return;
        }
        const el = document.getElementById(`preset-card-${presetId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-primary', 'shadow-md');
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-primary', 'shadow-md');
            }, 1800);
        }
    };

    const handleAddPreset = (presetId: string) => {
        if (presetId === 'vpni') {
            addRubrica?.({ descricao: 'VPNI', tipo: 'C', incideIR: true, incidePSS: true });
            setTimeout(scrollToManualRubricasSection, 120);
            return;
        }
        if (presetId === 'ats') {
            addRubrica?.({ descricao: 'ATS', tipo: 'C', incideIR: true, incidePSS: true });
            setTimeout(scrollToManualRubricasSection, 120);
            return;
        }
        includePreset(presetId as PredefinedRubricId);
        setTimeout(() => {
            scrollToPresetCard(presetId);
        }, 120);
    };

    return (
        <div className="space-y-4">
            {/* Barra superior de ações e busca rápida */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar verba ou adicional (ex.: hora extra, férias, diárias, 13º)..."
                        className={`${styles.input} pl-9 pr-8 text-body-xs w-full`}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            aria-label="Limpar busca"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                        type="button"
                        onClick={() => setReorderMode(prev => !prev)}
                        disabled={enabledPresetCount < 2 && !reorderMode}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-body-xs font-bold uppercase tracking-wider transition-colors shrink-0 disabled:opacity-40 ${
                            reorderMode
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700'
                        }`}
                        title="Reordenar a ordem de exibição dos cards no formulário"
                    >
                        <GripVertical className="w-3.5 h-3.5" />
                        {reorderMode ? 'Concluir ordem' : `Reordenar cards (${enabledPresetCount})`}
                    </button>
                </div>
            </div>

            {reorderMode && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-body-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <GripVertical className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                        <strong>Modo de Reordenação Ativo:</strong> Arraste os cards abaixo usando o ícone lateral para reorganizar a ordem de exibição na folha.
                    </span>
                </div>
            )}

            {/* Categorias e Chips Visuais */}
            {filteredCatalog.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                    <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                    <p className="text-body-xs">Nenhum adicional ou verba encontrada para &ldquo;{searchTerm}&rdquo;.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {PRESET_CATEGORIES.map(category => {
                        const itemsInCategory = filteredCatalog.filter(item => item.category === category.id);
                        if (itemsInCategory.length === 0) return null;

                        return (
                            <div key={category.id} className="space-y-2">
                                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                                        {category.title}
                                    </h4>
                                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                        • {category.subtitle}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2.5">
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
                                                            <h5 className="text-body-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-snug truncate" title={item.label}>
                                                                {item.label}
                                                            </h5>
                                                        </div>
                                                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5" title={item.description}>
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Rodapé do chip: Ações e Status */}
                                                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
                                                    {isAdded ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => scrollToPresetCard(item.id)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
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
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase transition-colors"
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
                                                            className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-neutral-100 hover:bg-primary hover:text-white text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-primary dark:hover:text-white transition-colors text-body-xs font-semibold"
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
                        );
                    })}
                </div>
            )}

            {enabledPresetCount === 0 && (
                <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl text-center">
                    <p className="text-body-xs text-primary-800 dark:text-primary-300">
                        💡 <strong>Dica:</strong> Clique em qualquer um dos botões acima (ex.: <em>Horas Extras</em>, <em>Férias</em> ou <em>13º Salário</em>) para adicionar a verba à sua simulação com 1 clique.
                    </p>
                </div>
            )}
        </div>
    );
};
