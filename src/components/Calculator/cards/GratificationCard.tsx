import React, { useMemo } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';
import { getGratificationSelectionPatch } from '../../../utils/gratificationSelection';

interface GratificationCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    courtConfig?: CourtConfig;
    competenciaReferencia?: string;
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const GratificationCard: React.FC<GratificationCardProps> = ({ state, update, styles, courtConfig }) => {
    const noFunctionCode = courtConfig?.careerCatalog?.noFunctionCode;
    const funcaoValorBruta = useMemo(() => {
        if (!state.funcao || state.funcao === noFunctionCode || !courtConfig?.bases?.funcoes) {
            return 0;
        }
        return courtConfig.bases.funcoes[state.funcao] || 0;
    }, [state.funcao, noFunctionCode, courtConfig]);

    const temAbonoAtivo = Boolean(state.recebeAbono);
    const valorAbono = temAbonoAtivo
        ? (Number(state.abonoPermanencia) || Number(state.pssMensal) || 0)
        : 0;

    const creditRubricas = useMemo(() => {
        return (state.rubricasExtras || []).filter(r => r.tipo === 'C');
    }, [state.rubricasExtras]);

    const specificGratRate = courtConfig?.payrollRules?.specificGratificationRate ?? 0.35;

    // Incidências: Vencimento Básico selecionado por padrão (Lei 11.416/06, arts. 16 e 17).
    // Demais créditos desmarcados por padrão.
    const incideVenc = state.gratIncideVencimento !== false;
    const incideGAJ = Boolean(state.gratIncideGAJ);
    const incideFuncao = Boolean(state.gratIncideFuncao);
    const incideAQTitulo = Boolean(state.gratIncideAQTitulo);
    const incideAQTreino = Boolean(state.gratIncideAQTreino);
    const incideVPNI = Boolean(state.gratIncideVPNI);
    const incideATS = Boolean(state.gratIncideATS);
    const incideAbono = Boolean(state.gratIncideAbono);

    // Base apurada da gratificação com as seleções dinâmicas
    const totalBaseApurada = useMemo(() => {
        let total = 0;
        if (incideVenc) total += (state.vencimento || 0);
        if (incideGAJ) total += (state.gaj || 0);
        if (incideFuncao) total += funcaoValorBruta;
        if (incideAQTitulo) total += (state.aqTituloValor || 0);
        if (incideAQTreino) total += (state.aqTreinoValor || 0);
        if (incideVPNI) total += (state.vpni_lei || 0) + (state.vpni_decisao || 0);
        if (incideATS) total += (state.ats || 0);
        if (incideAbono && temAbonoAtivo) total += valorAbono;

        if (state.gratRubricasInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'C' && state.gratRubricasInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.gratOutrasParcelas && state.gratOutrasParcelas > 0) {
            total += state.gratOutrasParcelas;
        }

        return roundCurrency(total);
    }, [
        incideVenc,
        incideGAJ,
        incideFuncao,
        funcaoValorBruta,
        incideAQTitulo,
        incideAQTreino,
        incideVPNI,
        incideATS,
        incideAbono,
        temAbonoAtivo,
        valorAbono,
        state.vencimento,
        state.gaj,
        state.aqTituloValor,
        state.aqTreinoValor,
        state.vpni_lei,
        state.vpni_decisao,
        state.ats,
        state.gratRubricasInclusas,
        state.rubricasExtras,
        state.gratOutrasParcelas
    ]);

    const isGratAtiva = state.gratEspecificaTipo === 'gae' || state.gratEspecificaTipo === 'gas';
    const valorGratificacaoCalculada = useMemo(() => {
        if (!isGratAtiva) return 0;
        return roundCurrency(totalBaseApurada * specificGratRate);
    }, [isGratAtiva, totalBaseApurada, specificGratRate]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={styles.label}>Tipo de Gratificação</label>
                    <select
                        className={styles.input}
                        value={state.gratEspecificaTipo}
                        onChange={e => {
                            const patch = getGratificationSelectionPatch(e.target.value, courtConfig);
                            Object.entries(patch).forEach(([field, value]) => update(field as keyof CalculatorState, value));
                        }}
                    >
                        <option value="0">Nenhuma</option>
                        <option value="gae">GAE (35% - Atividade Externa)</option>
                        <option value="gas">GAS (35% - Atividade de Segurança)</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <label className={`${styles.checkboxLabel} pb-2`}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={state.incidirPSSGrat}
                            onChange={e => update('incidirPSSGrat', e.target.checked)}
                        />
                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">
                            Incluir na base de cálculo do PSS
                        </span>
                    </label>
                </div>
            </div>

            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                A Gratificação de Atividade Externa (GAE) e a Gratificação de Atividade de Segurança (GAS) correspondem a 35% do vencimento básico do servidor (arts. 16, § 1º, e 17, § 1º, da Lei nº 11.416/2006). Por padrão legal, apenas o Vencimento Básico permanece selecionado.
            </p>

            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                A GAE integra a remuneração do cargo e compõe a base do PSS. A GAS depende do exercício da atividade de segurança e fica fora dessa base por padrão, por não se incorporar à aposentadoria, ressalvados a opção de inclusão e o enquadramento previdenciário aplicável. Fontes: {' '}
                <a className="text-primary underline" href="https://scon.stj.jus.br/SCON/GetInteiroTeorDoAcordao?dt_publicacao=24%2F09%2F2020&num_registro=201903436453" target="_blank" rel="noopener noreferrer">STJ, AgInt no REsp 1.849.491/SP</a> e {' '}
                <a className="text-primary underline" href="https://www.cjf.jus.br/cjf/noticias/2020/11-novembro/gratificacao-de-atividade-de-seguranca-nao-incorpora-aos-proventos-de-aposentadoria-do-servidor-publico" target="_blank" rel="noopener noreferrer">TNU, Tema 257</a>.
            </p>
            {isGratAtiva && typeof courtConfig?.payrollRules?.specificGratificationPssDefaults?.[state.gratEspecificaTipo as 'gae' | 'gas'] !== 'boolean' && (
                <p role="status" className="text-body-xs text-amber-700 dark:text-amber-300">
                    Padrão de PSS ainda não cadastrado para esta gratificação. Confira a seleção previdenciária antes de concluir a simulação.
                </p>
            )}

            {/* Composição da Base da Remuneração (similar ao 13º e GAACTA) */}
            <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={styles.label}>
                        Composição da Base de Cálculo (GAE / GAS)
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Selecione as parcelas que compõem a base
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Vencimento Básico (Padrão: Selecionado) */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideVenc}
                            onChange={e => update('gratIncideVencimento', e.target.checked)}
                        />
                        <span className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-body-xs text-neutral-700 dark:text-neutral-300 font-medium">
                                Vencimento Básico (Padrão legal)
                            </span>
                            <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.vencimento)}</span>
                        </span>
                    </label>

                    {/* GAJ (140%) (Padrão: Não selecionado) */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideGAJ}
                            onChange={e => update('gratIncideGAJ', e.target.checked)}
                        />
                        <span className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-body-xs text-neutral-700 dark:text-neutral-300">GAJ (140%)</span>
                            <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.gaj)}</span>
                        </span>
                    </label>

                    {/* FC / CJ (Padrão: Não selecionado) */}
                    {funcaoValorBruta > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideFuncao}
                                onChange={e => update('gratIncideFuncao', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">FC / CJ</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(funcaoValorBruta)}</span>
                            </span>
                        </label>
                    )}

                    {/* AQ Títulos (Padrão: Não selecionado) */}
                    {(state.aqTituloValor || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideAQTitulo}
                                onChange={e => update('gratIncideAQTitulo', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Títulos</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTituloValor || 0)}</span>
                            </span>
                        </label>
                    )}

                    {/* AQ Treinamento (Padrão: Não selecionado) */}
                    {(state.aqTreinoValor || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideAQTreino}
                                onChange={e => update('gratIncideAQTreino', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Treinamento</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTreinoValor || 0)}</span>
                            </span>
                        </label>
                    )}

                    {/* VPNI (Lei e Decisão Judicial) (Padrão: Não selecionado) */}
                    {((state.vpni_lei || 0) > 0 || (state.vpni_decisao || 0) > 0) && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideVPNI}
                                onChange={e => update('gratIncideVPNI', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">VPNI (Quintos/Graduação)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency((state.vpni_lei || 0) + (state.vpni_decisao || 0))}</span>
                            </span>
                        </label>
                    )}

                    {/* ATS (Anuênios) (Padrão: Não selecionado) */}
                    {(state.ats || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideATS}
                                onChange={e => update('gratIncideATS', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">ATS (Anuênios)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.ats)}</span>
                            </span>
                        </label>
                    )}

                    {/* Abono de Permanência (Padrão: Não selecionado) */}
                    <label className={`${styles.checkboxLabel} ${!temAbonoAtivo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            disabled={!temAbonoAtivo}
                            checked={incideAbono}
                            onChange={e => update('gratIncideAbono', e.target.checked)}
                        />
                        <span className="flex-1 flex flex-col">
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Abono de Permanência</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valorAbono)}</span>
                            </span>
                            {!temAbonoAtivo && (
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
                                    (Requer módulo de abono de permanência ativo)
                                </span>
                            )}
                        </span>
                    </label>

                    {/* Rubricas Manuais de Crédito dinâmicas (Padrão: Não selecionado) */}
                    {creditRubricas.map((rubrica, idx) => {
                        const isChecked = Boolean(state.gratRubricasInclusas?.[rubrica.id]);
                        const label = rubrica.descricao.trim() || `Crédito Dinâmico #${idx + 1}`;
                        return (
                            <label key={rubrica.id} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={isChecked}
                                    onChange={e => {
                                        const current = state.gratRubricasInclusas || {};
                                        update('gratRubricasInclusas', {
                                            ...current,
                                            [rubrica.id]: e.target.checked
                                        });
                                    }}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300 truncate" title={label}>
                                        {label}
                                    </span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold shrink-0">
                                        {formatCurrency(rubrica.valor || 0)}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>

                {/* Outras parcelas / Ajustes na base */}
                <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-body-xs text-neutral-600 dark:text-neutral-400">
                        Outras parcelas / Ajustes na base da gratificação:
                    </label>
                    <div className="relative w-full sm:w-44">
                        <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                            value={state.gratOutrasParcelas || ''}
                            onChange={e => update('gratOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                {/* Subtotal da Base Apurada e Valor Correspondente (35%) */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-body-xs text-neutral-600 dark:text-neutral-400">Base apurada da gratificação</span>
                        <span className="font-mono text-body-xs text-neutral-800 dark:text-neutral-200 font-bold">{formatCurrency(totalBaseApurada)}</span>
                    </div>
                    <div className={styles.internalTotalWrapper}>
                        <span className={styles.internalTotalLabel}>
                            Valor da Gratificação ({Math.round(specificGratRate * 100)}%)
                        </span>
                        <span className={styles.internalTotalValue}>{formatCurrency(valorGratificacaoCalculada)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

