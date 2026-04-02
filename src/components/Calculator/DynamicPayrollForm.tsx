import React, { useEffect } from 'react';
import { GripVertical, Plus, Settings, Trash2 } from 'lucide-react';
import { CalculatorState, CourtConfig, OvertimeEntry, Rubrica, SubstitutionEntry } from '../../types';
import { formatCurrency, getTablesForPeriod } from '../../utils/calculations';
import { ManualRubricasSection } from './ManualRubricasSection';
import { PresetCardContent } from './PresetCardContent';
import { PresetGrossSummary } from './PresetGrossSummary';
import { useFunprespForm } from './hooks/useFunprespForm';
import { useDynamicPresetInstances } from './hooks/useDynamicPresetInstances';
import { buildPresetGrossLines } from './presetGrossLines';
import { pickBestKeyByReference, toReferenceMonthIndex } from './referenceDateUtils';
import {
    PredefinedRubricId,
    PresetGrossLine,
    PresetInstance,
    PREDEFINED_OPTIONS,
    MULTI_INSTANCE_PRESETS,
    MULTI_INSTANCE_HINT_LABEL,
    toPositiveNumber,
    toPercentLabel,
    toDecimalRateFromPercentInput,
    createUniqueId,
    formatReferenciaMesAno,
    getPresetPickerLabel
} from './dynamicPayrollForm.helpers';

interface DynamicPayrollFormProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    updateSubstDays: (key: string, days: number) => void;
    courtConfig: CourtConfig;
    addRubrica: (tipo?: Rubrica['tipo']) => void;
    removeRubrica: (id: string) => void;
    updateRubrica: (id: string, field: keyof Rubrica, value: any) => void;
    styles: any;
}

export const DynamicPayrollForm: React.FC<DynamicPayrollFormProps> = ({
    state,
    update,
    updateSubstDays,
    courtConfig,
    addRubrica,
    removeRubrica,
    updateRubrica,
    styles
}) => {
    const currentTables = getTablesForPeriod(state.periodo, courtConfig);
    const payrollRules = courtConfig.payrollRules;
    const careerCatalog = courtConfig.careerCatalog;
    const noFunctionCode = careerCatalog?.noFunctionCode ?? '';
    const noFunctionLabel = careerCatalog?.noFunctionLabel ?? 'Sem função';
    const cargoOptions = Object.keys(currentTables.salario || {});
    const salaryByCargo = currentTables.salario[state.cargo] || {};
    const padroes = Object.keys(salaryByCargo);
    const baseVencimento = salaryByCargo[state.padrao] || 0;
    const gaj = baseVencimento * (payrollRules?.gajRate ?? 0);
    const isNovoAQ = state.periodo >= 1;
    const functionKeys = Object.keys(currentTables.funcoes || {});
    const pssOptions = Object.keys(courtConfig.historico_pss || {});
    const irOptions = Object.keys(courtConfig.historico_ir || {});
    const previdenciaComplementar = courtConfig.previdenciaComplementar;
    const competenciaReferencia = formatReferenciaMesAno(state.mesRef, state.anoRef);
    const {
        showFunprespSection,
        funprespNormalOptions,
        handleRegimePrevChange,
        handleFunprespParticipacaoChange,
        funprespValidationError
    } = useFunprespForm({
        state,
        update,
        previdenciaComplementar
    });
    const {
        enabledPresets,
        availablePresets,
        selectedPreset,
        setSelectedPreset,
        reorderMode,
        setReorderMode,
        draggingPreset,
        includePreset,
        removePreset,
        handlePresetDragStart,
        handlePresetDragOver,
        handlePresetDrop,
        handlePresetDragEnd
    } = useDynamicPresetInstances({
        state,
        update,
        updateSubstDays,
        functionKeys
    });

    const totalCreditos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'C')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const totalDescontos = state.rubricasExtras
        .filter(rubrica => rubrica.tipo === 'D')
        .reduce((total, rubrica) => total + (rubrica.valor || 0), 0);

    const gratificacaoEspecificaCalculada =
        state.gratEspecificaTipo === 'gae' || state.gratEspecificaTipo === 'gas'
            ? baseVencimento * (payrollRules?.specificGratificationRate ?? 0)
            : 0;

    const funcaoAtualValor =
        state.funcao && state.funcao !== noFunctionCode
            ? (currentTables.funcoes[state.funcao] || 0)
            : 0;

    const handleCargoChange = (nextCargo: CalculatorState['cargo']) => {
        const nextPadroes = Object.keys(currentTables.salario[nextCargo] || {});
        const fallbackPadrao = nextPadroes[0] || state.padrao;

        update('cargo', nextCargo);
        update('padrao', fallbackPadrao);
    };

    useEffect(() => {
        if (cargoOptions.length === 0) return;
        if (!state.cargo || !cargoOptions.includes(state.cargo)) {
            update('cargo', cargoOptions[0]);
        }
    }, [cargoOptions, state.cargo, update]);

    useEffect(() => {
        if (padroes.length === 0) return;
        if (!state.padrao || !padroes.includes(state.padrao)) {
            update('padrao', padroes[0]);
        }
    }, [padroes, state.padrao, update]);

    useEffect(() => {
        if (!noFunctionCode) return;
        const validFunctions = new Set([noFunctionCode, ...functionKeys]);
        if (!state.funcao) {
            update('funcao', noFunctionCode);
            return;
        }

        // Evita sobrescrever snapshot restaurado enquanto as funções ainda não carregaram.
        if (functionKeys.length === 0) {
            return;
        }

        if (!validFunctions.has(state.funcao)) {
            const normalizedCurrent = String(state.funcao).trim().toLowerCase();
            const matchedFunction = functionKeys.find(
                key => key.trim().toLowerCase() === normalizedCurrent
            );

            if (matchedFunction) {
                update('funcao', matchedFunction);
                return;
            }

            const sanitizedCurrent = normalizedCurrent.replace(/[^a-z0-9]/g, '');
            const matchedByToken = functionKeys.find(
                key => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === sanitizedCurrent
            );

            if (matchedByToken) {
                update('funcao', matchedByToken);
                return;
            }

            // Fallback para snapshots legados em formato de texto/label
            // Ex.: "Funcao Comissionada (Opcao) - FC4" ou "CJ-2"
            const tokenMatch = normalizedCurrent.match(/(fc|cj)\s*[-_ ]?\s*(\d+)/i);
            if (tokenMatch) {
                const token = `${tokenMatch[1]}${tokenMatch[2]}`.toLowerCase();
                const matchedByEmbeddedToken = functionKeys.find((key) => {
                    const normalizedKey = key.trim().toLowerCase();
                    const keyToken = normalizedKey.replace(/[^a-z0-9]/g, '');
                    return normalizedKey.includes(token) || keyToken.includes(token);
                });

                if (matchedByEmbeddedToken) {
                    update('funcao', matchedByEmbeddedToken);
                    return;
                }
            }

            update('funcao', noFunctionCode);
        }
    }, [noFunctionCode, functionKeys, state.funcao, update]);

    useEffect(() => {
        if (pssOptions.length === 0) return;
        const referenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
        const nextTabelaPSS = pickBestKeyByReference(pssOptions, state.anoRef, referenceMonth);
        if (nextTabelaPSS && state.tabelaPSS !== nextTabelaPSS) {
            update('tabelaPSS', nextTabelaPSS);
        }
    }, [pssOptions, state.tabelaPSS, state.anoRef, state.mesRef, update]);

    useEffect(() => {
        if (irOptions.length === 0) return;
        const referenceMonth = toReferenceMonthIndex(state.mesRef) || 12;
        const nextTabelaIR = pickBestKeyByReference(irOptions, state.anoRef, referenceMonth);
        if (nextTabelaIR && state.tabelaIR !== nextTabelaIR) {
            update('tabelaIR', nextTabelaIR);
        }
    }, [irOptions, state.tabelaIR, state.anoRef, state.mesRef, update]);

    const updateOvertimeEntry = (id: string, patch: Partial<OvertimeEntry>) => {
        update(
            'overtimeEntries',
            state.overtimeEntries.map((entry) => (
                entry.id === id ? { ...entry, ...patch } : entry
            ))
        );
    };

    const updateSubstitutionEntry = (id: string, patch: Partial<SubstitutionEntry>) => {
        update(
            'substitutionEntries',
            state.substitutionEntries.map((entry) => (
                entry.id === id ? { ...entry, ...patch } : entry
            ))
        );
    };

    const getPresetGrossLines = (instance: PresetInstance): PresetGrossLine[] => {
        return buildPresetGrossLines({
            instance,
            state,
            courtConfig,
            currentTables,
            isNovoAQ,
            noFunctionCode,
            currentFunctionValue: funcaoAtualValor,
            gratificacaoEspecificaCalculada
        });

    };
    const renderPreset = (instance: PresetInstance) => (
        <PresetCardContent
            instance={instance}
            state={state}
            update={update}
            styles={styles}
            isNovoAQ={isNovoAQ}
            competenciaReferencia={competenciaReferencia}
            functionKeys={functionKeys}
            updateOvertimeEntry={updateOvertimeEntry}
            updateSubstitutionEntry={updateSubstitutionEntry}
            courtConfig={courtConfig}
        />
    );

    return (
        <>
            <div className={styles.card}>
            <h3 className={styles.sectionTitle}>
                <Settings className="w-4 h-4" />
                Formulário dinâmico do holerite
            </h3>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Base obrigatória</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Cargo</label>
                        <select className={styles.input} value={state.cargo} onChange={e => handleCargoChange(e.target.value)}>
                            {cargoOptions.map(cargo => (
                                <option key={cargo} value={cargo}>
                                    {careerCatalog?.cargoLabels?.[cargo] || cargo.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Classe/Padrão</label>
                        <select className={styles.input} value={state.padrao} onChange={e => update('padrao', e.target.value)}>
                            {padroes.map(padrao => (
                                <option key={padrao} value={padrao}>{padrao}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Função (FC/CJ)</label>
                        <select className={styles.input} value={state.funcao} onChange={e => update('funcao', e.target.value)}>
                            {noFunctionCode && <option value={noFunctionCode}>{noFunctionLabel}</option>}
                            {functionKeys.map(funcao => (
                                <option key={funcao} value={funcao}>
                                    {funcao.toUpperCase()} - {formatCurrency(currentTables.funcoes[funcao])}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                        <p className={styles.label}>Salário Base</p>
                        <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(baseVencimento)}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                        <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">GAJ (140%)</p>
                        <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(gaj)}</p>
                    </div>
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                        <p className="text-label font-bold text-neutral-500 uppercase tracking-widest">Auxílio Alimentação</p>
                        <p className="text-body font-bold text-neutral-800 dark:text-neutral-100 font-mono">{formatCurrency(state.auxAlimentacao || 0)}</p>
                    </div>
                </div>

            </div>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Adicional de Qualificação</h4>
                {renderPreset({ key: 'aq-fixed', presetId: 'aq' })}
                <PresetGrossSummary lines={getPresetGrossLines({ key: 'aq-fixed', presetId: 'aq' })} />
            </div>

            <div className={styles.innerBox}>
                <h4 className={styles.innerBoxTitle}>Configurações tributárias</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={styles.label}>Regime previdenciário</label>
                        <select className={styles.input} value={state.regimePrev} onChange={e => handleRegimePrevChange(e.target.value)}>
                            <option value="antigo">RPPS - sem teto</option>
                            <option value="novo_antigo">RPPS - novo sem migração</option>
                            <option value="migrado">RPPS migrado (com teto)</option>
                            <option value="rpc">RPC (com teto)</option>
                        </select>
                    </div>
                    <div>
                        <label className={styles.label}>Dependentes (IR)</label>
                        <input type="number" className={styles.input} value={state.dependentes} onChange={e => update('dependentes', toPositiveNumber(e.target.value))} />
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" className={styles.checkbox} checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} />
                            <span>PSS sobre FC/CJ</span>
                        </label>
                    </div>
                </div>

                {showFunprespSection && previdenciaComplementar && (
                    <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
                        <h5 className="text-label font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-300">
                            Previdência Complementar (Funpresp)
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={styles.label}>Participa Funpresp</label>
                                <select
                                    className={styles.input}
                                    value={state.funprespParticipacao}
                                    onChange={e => handleFunprespParticipacaoChange(e.target.value as 'nao' | 'patrocinado')}
                                >
                                    <option value="nao">Não</option>
                                    <option value="patrocinado">Sim (Patrocinado)</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Contribuição normal patrocinada</label>
                                <select
                                    className={styles.input}
                                    value={state.funprespAliq}
                                    onChange={e => update('funprespAliq', Number(e.target.value))}
                                    disabled={state.funprespParticipacao !== 'patrocinado'}
                                >
                                    {funprespNormalOptions.map(rate => (
                                        <option key={rate} value={rate}>{toPercentLabel(rate)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Contribuição facultativa (%)</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    min={0}
                                    max={previdenciaComplementar.facultativeRate.max * 100}
                                    step={previdenciaComplementar.facultativeRate.step * 100}
                                    value={Number((state.funprespFacul * 100).toFixed(1))}
                                    onChange={e => update('funprespFacul', toDecimalRateFromPercentInput(e.target.value))}
                                    disabled={state.funprespParticipacao !== 'patrocinado'}
                                />
                            </div>
                        </div>
                        {funprespValidationError && (
                            <p className="text-body-xs text-error-600 dark:text-error-400">{funprespValidationError}</p>
                        )}
                    </div>
                )}
            </div>
        </div>

            <div className={styles.card}>
                <h3 className={styles.sectionTitle}>
                    <Settings className="w-4 h-4" />
                    Rubricas Pré-definidas
                </h3>

                <div className="space-y-3">
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                            className={`${styles.input} w-full min-w-0 sm:flex-1 sm:min-w-[20rem]`}
                            value={selectedPreset}
                            onChange={e => setSelectedPreset(e.target.value as PredefinedRubricId | '')}
                            disabled={availablePresets.length === 0}
                        >
                            {availablePresets.length === 0 && <option value="">Todas adicionadas</option>}
                            {availablePresets.map(option => (
                                <option key={option.id} value={option.id}>{getPresetPickerLabel(option.id, option.label)}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={includePreset}
                            disabled={!selectedPreset}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            Incluir
                        </button>
                        <button
                            type="button"
                            onClick={() => setReorderMode(prev => !prev)}
                            disabled={enabledPresets.length < 2 && !reorderMode}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 transition-colors text-body-xs font-bold uppercase tracking-wider disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-700 shrink-0"
                        >
                            <GripVertical className="w-4 h-4" />
                            {reorderMode ? 'Concluir ordem' : 'Reordenar cards'}
                        </button>
                    </div>
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                        Cards que podem ser adicionados mais de uma vez: {MULTI_INSTANCE_HINT_LABEL}.
                    </p>
                </div>

                {reorderMode && (
                    <p className="text-body-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        Arraste os cards para reorganizar a ordem de exibição.
                    </p>
                )}

                {enabledPresets.length === 0 && (
                    <p className="text-body text-neutral-400 italic pt-1">
                        Nenhuma rubrica pré-definida adicionada.
                    </p>
                )}
            </div>

            {enabledPresets.map(instance => {
                const preset = PREDEFINED_OPTIONS.find(option => option.id === instance.presetId);
                if (!preset) return null;

                return (
                    <div
                        key={instance.key}
                        draggable={reorderMode}
                        onDragStart={() => handlePresetDragStart(instance.key)}
                        onDragOver={handlePresetDragOver}
                        onDrop={() => handlePresetDrop(instance.key)}
                        onDragEnd={handlePresetDragEnd}
                        className={`${styles.card} space-y-4 transition-shadow ${draggingPreset === instance.key ? 'border-primary/60 shadow-lg' : ''} ${reorderMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {reorderMode && <GripVertical className="w-4 h-4 text-neutral-400" />}
                                <span className="px-2.5 py-1 rounded-full text-body-xs font-bold bg-primary/10 text-primary">{preset.label}</span>
                                {MULTI_INSTANCE_PRESETS.has(instance.presetId) && (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">
                                        Múltiplo
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => removePreset(instance)}
                                className="text-neutral-400 hover:text-error-500 p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                aria-label={`Remover ${preset.label}`}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        {renderPreset(instance)}
                        <PresetGrossSummary lines={getPresetGrossLines(instance)} />
                    </div>
                );
            })}

            <ManualRubricasSection
                rubricas={state.rubricasExtras}
                totalCreditos={totalCreditos}
                totalDescontos={totalDescontos}
                styles={styles}
                addRubrica={addRubrica}
                removeRubrica={removeRubrica}
                updateRubrica={updateRubrica}
                toPositiveNumber={toPositiveNumber}
            />
        </>
    );
};
