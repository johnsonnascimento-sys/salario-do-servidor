import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import { getTablesForPeriod } from '../../../utils/calculations';
import { resolveGaactaRule } from '../../../services/agency/engine/modules/gaactaCalculations';

interface GaactaCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;

    courtConfig?: CourtConfig;
    competenciaReferencia?: string;
}

const formatCurrency = (val: number) => {

    return (Number(val) || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const GaactaCard: React.FC<GaactaCardProps> = ({
    state,
    update,
    styles,
    courtConfig
}) => {
    const funcaoStr = (state.funcao || '').toLowerCase();
    const isCJ = funcaoStr.startsWith('cj');
    const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    const monthIndex = months.indexOf((state.mesRef || '').toUpperCase()) + 1;
    const competence = monthIndex > 0 ? `${state.anoRef}-${String(monthIndex).padStart(2, '0')}` : '';
    const gaactaRule = resolveGaactaRule(courtConfig, competence);

    // Resolver valor do cargo/função (prioriza cálculo do motor, com fallback para tabela de configuração)
    let valorFuncao = Number(state.funcaoValor) || 0;
    if (valorFuncao === 0 && state.funcao && courtConfig) {
        try {
            const tables = getTablesForPeriod(state.periodo, courtConfig);
            valorFuncao = tables.funcoes[state.funcao] || 0;
        } catch {
            // fallback se config ainda não estiver carregada
        }
    }

    // Verificar se há horas extras ativas
    const hasOvertime = Boolean(
        (state.heTotal && state.heTotal > 0) ||
        (state.heQtd50 && state.heQtd50 > 0) ||
        (state.heQtd100 && state.heQtd100 > 0) ||
        (state.overtimeEntries && state.overtimeEntries.some(e => (e.qtd50 > 0 || e.qtd100 > 0)))
    );
    const temAbonoAtivo = Boolean(state.recebeAbono);
    const valorAbono = temAbonoAtivo
        ? (Number(state.abonoPermanencia) || Number(state.pssMensal) || 0)
        : 0;

    const creditRubricas = React.useMemo(() => {
        return (state.rubricasExtras || []).filter(r => r.tipo === 'C');
    }, [state.rubricasExtras]);

    return (
        <div className="space-y-4">
            {/* Alerta de Elegibilidade: Privativo de CJ */}
            {!isCJ && (
                <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800/60 text-body-xs text-warning-800 dark:text-warning-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-warning-600 dark:text-warning-400 mt-0.5" />
                    <div className="space-y-0.5">
                        <span className="font-bold text-body-xs block text-warning-900 dark:text-warning-200">
                            Privativo de Cargos em Comissão (CJ)
                        </span>
                        <p className="text-body-xs text-warning-800 dark:text-warning-300">
                            A GAACTA é concedida exclusivamente aos servidores ocupantes de cargo em comissão (<strong>CJ-1, CJ-2, CJ-3 e CJ-4</strong>), nos termos dos arts. 2º e 3º da Resolução STM nº 397/2026. Selecione um cargo comissionado (CJ) nos <em>Dados Funcionais</em> para atender aos requisitos de percepção.
                        </p>
                    </div>
                </div>
            )}

            {/* Alerta de Incompatibilidade com Servico Extraordinario */}
            {hasOvertime && !state.gaactaRecesso && (
                <div className="p-3 rounded-xl bg-error-50 dark:bg-error-950/30 border border-error-200 dark:border-error-800/60 text-body-xs text-error-800 dark:text-error-300 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-error-600 dark:text-error-400 mt-0.5" />
                    <div className="space-y-0.5">
                        <span className="font-bold text-body-xs block text-error-900 dark:text-error-200">
                            Incompatibilidade Legal com Horas Extras
                        </span>
                        <p className="text-body-xs text-error-800 dark:text-error-300">
                            O art. 6º da Resolução STM nº 397/2026 estabelece que o acúmulo da GAACTA é incompatível com a prestação de serviço extraordinário. Em período concomitante, o servidor deverá <strong>optar</strong> entre a GAACTA e as Horas Extras (salvo se realizado no recesso judiciário).
                        </p>
                    </div>
                </div>
            )}

            {/* Checkbox de Recesso Judiciário */}
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-700">
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={Boolean(state.gaactaRecesso)}
                        onChange={e => update('gaactaRecesso', e.target.checked)}
                    />
                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">
                        Período de recesso judiciário (permite acúmulo excepcional com horas extras — art. 6º)
                    </span>
                </label>
            </div>

            {/* Seleção de Itens da Remuneração */}
            {!gaactaRule && (
                <div role="status" className="p-3 rounded-xl bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800/60 text-body-xs text-warning-800 dark:text-warning-300">
                    Não há regra GAACTA cadastrada e vigente para esta competência. O card não gera valor.
                </div>
            )}
            <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={styles.label}>
                        Composição da Base da Remuneração ({gaactaRule ? `${(gaactaRule.percentage * 100).toLocaleString('pt-BR')}%` : 'sem regra vigente'})
                    </span>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={Boolean(state.gaactaManualBase)}
                            onChange={e => update('gaactaManualBase', e.target.checked)}
                        />
                        <span className="text-body-xs text-neutral-500 dark:text-neutral-400">
                            Informar base manual
                        </span>
                    </label>
                </div>

                {state.gaactaManualBase ? (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                        <label className={styles.label}>Valor da Base de Cálculo Manual (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={styles.input}
                            value={state.gaactaBaseManualValor || ''}
                            onChange={e => update('gaactaBaseManualValor', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                        />
                        <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                            {gaactaRule
                                ? `O percentual de ${(gaactaRule.percentage * 100).toLocaleString('pt-BR')}% incidirá diretamente sobre o valor informado.`
                                : 'O valor manual não será calculado enquanto não houver regra vigente para a competência.'}
                        </p>
                    </div>
                ) : (
                    <details className="group rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/40">
                        <summary className="cursor-pointer px-4 py-3 text-body-xs font-semibold text-neutral-700 dark:text-neutral-300">
                            Parcelas selecionadas para a base da GAACTA
                        </summary>
                        <div className="space-y-3 p-4 pt-1">
                        <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                            Selecione as parcelas que compõem a remuneração para fins de aplicação da GAACTA:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.gaactaIncideVencimento !== false}
                                    onChange={e => update('gaactaIncideVencimento', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Vencimento Básico</span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">R$ {formatCurrency(state.vencimento)}</span>
                                </span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.gaactaIncideGAJ !== false}
                                    onChange={e => update('gaactaIncideGAJ', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">GAJ (140%)</span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">R$ {formatCurrency(state.gaj)}</span>
                                </span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.gaactaIncideFuncao !== false}
                                    onChange={e => update('gaactaIncideFuncao', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Cargo em Comissão (CJ)</span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">R$ {formatCurrency(valorFuncao)}</span>
                                </span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.gaactaIncideAQTitulo !== false}
                                    onChange={e => update('gaactaIncideAQTitulo', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Títulos</span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">R$ {formatCurrency(state.aqTituloValor || 0)}</span>
                                </span>
                            </label>

                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={state.gaactaIncideAQTreino !== false}
                                    onChange={e => update('gaactaIncideAQTreino', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Treinamento</span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">R$ {formatCurrency(state.aqTreinoValor || 0)}</span>
                                </span>
                            </label>

                            {creditRubricas.map((rubrica, idx) => {
                                const isChecked = state.gaactaRubricasInclusas
                                    ? state.gaactaRubricasInclusas[rubrica.id] !== false
                                    : true;
                                const label = rubrica.descricao.trim() || `Crédito Dinâmico #${idx + 1}`;
                                return (
                                    <label key={rubrica.id} className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={isChecked}
                                            onChange={e => {
                                                const current = state.gaactaRubricasInclusas || {};
                                                update('gaactaRubricasInclusas', {
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
                                                R$ {formatCurrency(rubrica.valor || 0)}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}



                            <label className={`${styles.checkboxLabel} ${!temAbonoAtivo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    disabled={!temAbonoAtivo}
                                    checked={state.gaactaIncideAbono !== false}
                                    onChange={e => update('gaactaIncideAbono', e.target.checked)}
                                />
                                <span className="flex-1 flex flex-col">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Abono de Permanência</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">R$ {formatCurrency(valorAbono)}</span>
                                    </span>
                                    {!temAbonoAtivo && (
                                        <span className="text-label text-neutral-400 dark:text-neutral-500 font-normal">
                                            (Requer módulo de abono de permanência ativo)
                                        </span>
                                    )}
                                </span>
                            </label>

                            {state.gratEspecificaValor > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={Boolean(state.gaactaIncideGrat)}
                                        onChange={e => update('gaactaIncideGrat', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Gratificação Específica</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">R$ {formatCurrency(state.gratEspecificaValor)}</span>
                                    </span>
                                </label>
                            )}
                        </div>

                        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-body-xs text-neutral-600 dark:text-neutral-400">
                                Outras parcelas / Ajustes na base:
                            </label>
                            <div className="relative w-full sm:w-44">
                                <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                                    value={state.gaactaOutrasParcelas || ''}
                                    onChange={e => update('gaactaOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        </div>
                    </details>
                )}
            </div>

            {/* Subtotal da Base Apurada */}
            <div className={styles.internalTotalWrapper}>
                <span className={styles.internalTotalLabel}>Base apurada da remuneração</span>
                <span className={styles.internalTotalValue}>R$ {formatCurrency(state.gaactaBaseCalculo || 0)}</span>
            </div>

            {/* Informação Legal de Natureza Indenizatória */}
            <div className="flex items-center gap-2 text-body-xs text-neutral-500 dark:text-neutral-400 pt-1">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>
                    <strong className="text-neutral-700 dark:text-neutral-300">Natureza indenizatória (art. 4º):</strong> isenta de PSS/Previdência e retenção de IRRF.
                </span>
            </div>
        </div>
    );
};
