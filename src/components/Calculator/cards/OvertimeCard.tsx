import { IrEaCompetencias, getDefaultEaCompetencia } from '../IrEaCompetencias';
import React from 'react';
import { AlertTriangle, Clock, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { IR_OPTIONS, IR_SUMMARY, TaxAdjustmentPanel, TaxChoices } from '../TaxAdjustmentPanel';
import { CourtConfig, OvertimeEntry } from '../../../types';
import type { OvertimeFunctionDetail } from '../../../types/irEa';

interface OvertimeCardProps {
    entry: OvertimeEntry;
    updateEntry: (id: string, patch: Partial<OvertimeEntry>) => void;
    functionKeys: string[];
    eligibleFunctionKeys?: string[];
    functionDetails?: OvertimeFunctionDetail[];
    grossTotal?: number;
    calculationReady?: boolean;
    baseItems?: Array<{ key: string; label: string; valor: number; selecionado: boolean }>;
    baseTotal?: number;
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
    gaactaAtivo?: boolean;
    gaactaRecesso?: boolean;
}

export const OvertimeCard: React.FC<OvertimeCardProps> = ({
    entry: savedEntry,
    updateEntry: saveEntry,
    functionKeys,
    eligibleFunctionKeys = [],
    functionDetails = [],
    grossTotal = 0,
    calculationReady = true,
    baseItems = [],
    competenciaReferencia,
    styles,
    courtConfig,
    gaactaAtivo,
    gaactaRecesso
}) => {
    const fieldId = React.useId();
    const [taxOpen, setTaxOpen] = React.useState(Boolean(savedEntry.isEA || savedEntry.excluirIR));
    const [draft, setDraft] = React.useState<OvertimeEntry | null>(null);
    const [dismissedGaactaWarning, setDismissedGaactaWarning] = React.useState(false);
    const [functionToAdd, setFunctionToAdd] = React.useState('');
    const functionSelectRef = React.useRef<HTMLSelectElement>(null);
    const firstHoursRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
    const addedFunctionRef = React.useRef<string | null>(null);
    const focusFunctionSelectRef = React.useRef(false);
    const cardContentRef = React.useRef<HTMLDivElement>(null);
    const wasEditing = React.useRef(false);
    React.useLayoutEffect(() => {
        const isEditing = Boolean(draft);
        if (isEditing !== wasEditing.current) {
            cardContentRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
            wasEditing.current = isEditing;
        }
    }, [Boolean(draft)]);
    const entry = draft ?? savedEntry;
    const irRegime = entry.excluirIR ? 'excluir' : entry.isEA ? 'rra' : 'mensal';
    const updateEntry = (id: string, patch: Partial<OvertimeEntry>) => {
        if (draft) setDraft(current => current ? { ...current, ...patch } : current);
        else saveEntry(id, patch);
    };
    const usarSubstituicaoFuncao = Boolean(entry.usarSubstituicaoFuncao);
    const selectedFunctions = Object.keys(entry.horasPorFuncao || {});
    const availableFunctions = functionKeys.filter(func => !selectedFunctions.includes(func));
    const canAddFunction = calculationReady && availableFunctions.some(func => eligibleFunctionKeys.includes(func));
    React.useLayoutEffect(() => {
        if (focusFunctionSelectRef.current && canAddFunction) {
            functionSelectRef.current?.focus();
            focusFunctionSelectRef.current = false;
        }
    }, [canAddFunction, entry.horasPorFuncao]);
    React.useLayoutEffect(() => {
        const func = addedFunctionRef.current;
        if (func && selectedFunctions.includes(func) && !firstHoursRefs.current[func]?.disabled) {
            firstHoursRefs.current[func]?.focus();
            addedFunctionRef.current = null;
        }
    }, [entry.horasPorFuncao]);
    const addFunction = () => {
        if (!calculationReady || !availableFunctions.includes(functionToAdd) || !eligibleFunctionKeys.includes(functionToAdd)) return;
        addedFunctionRef.current = functionToAdd;
        focusFunctionSelectRef.current = false;
        updateEntry(entry.id, { horasPorFuncao: { ...entry.horasPorFuncao, [functionToAdd]: { qtd50: 0, qtd100: 0 } } });
        setFunctionToAdd('');
    };
    const removeFunction = (func: string) => {
        const next = { ...entry.horasPorFuncao };
        delete next[func];
        focusFunctionSelectRef.current = true;
        updateEntry(entry.id, { horasPorFuncao: next });
    };

    const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
    const isJMU = orgSlug === 'jmu' || orgSlug === 'stm';
    const defaultDivisor = courtConfig?.payrollRules?.overtimeMonthHours || (isJMU ? 175 : 200);
    const defaultJornada = isJMU ? 35 : 40;

    const currentDivisor = entry.divisor && entry.divisor > 0 ? entry.divisor : defaultDivisor;

    const totalHoras: number = usarSubstituicaoFuncao
        ? Object.entries((entry.horasPorFuncao || {}) as Record<string, { qtd50?: number; qtd100?: number }>).reduce(
            (acc: number, [key, h]) => acc + (eligibleFunctionKeys.includes(key) ? (Number(h?.qtd50) || 0) + (Number(h?.qtd100) || 0) : 0),
            0
        )
        : (Number(entry.qtd50) || 0) + (Number(entry.qtd100) || 0);

    const tetoHoras = isJMU ? (entry.emRecesso ? 50 : 30) : 44;
    const isExcedido = totalHoras > tetoHoras;

    const isStandardPreset = (hours?: number, div?: number): string | null => {
        if (isJMU) {
            if (hours === 35 && div === 175) return '35';
            if (hours === 30 && div === 150) return '30';
            if (hours === 20 && div === 100) return '20';
        } else {
            if (hours === 40 && div === 200) return '40';
            if (hours === 35 && div === 175) return '35';
            if (hours === 30 && div === 150) return '30';
            if (hours === 20 && div === 100) return '20';
        }
        return null;
    };

    const getJornadaOption = (): string => {
        if (entry.jornadaPersonalizada === true) {
            return 'custom';
        }
        if (entry.jornadaPersonalizada === false) {
            const standard = isStandardPreset(entry.jornadaSemanal, currentDivisor);
            if (standard) return standard;
            return isJMU ? '35' : '40';
        }
        // Fallback para entradas sem a flag explícita (retrocompatibilidade)
        if (entry.jornadaSemanal !== undefined) {
            const standard = isStandardPreset(entry.jornadaSemanal, currentDivisor);
            if (standard) return standard;
            return 'custom';
        }
        if (entry.divisor !== undefined) {
            const standard = isStandardPreset(defaultJornada, entry.divisor);
            if (standard) return standard;
            return 'custom';
        }
        return isJMU ? '35' : '40';
    };

    const selectedOption = getJornadaOption();

    const handleJornadaChange = (val: string) => {
        if (val === '35') {
            updateEntry(entry.id, { jornadaPersonalizada: false, jornadaSemanal: 35, divisor: 175 });
        } else if (val === '40') {
            updateEntry(entry.id, { jornadaPersonalizada: false, jornadaSemanal: 40, divisor: 200 });
        } else if (val === '30') {
            updateEntry(entry.id, { jornadaPersonalizada: false, jornadaSemanal: 30, divisor: 150 });
        } else if (val === '20') {
            updateEntry(entry.id, { jornadaPersonalizada: false, jornadaSemanal: 20, divisor: 100 });
        } else if (val === 'custom') {
            const j = entry.jornadaSemanal || defaultJornada;
            const d = entry.divisor || Math.round((j / 6) * 30 * 100) / 100;
            updateEntry(entry.id, { jornadaPersonalizada: true, jornadaSemanal: j, divisor: d });
        }
    };

    const handleCustomJornadaChange = (valStr: string) => {
        if (valStr === '') {
            updateEntry(entry.id, { jornadaPersonalizada: true, jornadaSemanal: undefined });
            return;
        }
        const j = Number(valStr);
        if (isNaN(j) || j < 0) return;
        const d = j > 0 ? Math.round((j / 6) * 30 * 100) / 100 : 0;
        updateEntry(entry.id, {
            jornadaPersonalizada: true,
            jornadaSemanal: j,
            divisor: d > 0 ? d : undefined
        });
    };

    const handleDivisorChange = (raw: string) => {
        if (raw === '') {
            updateEntry(entry.id, { divisor: undefined, jornadaPersonalizada: true });
            return;
        }
        const div = Number(raw);
        if (isNaN(div) || div < 0) return;
        updateEntry(entry.id, {
            divisor: div > 0 ? div : undefined,
            jornadaPersonalizada: true
        });
    };

    return (
        <div ref={cardContentRef} className="space-y-4 scroll-mt-4">
            {!draft && <>
            <div className="space-y-4">
                    {gaactaAtivo && !gaactaRecesso && !dismissedGaactaWarning && (
                        <div className="p-3 rounded-xl bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800/60 text-body-xs text-error-800 dark:text-error-300 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-error-600 dark:text-error-400" />
                            <div className="flex-1 space-y-0.5">
                                <span className="font-bold text-body-xs block text-error-900 dark:text-error-200">Incompatibilidade Legal (Res. STM nº 397/2026, art. 6º)</span>
                                <p className="text-body-xs text-error-800 dark:text-error-300">
                                    O acúmulo da GAACTA é incompatível com a prestação de serviço extraordinário. Em período concomitante, o servidor deverá <strong>optar</strong> entre a GAACTA e o serviço extraordinário (salvo no período do recesso judiciário).
                                </p>
                            </div>
                            <button type="button" onClick={() => setDismissedGaactaWarning(true)} className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-error-600" aria-label="Fechar alerta de incompatibilidade com a GAACTA">Fechar</button>
                        </div>
                    )}
                    {isExcedido && (
                        <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800/60 text-body-xs text-warning-800 dark:text-warning-300 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning-600 dark:text-warning-400" />
                            <div className="space-y-0.5">
                                <span className="font-bold text-body-xs block text-warning-900 dark:text-warning-200">Atenção ao limite regulamentar:</span>
                                <p className="text-body-xs text-warning-800 dark:text-warning-300">
                                    {isJMU ? (
                                        <>
                                            O total lançado ({totalHoras}h) excede o teto mensal de <strong>{tetoHoras} horas</strong> estabelecido {entry.emRecesso ? 'no art. 6º, § 1º da Resolução STM Nº 374/2025 para período de recesso forense' : 'no art. 6º, caput da Resolução STM Nº 374/2025 (redação da Resolução STM nº 399/2026; limite de 50h no recesso forense)'}. O cálculo é realizado integralmente para acomodar passivos e acertos retroativos.
                                        </>
                                    ) : (
                                        <>
                                            O total lançado ({totalHoras}h) excede o teto mensal de <strong>44 horas</strong> estabelecido no art. 45, § 3º da Resolução CJF Nº 4/2008 (redação da Resolução CJF Nº 973/2025). O cálculo é realizado integralmente para acomodar passivos e acertos retroativos.
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

            </div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="flex flex-col gap-1">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={usarSubstituicaoFuncao}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        updateEntry(entry.id, {
                                            usarSubstituicaoFuncao: checked,
                                            qtd50: checked ? 0 : entry.qtd50,
                                            qtd100: checked ? 0 : entry.qtd100,
                                            horasPorFuncao: entry.horasPorFuncao || {}
                                        });
                                    }}
                                />
                                <span>Calcular horas extras durante substituição de função</span>
                            </label>
                            {usarSubstituicaoFuncao && (
                                <p className="pl-6 text-body-xs text-neutral-500 dark:text-neutral-400">
                                    Informe as horas correspondentes a cada função ou cargo substituído.
                                </p>
                            )}
                        </div>
                    </div>

                    {!usarSubstituicaoFuncao ? (
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor={`${fieldId}-field-4`} className={styles.label}>Qtd. Horas (50%)</label>
                                    <input id={`${fieldId}-field-4`}
                                        type="number"
                                        className={styles.input}
                                        min={0}
                                        value={entry.qtd50 || ''}
                                        onChange={e => updateEntry(entry.id, { qtd50: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor={`${fieldId}-field-5`} className={styles.label}>Qtd. Horas (100%)</label>
                                    <input id={`${fieldId}-field-5`}
                                        type="number"
                                        className={styles.input}
                                        min={0}
                                        value={entry.qtd100 || ''}
                                        onChange={e => updateEntry(entry.id, { qtd100: Math.max(0, Number(e.target.value) || 0) })}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                                <span className="text-body-xs text-neutral-600 dark:text-neutral-400">Subtotal bruto</span>
                                <output aria-label="Subtotal bruto de horas extras" className="font-mono text-body font-semibold text-neutral-900 dark:text-neutral-100">
                                    {calculationReady ? grossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Atualizando…'}
                                </output>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <p className="p-3 text-body-xs text-neutral-500 dark:text-neutral-400">
                                Apenas funções que geram diferença de substituição estão habilitadas. Funções menores ou iguais não geram valor neste modo. Para calcular horas extras pela sua função atual, desmarque a opção de substituição.
                            </p>
                            <div className="py-3 border-y border-neutral-200 dark:border-neutral-700 space-y-2">
                                <label htmlFor={`${fieldId}-function-select`} className={styles.label}>Selecione a função substituída</label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select id={`${fieldId}-function-select`} ref={functionSelectRef}
                                        className={`${styles.input} min-w-0 flex-1`} value={availableFunctions.includes(functionToAdd) ? functionToAdd : ''}
                                        disabled={!canAddFunction} onChange={e => setFunctionToAdd(e.target.value)}>
                                        <option value="">Selecione uma função</option>
                                        {availableFunctions.map(func => <option key={func} value={func} disabled={!eligibleFunctionKeys.includes(func)}>
                                            {func.toUpperCase()}{!eligibleFunctionKeys.includes(func) ? ' — Sem diferença de substituição' : ''}
                                        </option>)}
                                    </select>
                                    <button type="button" onClick={addFunction}
                                        disabled={!canAddFunction || !availableFunctions.includes(functionToAdd) || !eligibleFunctionKeys.includes(functionToAdd)}
                                        className="min-h-11 shrink-0 rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed dark:bg-neutral-200 dark:text-neutral-900">
                                        Adicionar função
                                    </button>
                                </div>
                                <p role="status" className="text-body-xs text-neutral-500 dark:text-neutral-400">
                                    {!calculationReady ? 'Atualizando cálculo e funções elegíveis…'
                                        : functionKeys.length === 0 ? 'Catálogo de funções indisponível para esta simulação.'
                                        : !eligibleFunctionKeys.length ? 'Nenhuma função gera diferença de substituição nesta simulação.'
                                        : !canAddFunction ? 'Todas as funções elegíveis já foram adicionadas.'
                                        : selectedFunctions.length === 0 ? 'Adicione uma função para informar as horas trabalhadas.' : 'Você pode adicionar outra função, se necessário.'}
                                </p>
                            </div>
                            <div className="divide-y divide-neutral-200 dark:divide-neutral-700" aria-busy={!calculationReady}>
                                {selectedFunctions.map(func => {
                                    const eligible = eligibleFunctionKeys.includes(func);
                                    const inCatalog = functionKeys.includes(func);
                                    const hours = entry.horasPorFuncao![func];
                                    const detail = functionDetails.find(item => item.funcao === func);
                                    return (
                                        <div key={func} className="p-3 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0 text-body-xs font-semibold text-neutral-700 dark:text-neutral-300 break-words">
                                                    {func.toUpperCase()}
                                                    {!inCatalog && <span className="block font-normal text-warning-700 dark:text-warning-300">Função indisponível no catálogo. Revise este lançamento.</span>}
                                                    {inCatalog && calculationReady && !eligible && <span className="block font-normal text-neutral-500 dark:text-neutral-400">Sem diferença de substituição. Horas preservadas, sem valor neste modo.</span>}
                                                </div>
                                                <button type="button" aria-label={`Remover ${func.toUpperCase()}`} onClick={() => removeFunction(func)}
                                                    className="min-h-11 shrink-0 rounded-lg px-3 text-body-xs font-semibold text-error-700 hover:bg-error-50 dark:text-error-300 dark:hover:bg-error-950/30">
                                                    Remover
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-end">
                                                {(['qtd50', 'qtd100'] as const).map((kind, index) => (
                                                    <div key={kind} className="min-w-0">
                                                        <label htmlFor={`${fieldId}-${func}-${kind}`} className={styles.label}>Horas ({index === 0 ? '50%' : '100%'})</label>
                                                        <input id={`${fieldId}-${func}-${kind}`} ref={index === 0 ? node => { firstHoursRefs.current[func] = node; } : undefined}
                                                            type="number" min="0" step="any" value={hours[kind] || ''}
                                                            disabled={!inCatalog || (calculationReady && !eligible)} readOnly={!calculationReady}
                                                            aria-label={`${func.toUpperCase()} — Horas (${index === 0 ? '50%' : '100%'})`}
                                                            onChange={e => {
                                                                const value = Number(e.target.value);
                                                                updateEntry(entry.id, { horasPorFuncao: {
                                                                    ...entry.horasPorFuncao,
                                                                    [func]: { ...hours, [kind]: Number.isFinite(value) ? Math.max(0, value) : 0 }
                                                                } });
                                                            }}
                                                            className={`${styles.input} min-h-11 disabled:opacity-40 disabled:cursor-not-allowed`} placeholder="0" />
                                                    </div>
                                                ))}
                                                <div className="min-w-0 text-body-xs text-neutral-600 dark:text-neutral-400">
                                                    <span className="block">Subtotal bruto</span>
                                                    <output aria-label={`${func.toUpperCase()} — Subtotal bruto`} className="block py-3 font-mono font-semibold text-neutral-800 dark:text-neutral-200 break-words">
                                                        {!calculationReady ? 'Atualizando…' : detail
                                                            ? detail.heTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                            : 'Aguardando cálculo…'}
                                                    </output>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

            <TaxAdjustmentPanel open={taxOpen} onToggle={setTaxOpen} summary={IR_SUMMARY[irRegime]}>
                <TaxChoices title="Imposto de Renda (IR)" name={`${fieldId}-tributacao`} value={irRegime}
                    options={IR_OPTIONS} onChange={value => updateEntry(entry.id, {
                        isEA: value === 'rra',
                        excluirIR: value === 'excluir',
                        competenciasEA: value === 'rra' && !entry.competenciasEA?.length
                            ? [getDefaultEaCompetencia(competenciaReferencia)] : entry.competenciasEA
                    })} />
                {irRegime === 'rra' && (
                    <IrEaCompetencias compact tipo="horas_extras" value={entry.competenciasEA}
                        onChange={competenciasEA => updateEntry(entry.id, { competenciasEA })}
                        styles={styles} competenciaReferencia={competenciaReferencia} />
                )}
            </TaxAdjustmentPanel>
            <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold dark:border-neutral-600" onClick={() => setDraft(structuredClone(savedEntry))}>
                    <SlidersHorizontal size={16} aria-hidden="true" />Personalizar cálculo
                </button>
            </div>
            </>}
            {draft && <section className="space-y-4" aria-label="Personalizar cálculo de Serviço Extraordinário">
                <h4 className="text-h5 text-neutral-900 dark:text-neutral-100">Personalizar horas extras</h4>
                    <details className="group" open={selectedOption === 'custom' || undefined}>
                        <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40 px-3 py-2 text-body font-semibold text-neutral-700 dark:text-neutral-300 hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary min-h-11 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700">
                            <Clock className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                            <span>Jornada e divisor</span>
                            <span className="font-normal text-neutral-500 dark:text-neutral-400">Divisor: {currentDivisor}</span>
                            <ChevronDown className="w-3.5 h-3.5 shrink-0 group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        <div className="mt-2.5">
                    <div className="bg-white/80 dark:bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-body-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-secondary" />
                                Jornada semanal e divisor mensal
                            </span>
                            <span className="text-label text-neutral-500 dark:text-neutral-400 font-normal">
                                {isJMU ? 'Res. STM 374/2025, art. 7º: (Jornada ÷ 6) × 30' : 'Res. CJF 4/2008, art. 46: (Jornada ÷ 6) × 30'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor={`${fieldId}-field-1`} className={styles.label}>Jornada semanal</label>
                                <select id={`${fieldId}-field-1`}
                                    className={styles.input}
                                    value={selectedOption}
                                    onChange={e => handleJornadaChange(e.target.value)}
                                >
                                    {isJMU ? (
                                        <>
                                            <option value="35">35h semanais (Divisor 175) — Padrão da JMU (art. 7º, § 1º, I)</option>
                                            <option value="30">30h semanais (Divisor 150) — Jornada especial (art. 7º, § 1º, II)</option>
                                            <option value="20">20h semanais (Divisor 100) — Jornada especial (art. 7º, § 1º, III)</option>
                                            <option value="custom">Outra jornada personalizada (art. 7º, § 2º)...</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="40">40h semanais (Divisor 200) — Padrão da JF (art. 46, § 1º)</option>
                                            <option value="35">35h semanais (Divisor 175) — Jornada especial de 35h</option>
                                            <option value="30">30h semanais (Divisor 150) — Jornada especial de 30h</option>
                                            <option value="20">20h semanais (Divisor 100) — Médicos / Odontólogos (Lei 9.436/97)</option>
                                            <option value="custom">Outra jornada personalizada...</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label htmlFor={`${fieldId}-field-2`} className={styles.label}>Divisor mensal</label>
                                <input id={`${fieldId}-field-2`}
                                    type="number"
                                    min="1"
                                    step="any"
                                    className={styles.input}
                                    value={entry.divisor !== undefined ? entry.divisor : (entry.jornadaPersonalizada ? '' : defaultDivisor)}
                                    placeholder={String(defaultDivisor)}
                                    onChange={e => handleDivisorChange(e.target.value)}
                                    title="Divisor mensal correspondente à jornada para cálculo da hora normal"
                                />
                            </div>
                        </div>

                        {selectedOption === 'custom' && (
                            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center gap-3 flex-wrap">
                                <label htmlFor={`${fieldId}-field-3`} className={`${styles.label} mb-0 shrink-0`}>Jornada semanal (h):</label>
                                <input id={`${fieldId}-field-3`}
                                    type="number"
                                    min="1"
                                    max="80"
                                    step="0.5"
                                    className={`${styles.input} max-w-[120px] py-1.5 h-9`}
                                    value={entry.jornadaSemanal ?? ''}
                                    placeholder="Ex: 25"
                                    onChange={e => handleCustomJornadaChange(e.target.value)}
                                />
                                <span className="text-body-xs text-neutral-500 dark:text-neutral-400">
                                    Fórmula: ({entry.jornadaSemanal ?? 0} ÷ 6) × 30 = <strong>{currentDivisor}</strong>
                                </span>
                            </div>
                        )}
                    </div>

                        </div>
                    </details>

            <div className="space-y-3">
                <p className="mt-3 text-body-xs text-neutral-500 dark:text-neutral-400">
                    Selecione as parcelas que compõem a remuneração para fins de cálculo da hora extra:
                </p>
                <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 [&>label]:py-3">
                    {baseItems.map(part => (
                        <label key={part.key} className={styles.checkboxLabel}>
                            <input type="checkbox" className={styles.checkbox} checked={draft.composicaoBase?.[part.key] ?? part.selecionado} aria-label={`Incluir ${part.label} na base de HE`}
                                onChange={e => { const checked = e.target.checked; setDraft(current => current ? { ...current, composicaoBase: { ...current.composicaoBase, [part.key]: checked } } : current); }} />
                            <span className="flex flex-1 justify-between gap-2 text-body-xs">
                                <span>{part.label}</span>
                                <span className="shrink-0 font-mono font-semibold text-neutral-600 dark:text-neutral-400">{part.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </span>
                        </label>
                    ))}
                </div>
                <p className="mt-3 text-body-xs text-neutral-500 dark:text-neutral-400">GAACTA e créditos dinâmicos entram somente quando selecionados. A seleção é uma opção da simulação e deve refletir as parcelas admitidas na sua folha.</p>
            </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className="min-h-11 rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-600" onClick={() => setDraft(null)}>Cancelar</button>
                    <button type="button" className="min-h-11 rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white dark:bg-neutral-200 dark:text-neutral-900" onClick={() => { saveEntry(savedEntry.id, { composicaoBase: draft.composicaoBase, jornadaPersonalizada: draft.jornadaPersonalizada, jornadaSemanal: draft.jornadaSemanal, divisor: draft.divisor }); setDraft(null); }}>Aplicar ajustes</button>
                </div>
            </section>}

        </div>
    );
};
