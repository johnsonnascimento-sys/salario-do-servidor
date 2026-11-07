import { IrEaCompetencias } from '../IrEaCompetencias';
import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
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
    const defaultDivisor = courtConfig?.payrollRules?.overtimeMonthHours || (isJMU ? 175 : 200);
    const defaultJornada = isJMU ? 35 : 40;

    const currentDivisor = entry.divisor && entry.divisor > 0 ? entry.divisor : defaultDivisor;

    const totalHoras: number = usarSubstituicaoFuncao && entry.horasPorFuncao
        ? Object.values(entry.horasPorFuncao as Record<string, { qtd50?: number; qtd100?: number }>).reduce(
            (acc: number, h) => acc + (Number(h?.qtd50) || 0) + (Number(h?.qtd100) || 0),
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

                    {/* Bloco de Jornada e Divisor */}
                    <div className="bg-white/80 dark:bg-neutral-800/80 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-body-xs font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-secondary" />
                                Jornada de Trabalho e Divisor Mensal
                            </span>
                            <span className="text-label text-neutral-400 font-normal">
                                {isJMU ? 'Res. STM 374/2025, art. 7º: (Jornada ÷ 6) × 30' : 'Res. CJF 4/2008, art. 46: (Jornada ÷ 6) × 30'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className={styles.label}>Carga Horária Semanal</label>
                                <select
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
                                <label className={styles.label}>Divisor Mensal Efetivo</label>
                                <input
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
                                <label className={`${styles.label} mb-0 shrink-0`}>Jornada semanal (h):</label>
                                <input
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
                        {isJMU && (
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={Boolean(entry.emRecesso)}
                                    onChange={e => updateEntry(entry.id, { emRecesso: e.target.checked })}
                                />
                                <span>Prestado no recesso forense / plantão (teto de 50h - art. 6º, § 1º)</span>
                            </label>
                        )}
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

                    {entry.isEA && (
                        <IrEaCompetencias
                            tipo="horas_extras"
                            value={entry.competenciasEA}
                            onChange={competenciasEA => updateEntry(entry.id, { competenciasEA })}
                            styles={styles}
                        />
                    )}

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
