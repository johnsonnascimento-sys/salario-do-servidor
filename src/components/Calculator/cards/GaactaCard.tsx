import React from 'react';
import { Award, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';

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

    // Verificar se ha horas extras ativas
    const hasOvertime = Boolean(
        (state.heTotal && state.heTotal > 0) ||
        (state.heQtd50 && state.heQtd50 > 0) ||
        (state.heQtd100 && state.heQtd100 > 0) ||
        (state.overtimeEntries && state.overtimeEntries.some(e => (e.qtd50 > 0 || e.qtd100 > 0)))
    );

    const vpniTotal = (Number(state.vpni_lei) || 0) + (Number(state.vpni_decisao) || 0);
    const temAbonoAtivo = Boolean(state.recebeAbono);
    const valorAbono = temAbonoAtivo
        ? (Number(state.abonoPermanencia) || Number(state.pssMensal) || 0)
        : 0;

    return (
        <div className={styles.card}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <h3 className={styles.sectionTitle}>
                    <Award className="w-4 h-4 text-amber-500" /> GAACTA - Atividades de Alta Complexidade
                </h3>
                <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">
                    Res. STM Nº 397/2026 • 15%
                </span>
            </div>

            <div className={styles.innerBox}>
                <div className="space-y-4">
                    {/* Alerta de Elegibilidade: Privativo de CJ */}
                    {!isCJ && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                                <strong className="font-semibold block text-sm">Privativo de Cargos em Comissão (CJ)</strong>
                                A GAACTA é concedida exclusivamente aos servidores ocupantes de cargo em comissão <strong>(CJ-1, CJ-2, CJ-3 e CJ-4)</strong>, nos termos dos arts. 2º e 3º da Resolução STM nº 397/2026.
                                Selecione um cargo comissionado (CJ) nos <em>Dados Funcionais</em> para atender aos requisitos de percepção.
                            </div>
                        </div>
                    )}

                    {/* Alerta de Incompatibilidade com Servico Extraordinario */}
                    {hasOvertime && !state.gaactaRecesso && (
                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                            <div>
                                <strong className="font-semibold block text-sm">Incompatibilidade Legal com Horas Extras</strong>
                                O art. 6º da Resolução STM nº 397/2026 estabelece que o acúmulo da GAACTA é incompatível com a prestação de serviço extraordinário. Em período concomitante, o servidor deverá <strong>optar</strong> entre a GAACTA e as Horas Extras (salvo se realizado no recesso judiciário).
                            </div>
                        </div>
                    )}

                    {/* Checkbox de Recesso Judiciario */}
                    <div className="p-2.5 rounded-md bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={Boolean(state.gaactaRecesso)}
                                onChange={e => update('gaactaRecesso', e.target.checked)}
                            />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Período de recesso judiciário (permite acúmulo excepcional com horas extras - art. 6º)
                            </span>
                        </label>
                    </div>

                    {/* Seleção de Itens da Remuneração (Checkboxes) */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5 text-blue-500" />
                                Composição da Base da Remuneração (15%)
                            </label>
                            <label className="text-[11px] text-gray-500 flex items-center gap-1 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600"
                                    checked={Boolean(state.gaactaManualBase)}
                                    onChange={e => update('gaactaManualBase', e.target.checked)}
                                />
                                <span>Informar base manual</span>
                            </label>
                        </div>

                        {state.gaactaManualBase ? (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
                                <label className={styles.label}>Valor da Base de Cálculo Manual (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={styles.input}
                                    value={state.gaactaBaseManualValor || ''}
                                    onChange={e => update('gaactaBaseManualValor', Math.max(0, parseFloat(e.target.value) || 0))}
                                    placeholder="Ex: 43516.33"
                                />
                                <span className="text-[11px] text-gray-500 mt-1 block">
                                    O percentual de 15% incidirá diretamente sobre o valor informado.
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-2 p-3 bg-gray-50/70 dark:bg-gray-800/40 rounded-lg border border-gray-200 dark:border-gray-700/80">
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                                    Selecione as parcelas que compõem a remuneração para fins de aplicação da GAACTA:
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.gaactaIncideVencimento !== false}
                                            onChange={e => update('gaactaIncideVencimento', e.target.checked)}
                                        />
                                        <span>Vencimento Básico: <strong>R$ {formatCurrency(state.vencimento)}</strong></span>
                                    </label>

                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.gaactaIncideGAJ !== false}
                                            onChange={e => update('gaactaIncideGAJ', e.target.checked)}
                                        />
                                        <span>GAJ (140%): <strong>R$ {formatCurrency(state.gaj)}</strong></span>
                                    </label>

                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.gaactaIncideFuncao !== false}
                                            onChange={e => update('gaactaIncideFuncao', e.target.checked)}
                                        />
                                        <span>Cargo em Comissão (CJ): <strong>R$ {formatCurrency(state.funcaoValor || 0)}</strong></span>
                                    </label>

                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.gaactaIncideAQTitulo !== false}
                                            onChange={e => update('gaactaIncideAQTitulo', e.target.checked)}
                                        />
                                        <span>AQ Títulos: <strong>R$ {formatCurrency(state.aqTituloValor || 0)}</strong></span>
                                    </label>

                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.gaactaIncideAQTreino !== false}
                                            onChange={e => update('gaactaIncideAQTreino', e.target.checked)}
                                        />
                                        <span>AQ Treinamento: <strong>R$ {formatCurrency(state.aqTreinoValor || 0)}</strong></span>
                                    </label>

                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.gaactaIncideATS !== false}
                                            onChange={e => update('gaactaIncideATS', e.target.checked)}
                                        />
                                        <span>ATS (Tempo de Serviço): <strong>R$ {formatCurrency(state.ats || 0)}</strong></span>
                                    </label>

                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={state.gaactaIncideVPNI !== false}
                                            onChange={e => update('gaactaIncideVPNI', e.target.checked)}
                                        />
                                        <span>VPNI (Lei 9.527 / Judicial): <strong>R$ {formatCurrency(vpniTotal)}</strong></span>
                                    </label>

                                    <label className={`${styles.checkboxLabel} ${!temAbonoAtivo ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            disabled={!temAbonoAtivo}
                                            checked={temAbonoAtivo && Boolean(state.gaactaIncideAbono)}
                                            onChange={e => update('gaactaIncideAbono', e.target.checked)}
                                        />
                                        <span>
                                            Abono de Permanência: <strong>R$ {formatCurrency(valorAbono)}</strong>
                                            {!temAbonoAtivo && (
                                                <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-normal">
                                                    (Requer módulo &quot;Abono de Permanência&quot; ativo)
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
                                            <span>Gratificação Específica (GAE/GAS): <strong>R$ {formatCurrency(state.gratEspecificaValor)}</strong></span>
                                        </label>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 flex items-center justify-between gap-4">
                                    <label className="text-xs text-gray-600 dark:text-gray-300 shrink-0">
                                        Outras parcelas / Ajustes na base (R$):
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-36 text-right px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        value={state.gaactaOutrasParcelas || ''}
                                        onChange={e => update('gaactaOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumo de Calculo */}
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Base Apurada da GAACTA:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                R$ {formatCurrency(state.gaactaBaseCalculo || 0)}
                            </span>
                        </div>
                        <div className="sm:text-right">
                            <span className="text-amber-800 dark:text-amber-300 block text-[11px] font-medium">
                                Valor da Indenização (15%):
                            </span>
                            <span className="font-bold text-amber-900 dark:text-amber-200 text-base">
                                R$ {formatCurrency(state.gaactaValor || 0)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200 dark:border-emerald-800/40">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                            <strong>Natureza Indenizatória (Art. 4º):</strong> Sem desconto de PSS/Previdência e sem retenção de IRRF.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

