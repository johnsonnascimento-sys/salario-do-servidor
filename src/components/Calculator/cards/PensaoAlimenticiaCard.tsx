import React, { useMemo, useEffect } from 'react';
import { Scale, Percent, DollarSign, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface PensaoAlimenticiaCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    courtConfig?: CourtConfig;
    competenciaReferencia?: string;
    calculationReady: boolean;
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const PensaoAlimenticiaCard: React.FC<PensaoAlimenticiaCardProps> = ({
    state,
    update,
    styles,
    courtConfig,
    calculationReady
}) => {
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

    const valor13 = Math.max(
        0,
        Number(state.gratNatalinaTotal) ||
            (Number(state.adiant13Venc || 0) +
                Number(state.adiant13FC || 0) +
                Number(state.segunda13Venc || 0) +
                Number(state.segunda13FC || 0))
    );
    const valorFerias = Math.max(0, Number(state.ferias1_3) || 0);
    const valorHoraExtra = Math.max(0, Number(state.heTotal) || 0);
    const valorSubstituicao = Math.max(0, Number(state.substTotal) || 0);
    const valorGAACTA = state.gaactaAtivo ? Math.max(0, Number(state.gaactaValor) || 0) : 0;

    const creditRubricas = useMemo(() => {
        return (state.rubricasExtras || []).filter(r => r.tipo === 'C');
    }, [state.rubricasExtras]);

    const debitRubricas = useMemo(() => {
        return (state.rubricasExtras || []).filter(r => r.tipo === 'D');
    }, [state.rubricasExtras]);

    // Deduções oficiais da folha
    const valorIRRF = Number(state.irMensal) || 0;
    const valorPSS = Number(state.pssMensal) || 0;
    const valorFunpresp = Number(state.valFunpresp) || 0;

    // Modo de cálculo: percentual ou fixo
    const tipo = state.pensaoTipo || 'percentual';
    const percentual = state.pensaoPercentual ?? 30;

    // Incidências de Crédito (default true)
    const incideVenc = state.pensaoIncideVencimento !== false;
    const incideGAJ = state.pensaoIncideGAJ !== false;
    const incideFuncao = state.pensaoIncideFuncao !== false;
    const incideAQTitulo = state.pensaoIncideAQTitulo !== false;
    const incideAQTreino = state.pensaoIncideAQTreino !== false;
    const incideGrat = state.pensaoIncideGrat !== false;
    const incideGAACTA = state.pensaoIncideGAACTA !== false;
    const incideVPNI = state.pensaoIncideVPNI !== false;
    const incideATS = state.pensaoIncideATS !== false;
    const incideAbono = state.pensaoIncideAbono !== false;
    const incide13 = state.pensaoIncide13 !== false;
    const incideFerias = state.pensaoIncideFerias !== false;
    const incideHoraExtra = state.pensaoIncideHoraExtra !== false;
    const incideSubstituicao = state.pensaoIncideSubstituicao !== false;

    // Deduções da Base (default true para IR e PSS)
    const deduzirIRRF = state.pensaoDeduzirIRRF !== false;
    const deduzirPSS = state.pensaoDeduzirPSS !== false;
    const deduzirFunpresp = Boolean(state.pensaoDeduzirFunpresp);

    // Cálculo da Base Bruta
    const totalBaseBruta = useMemo(() => {
        let total = 0;
        if (incideVenc) total += (state.vencimento || 0);
        if (incideGAJ) total += (state.gaj || 0);
        if (incideFuncao) total += funcaoValorBruta;
        if (incideAQTitulo) total += (state.aqTituloValor || 0);
        if (incideAQTreino) total += (state.aqTreinoValor || 0);
        if (incideGrat) total += (state.gratEspecificaValor || 0);
        if (incideGAACTA && valorGAACTA > 0) total += valorGAACTA;
        if (incideVPNI) total += (state.vpni_lei || 0) + (state.vpni_decisao || 0);
        if (incideATS) total += (state.ats || 0);
        if (incideAbono && temAbonoAtivo) total += valorAbono;
        if (incide13 && valor13 > 0) total += valor13;
        if (incideFerias && valorFerias > 0) total += valorFerias;
        if (incideHoraExtra && valorHoraExtra > 0) total += valorHoraExtra;
        if (incideSubstituicao && valorSubstituicao > 0) total += valorSubstituicao;

        if (state.pensaoRubricasCreditoInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'C' && state.pensaoRubricasCreditoInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.pensaoOutrasParcelas && state.pensaoOutrasParcelas > 0) {
            total += state.pensaoOutrasParcelas;
        }

        return roundCurrency(total);
    }, [
        incideVenc, incideGAJ, incideFuncao, funcaoValorBruta, incideAQTitulo, incideAQTreino,
        incideGrat, incideGAACTA, valorGAACTA, incideVPNI, incideATS, incideAbono, temAbonoAtivo,
        valorAbono, incide13, valor13, incideFerias, valorFerias, incideHoraExtra, valorHoraExtra,
        incideSubstituicao, valorSubstituicao, state.vencimento, state.gaj, state.aqTituloValor,
        state.aqTreinoValor, state.gratEspecificaValor, state.vpni_lei, state.vpni_decisao,
        state.ats, state.pensaoRubricasCreditoInclusas, state.rubricasExtras, state.pensaoOutrasParcelas
    ]);

    // Cálculo das Deduções da Base (Abatimentos da base para cálculo sobre o valor líquido)
    const totalDeducoes = useMemo(() => {
        let total = 0;
        if (deduzirIRRF) total += valorIRRF;
        if (deduzirPSS) total += valorPSS;
        if (deduzirFunpresp) total += valorFunpresp;

        if (state.pensaoRubricasDescontoInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'D' && state.pensaoRubricasDescontoInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.pensaoOutrosDescontosDedutiveis && state.pensaoOutrosDescontosDedutiveis > 0) {
            total += state.pensaoOutrosDescontosDedutiveis;
        }

        return roundCurrency(total);
    }, [
        deduzirIRRF, valorIRRF, deduzirPSS, valorPSS, deduzirFunpresp, valorFunpresp,
        state.pensaoRubricasDescontoInclusas, state.rubricasExtras, state.pensaoOutrosDescontosDedutiveis
    ]);

    const baseLiquida = Math.max(0, roundCurrency(totalBaseBruta - totalDeducoes));

    const valorCalculado = useMemo(() => {
        if (tipo === 'fixo') {
            return Math.max(0, Number(state.pensaoValorFixo) || 0);
        }
        return roundCurrency(baseLiquida * (percentual / 100));
    }, [tipo, state.pensaoValorFixo, baseLiquida, percentual]);

    // Sincroniza os totais e o valor de pensão no estado da calculadora
    useEffect(() => {
        if (!calculationReady) return;
        if (state.pensao !== valorCalculado) {
            update('pensao', valorCalculado);
        }
        if (state.pensaoBaseBruta !== totalBaseBruta) {
            update('pensaoBaseBruta', totalBaseBruta);
        }
        if (state.pensaoTotalDeducoes !== totalDeducoes) {
            update('pensaoTotalDeducoes', totalDeducoes);
        }
        if (state.pensaoBaseCalculo !== baseLiquida) {
            update('pensaoBaseCalculo', baseLiquida);
        }
    }, [calculationReady, valorCalculado, totalBaseBruta, totalDeducoes, baseLiquida, state.pensao, state.pensaoBaseBruta, state.pensaoTotalDeducoes, state.pensaoBaseCalculo, update]);

    const atalhosPercentual = [15, 20, 25, 30, 33.33, 50];

    if (!calculationReady) {
        return (
            <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-body-xs text-neutral-600 dark:bg-primary/10 dark:text-neutral-300">
                <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                <span className="font-medium">Aguardando o cálculo da folha para apurar a pensão...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Seletor de Modalidade: Percentual vs Valor Fixo */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary shrink-0" />
                    <div>
                        <span className="text-body-xs font-bold text-neutral-800 dark:text-neutral-200">
                            Modalidade de Fixação da Pensão
                        </span>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            Selecione se os alimentos foram fixados em percentual da remuneração ou em valor nominal fixo
                        </p>
                    </div>
                </div>

                <div className="inline-flex rounded-lg p-0.5 bg-neutral-200 dark:bg-neutral-800 shrink-0">
                    <button
                        type="button"
                        onClick={() => update('pensaoTipo', 'percentual')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-xs font-semibold transition-all ${
                            tipo === 'percentual'
                                ? 'bg-white dark:bg-neutral-900 text-primary shadow-xs font-bold'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                    >
                        <Percent className="w-3.5 h-3.5" />
                        Porcentagem (%)
                    </button>
                    <button
                        type="button"
                        onClick={() => update('pensaoTipo', 'fixo')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-body-xs font-semibold transition-all ${
                            tipo === 'fixo'
                                ? 'bg-white dark:bg-neutral-900 text-primary shadow-xs font-bold'
                                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                    >
                        <DollarSign className="w-3.5 h-3.5" />
                        Valor Fixo (R$)
                    </button>
                </div>
            </div>

            {/* Configuração no Modo Percentual */}
            {tipo === 'percentual' ? (
                <>
                    {/* Alíquota / Porcentagem e Atalhos Rápidos */}
                    <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-body-xs font-bold text-primary-900 dark:text-primary-200">
                                Percentual da Pensão Alimentícia (%)
                            </label>
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mr-1">Atalhos:</span>
                                {atalhosPercentual.map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => update('pensaoPercentual', p)}
                                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                                            percentual === p
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-primary/50'
                                        }`}
                                    >
                                        {p}%
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative max-w-xs">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                className={`${styles.input} font-mono font-bold pr-8 text-body`}
                                value={state.pensaoPercentual ?? 30}
                                onChange={e => update('pensaoPercentual', Math.max(0, parseFloat(e.target.value) || 0))}
                                placeholder="30,00"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-neutral-400 text-body-xs">
                                %
                            </span>
                        </div>
                    </div>

                    {/* BLOCO 1: Créditos que compõem a Base Bruta */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                1. Créditos que compõem a Base Bruta da Pensão:
                            </span>
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                Marque as parcelas acordadas judicialmente
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {/* Vencimento Básico */}
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={incideVenc}
                                    onChange={e => update('pensaoIncideVencimento', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Vencimento Básico</span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.vencimento)}</span>
                                </span>
                            </label>

                            {/* GAJ */}
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={incideGAJ}
                                    onChange={e => update('pensaoIncideGAJ', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">GAJ (Grat. Atividade Judiciária)</span>
                                    <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.gaj)}</span>
                                </span>
                            </label>

                            {/* Função Comissionada / Cargo em Comissão (FC/CJ) */}
                            {funcaoValorBruta > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideFuncao}
                                        onChange={e => update('pensaoIncideFuncao', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Função / Cargo (FC/CJ)</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(funcaoValorBruta)}</span>
                                    </span>
                                </label>
                            )}

                            {/* AQ Título */}
                            {(state.aqTituloValor || 0) > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideAQTitulo}
                                        onChange={e => update('pensaoIncideAQTitulo', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Título</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTituloValor)}</span>
                                    </span>
                                </label>
                            )}

                            {/* AQ Treinamento */}
                            {(state.aqTreinoValor || 0) > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideAQTreino}
                                        onChange={e => update('pensaoIncideAQTreino', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Treinamento</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTreinoValor)}</span>
                                    </span>
                                </label>
                            )}

                            {/* Gratificação Específica (GAE / GAS) */}
                            {(state.gratEspecificaValor || 0) > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideGrat}
                                        onChange={e => update('pensaoIncideGrat', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Gratificação Específica (GAE/GAS)</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.gratEspecificaValor)}</span>
                                    </span>
                                </label>
                            )}

                            {/* GAACTA */}
                            {valorGAACTA > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideGAACTA}
                                        onChange={e => update('pensaoIncideGAACTA', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">GAACTA (Alta Complexidade)</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valorGAACTA)}</span>
                                    </span>
                                </label>
                            )}

                            {/* VPNI */}
                            {((state.vpni_lei || 0) > 0 || (state.vpni_decisao || 0) > 0) && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideVPNI}
                                        onChange={e => update('pensaoIncideVPNI', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">VPNI (Quintos/Incorporação)</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency((state.vpni_lei || 0) + (state.vpni_decisao || 0))}</span>
                                    </span>
                                </label>
                            )}

                            {/* ATS */}
                            {(state.ats || 0) > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideATS}
                                        onChange={e => update('pensaoIncideATS', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">ATS (Anuênios)</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.ats)}</span>
                                    </span>
                                </label>
                            )}

                            {/* 13º Salário */}
                            {valor13 > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incide13}
                                        onChange={e => update('pensaoIncide13', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Gratificação Natalina (13º)</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valor13)}</span>
                                    </span>
                                </label>
                            )}

                            {/* Férias (1/3 Constitucional) */}
                            {valorFerias > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideFerias}
                                        onChange={e => update('pensaoIncideFerias', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Férias (1/3 Constitucional)</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valorFerias)}</span>
                                    </span>
                                </label>
                            )}

                            {/* Abono de Permanência */}
                            {temAbonoAtivo && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideAbono}
                                        onChange={e => update('pensaoIncideAbono', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Abono de Permanência</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valorAbono)}</span>
                                    </span>
                                </label>
                            )}

                            {/* Horas Extras */}
                            {valorHoraExtra > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideHoraExtra}
                                        onChange={e => update('pensaoIncideHoraExtra', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Horas Extras</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valorHoraExtra)}</span>
                                    </span>
                                </label>
                            )}

                            {/* Substituição de Função */}
                            {valorSubstituicao > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={incideSubstituicao}
                                        onChange={e => update('pensaoIncideSubstituicao', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Substituição de Função</span>
                                        <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(valorSubstituicao)}</span>
                                    </span>
                                </label>
                            )}

                            {/* Rubricas Manuais Dinâmicas de Crédito */}
                            {creditRubricas.map((rubrica, idx) => {
                                const isChecked = Boolean(state.pensaoRubricasCreditoInclusas?.[rubrica.id]);
                                const label = rubrica.descricao.trim() || `Crédito Dinâmico #${idx + 1}`;
                                return (
                                    <label key={rubrica.id} className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={isChecked}
                                            onChange={e => {
                                                const current = state.pensaoRubricasCreditoInclusas || {};
                                                update('pensaoRubricasCreditoInclusas', {
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

                        {/* Outras parcelas / Ajustes na base bruta */}
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                Outras parcelas / Ajustes na base bruta da pensão:
                            </label>
                            <div className="relative w-full sm:w-44">
                                <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                                    value={state.pensaoOutrasParcelas || ''}
                                    onChange={e => update('pensaoOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        {/* Subtotal da Base Bruta */}
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                            <span className="text-body-xs font-bold text-emerald-800 dark:text-emerald-300">
                                Base Bruta Apurada
                            </span>
                            <span className="font-mono text-body-xs font-bold text-emerald-800 dark:text-emerald-300">
                                {formatCurrency(totalBaseBruta)}
                            </span>
                        </div>
                    </div>

                    {/* BLOCO 2: Deduções da Base (Cálculo sobre o Valor Líquido) */}
                    <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
                                2. Descontos Dedutíveis da Base (Cálculo sobre o Líquido):
                            </span>
                            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                Exclusões legais e acordadas
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {/* IRRF Mensal */}
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={deduzirIRRF}
                                    onChange={e => update('pensaoDeduzirIRRF', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">
                                        Imposto de Renda (IRRF Mensal)
                                    </span>
                                    <span className="font-mono text-body-xs text-red-600 dark:text-red-400 font-semibold">
                                        - {formatCurrency(valorIRRF)}
                                    </span>
                                </span>
                            </label>

                            {/* PSS / RPPS Mensal */}
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={deduzirPSS}
                                    onChange={e => update('pensaoDeduzirPSS', e.target.checked)}
                                />
                                <span className="flex-1 flex items-center justify-between gap-2">
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300">
                                        Previdência Oficial (PSS Mensal)
                                    </span>
                                    <span className="font-mono text-body-xs text-red-600 dark:text-red-400 font-semibold">
                                        - {formatCurrency(valorPSS)}
                                    </span>
                                </span>
                            </label>

                            {/* Funpresp */}
                            {valorFunpresp > 0 && (
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={deduzirFunpresp}
                                        onChange={e => update('pensaoDeduzirFunpresp', e.target.checked)}
                                    />
                                    <span className="flex-1 flex items-center justify-between gap-2">
                                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">
                                            Previdência Complementar (Funpresp)
                                        </span>
                                        <span className="font-mono text-body-xs text-red-600 dark:text-red-400 font-semibold">
                                            - {formatCurrency(valorFunpresp)}
                                        </span>
                                    </span>
                                </label>
                            )}

                            {/* Rubricas Manuais Dinâmicas de Desconto (ex: Plano de Saúde, Coparticipação, etc.) */}
                            {debitRubricas.map((rubrica, idx) => {
                                const isChecked = Boolean(state.pensaoRubricasDescontoInclusas?.[rubrica.id]);
                                const label = rubrica.descricao.trim() || `Desconto Dinâmico #${idx + 1}`;
                                return (
                                    <label key={rubrica.id} className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={isChecked}
                                            onChange={e => {
                                                const current = state.pensaoRubricasDescontoInclusas || {};
                                                update('pensaoRubricasDescontoInclusas', {
                                                    ...current,
                                                    [rubrica.id]: e.target.checked
                                                });
                                            }}
                                        />
                                        <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                            <span className="text-body-xs text-neutral-700 dark:text-neutral-300 truncate" title={label}>
                                                {label}
                                            </span>
                                            <span className="font-mono text-body-xs text-red-600 dark:text-red-400 font-semibold shrink-0">
                                                - {formatCurrency(rubrica.valor || 0)}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        {/* Outras deduções da base da pensão */}
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                Outras deduções da base da pensão:
                            </label>
                            <div className="relative w-full sm:w-44">
                                <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                                    value={state.pensaoOutrosDescontosDedutiveis || ''}
                                    onChange={e => update('pensaoOutrosDescontosDedutiveis', Math.max(0, parseFloat(e.target.value) || 0))}
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        {/* Subtotal das Deduções da Base */}
                        <div className="p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 flex items-center justify-between">
                            <span className="text-body-xs font-bold text-red-800 dark:text-red-300">
                                Total de Deduções da Base
                            </span>
                            <span className="font-mono text-body-xs font-bold text-red-800 dark:text-red-300">
                                - {formatCurrency(totalDeducoes)}
                            </span>
                        </div>
                    </div>

                    {/* BLOCO 3: Resumo Matemático e Fechamento */}
                    <div className="p-3.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-2.5">
                        <div className="flex items-center justify-between text-body-xs">
                            <span className="text-neutral-600 dark:text-neutral-400">Base Bruta:</span>
                            <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">{formatCurrency(totalBaseBruta)}</span>
                        </div>
                        <div className="flex items-center justify-between text-body-xs">
                            <span className="text-neutral-600 dark:text-neutral-400">(-) Descontos Dedutíveis:</span>
                            <span className="font-mono font-semibold text-red-600 dark:text-red-400">- {formatCurrency(totalDeducoes)}</span>
                        </div>
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-body-xs font-bold">
                            <span className="text-neutral-800 dark:text-neutral-200">(=) Base Líquida de Incidência:</span>
                            <span className="font-mono text-primary">{formatCurrency(baseLiquida)}</span>
                        </div>
                        <div className="flex items-center justify-between text-body-xs">
                            <span className="text-neutral-600 dark:text-neutral-400">(×) Alíquota da Pensão:</span>
                            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{percentual}%</span>
                        </div>
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                            <span className="text-body-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                                <HeartHandshake className="w-4 h-4" />
                                Valor Final da Pensão Alimentícia
                            </span>
                            <span className="font-mono text-body font-bold text-red-700 dark:text-red-400">
                                {formatCurrency(valorCalculado)}
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                /* Modo Valor Fixo (R$) */
                <div className="space-y-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20">
                    <div>
                        <label className="text-body-xs font-bold text-primary-900 dark:text-primary-200 block mb-1">
                            Valor Fixo Mensal da Pensão Alimentícia (R$)
                        </label>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2">
                            Informe o valor exato fixado em decisão judicial ou escritura pública de alimentos.
                        </p>
                    </div>

                    <div className="relative max-w-sm">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-neutral-400 text-body-xs">
                            R$
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${styles.input} font-mono font-bold pl-10 text-body`}
                            value={state.pensaoValorFixo || ''}
                            onChange={e => update('pensaoValorFixo', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                        />
                    </div>

                    <div className="pt-2 border-t border-primary/20 flex items-center justify-between">
                        <span className="text-body-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                            <HeartHandshake className="w-4 h-4" />
                            Valor Final da Pensão Alimentícia
                        </span>
                        <span className="font-mono text-body font-bold text-red-700 dark:text-red-400">
                            {formatCurrency(valorCalculado)}
                        </span>
                    </div>
                </div>
            )}

            <div className="p-3 bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-primary shrink-0" />
                <span>
                    O valor apurado de <strong>{formatCurrency(valorCalculado)}</strong> é lançado automaticamente como dedução da folha na linha <em>PENSÃO ALIMENTÍCIA</em>.
                </span>
            </div>
        </div>
    );
};
