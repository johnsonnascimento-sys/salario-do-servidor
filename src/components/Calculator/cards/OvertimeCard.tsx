import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { CourtConfig, OvertimeEntry } from '../../../types';

interface OvertimeCardProps {
    entry: OvertimeEntry;
    updateEntry: (id: string, patch: Partial<OvertimeEntry>) => void;
    functionKeys: string[];
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
    gaactaAtivo?: boolean;
    gaactaRecesso?: boolean;
}

export const OvertimeCard: React.FC<OvertimeCardProps> = ({
    entry,
    updateEntry,
    functionKeys,
    styles,
    courtConfig,
    gaactaAtivo,
    gaactaRecesso
}) => {
    const usarSubstituicaoFuncao = Boolean(entry.usarSubstituicaoFuncao);

    const orgSlug = (courtConfig?.orgSlug || '').toLowerCase();
    const isJMU = orgSlug === 'jmu' || orgSlug === 'stm';

    const totalHoras: number = usarSubstituicaoFuncao && entry.horasPorFuncao
        ? Object.values(entry.horasPorFuncao as Record<string, { qtd50?: number; qtd100?: number }>).reduce(
            (acc: number, h) => acc + (Number(h?.qtd50) || 0) + (Number(h?.qtd100) || 0),
            0
        )
        : (Number(entry.qtd50) || 0) + (Number(entry.qtd100) || 0);

    const tetoHoras = isJMU ? 30 : 44;
    const isExcedido = totalHoras > tetoHoras;

    return (
        <div className="space-y-4">
            <div className={styles.innerBox}>
                <div className="space-y-4">
                    {gaactaAtivo && !gaactaRecesso && (
                        <div className="p-3 rounded-xl bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800/60 text-body-xs text-error-800 dark:text-error-300 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-error-600 dark:text-error-400" />
                            <div className="space-y-0.5">
                                <span className="font-bold text-body-xs block text-error-900 dark:text-error-200">Incompatibilidade Legal (Res. STM nº 397/2026, art. 6º)</span>
                                <p className="text-body-xs text-error-800 dark:text-error-300">
                                    O acúmulo da GAACTA é incompatível com a prestação de serviço extraordinário. Em período concomitante, o servidor deverá <strong>optar</strong> entre a GAACTA e o serviço extraordinário (salvo no período do recesso judiciário).
                                </p>
                            </div>
                        </div>
                    )}
                    {isExcedido && (
                        <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800/60 text-body-xs text-warning-800 dark:text-warning-300 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning-600 dark:text-warning-400" />
                            <div className="space-y-0.5">
                                <span className="font-bold text-body-xs block text-warning-900 dark:text-warning-200">Atenção ao limite regulamentar:</span>
                                <p className="text-body-xs text-warning-800 dark:text-warning-300">
                                    O total lançado ({totalHoras}h) excede o teto mensal de <strong>{tetoHoras} horas</strong> estabelecido {isJMU ? 'no art. 6º, caput da Resolução STM Nº 374/2025 (redação da Resolução STM nº 399/2026; limite de 50h no recesso forense)' : 'no art. 45, § 3º da Resolução CJF Nº 4/2008 (redação da Resolução CJF Nº 973/2025)'}. O cálculo é realizado integralmente para acomodar passivos e acertos retroativos.
                                </p>
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
                        <div className="mt-4 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                            <div className="hidden sm:grid bg-neutral-50 dark:bg-neutral-900/40 p-2 text-body-xs font-semibold text-neutral-600 dark:text-neutral-300 grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
                                <div>Função substituída no dia</div>
                                <div className="text-center">Horas (50%)</div>
                                <div className="text-center">Horas (100%)</div>
                            </div>
                            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {functionKeys.map((func) => {
                                    const h50 = entry.horasPorFuncao?.[func]?.qtd50 || 0;
                                    const h100 = entry.horasPorFuncao?.[func]?.qtd100 || 0;

                                    return (
                                        <div
                                            key={func}
                                            className="p-3 sm:p-2 grid grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:items-center hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors"
                                        >
                                            <div className="text-body-xs font-medium text-neutral-700 dark:text-neutral-300 break-words">
                                                {func.toUpperCase()}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 sm:contents">
                                                <div className="sm:hidden text-label font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
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
                                                <div className="sm:hidden text-label font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
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
