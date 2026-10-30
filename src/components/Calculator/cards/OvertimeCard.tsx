import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { CourtConfig, OvertimeEntry } from '../../../types';

interface OvertimeCardProps {
    entry: OvertimeEntry;
    updateEntry: (id: string, patch: Partial<OvertimeEntry>) => void;
    functionKeys: string[];
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
}

export const OvertimeCard: React.FC<OvertimeCardProps> = ({
    entry,
    updateEntry,
    functionKeys,
    competenciaReferencia,
    styles,
    courtConfig
}) => {
    const usarSubstituicaoFuncao = Boolean(entry.usarSubstituicaoFuncao);

    const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
    const isJMU = orgSlug === 'jmu' || orgSlug === 'stm';

    const divisor = courtConfig?.payrollRules?.overtimeMonthHours || (isJMU ? 175 : 200);

    const normLabel = isJMU
        ? `Res. STM Nº 374/2025 • Divisor ${divisor}`
        : `Res. CJF Nº 4/2008 • Divisor ${divisor}`;

    const totalHoras: number = usarSubstituicaoFuncao && entry.horasPorFuncao
        ? Object.values(entry.horasPorFuncao as Record<string, { qtd50?: number; qtd100?: number }>).reduce(
            (acc: number, h) => acc + (Number(h?.qtd50) || 0) + (Number(h?.qtd100) || 0),
            0
        )
        : (Number(entry.qtd50) || 0) + (Number(entry.qtd100) || 0);

    const tetoHoras = isJMU ? 30 : 44;
    const isExcedido = totalHoras > tetoHoras;

    return (
        <div className={styles.card}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <h3 className={styles.sectionTitle}>
                    <Clock className="w-4 h-4" /> Serviço Extraordinário (HE)
                </h3>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {normLabel}
                </span>
            </div>
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    {isExcedido && (
                        <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold">Atenção ao limite regulamentar:</span> O total lançado ({totalHoras}h) excede o teto mensal de <strong>{tetoHoras} horas</strong> estabelecido {isJMU ? 'no art. 6º, caput da Resolução STM Nº 374/2025 (redação da Resolução STM nº 399/2026; limite de 50h no recesso forense)' : 'no art. 45, § 3º da Resolução CJF Nº 4/2008 (redação da Resolução CJF Nº 973/2025)'}. O cálculo é realizado integralmente para acomodar passivos e acertos retroativos.
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.isEA}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, { isEA: checked, excluirIR: checked ? false : entry.excluirIR });
                                }}
                            />
                            <span>Incluir na base do IR (Exercício Anterior - EA)</span>
                        </label>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={entry.excluirIR}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    updateEntry(entry.id, {
                                        excluirIR: checked,
                                        isEA: checked ? false : entry.isEA
                                    });
                                }}
                            />
                            <span>Excluir da base do IR</span>
                        </label>
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
                                        horasPorFuncao: checked ? (entry.horasPorFuncao || {}) : undefined
                                    });
                                }}
                            />
                            <span>Calcular por função substituída.</span>
                        </label>
                    </div>

                    {!usarSubstituicaoFuncao ? (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className={styles.label}>Qtd. Horas (50%)</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    min={0}
                                    value={entry.qtd50 || ''}
                                    onChange={e => updateEntry(entry.id, { qtd50: Math.max(0, Number(e.target.value) || 0) })}
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Qtd. Horas (100%)</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    min={0}
                                    value={entry.qtd100 || ''}
                                    onChange={e => updateEntry(entry.id, { qtd100: Math.max(0, Number(e.target.value) || 0) })}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <div className="hidden sm:grid bg-gray-50 dark:bg-[#1f2937]/50 p-2 text-xs font-semibold text-gray-600 dark:text-gray-300 grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                                <div>Função substituída no dia</div>
                                <div className="text-center">Horas (50%)</div>
                                <div className="text-center">Horas (100%)</div>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {functionKeys.map((func) => {
                                    const h50 = entry.horasPorFuncao?.[func]?.qtd50 || 0;
                                    const h100 = entry.horasPorFuncao?.[func]?.qtd100 || 0;

                                    return (
                                        <div
                                            key={func}
                                            className="p-3 sm:p-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                        >
                                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
                                                {func.toUpperCase()}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 sm:contents">
                                                <div className="sm:hidden text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    Horas (50%)
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={h50 || ''}
                                                    onChange={e => {
                                                        const val = Math.max(0, Number(e.target.value) || 0);
                                                        const current = entry.horasPorFuncao || {};
                                                        updateEntry(entry.id, {
                                                            horasPorFuncao: {
                                                                ...current,
                                                                [func]: { ...current[func], qtd50: val }
                                                            }
                                                        });
                                                    }}
                                                    className={`${styles.input} text-center h-8`}
                                                    placeholder="0"
                                                />
                                                <div className="sm:hidden text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    Horas (100%)
                                                </div>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={h100 || ''}
                                                    onChange={e => {
                                                        const val = Math.max(0, Number(e.target.value) || 0);
                                                        const current = entry.horasPorFuncao || {};
                                                        updateEntry(entry.id, {
                                                            horasPorFuncao: {
                                                                ...current,
                                                                [func]: { ...current[func], qtd100: val }
                                                            }
                                                        });
                                                    }}
                                                    className={`${styles.input} text-center h-8`}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
