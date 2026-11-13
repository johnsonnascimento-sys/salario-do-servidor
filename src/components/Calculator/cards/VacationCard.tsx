import React, { useEffect, useMemo } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface VacationCardProps {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    competenciaReferencia: string;
    styles: any;
    courtConfig?: CourtConfig;
}

const parseCurrencyInput = (value: string) => {
    const raw = value.replace(/\D/g, '');
    return Number(raw) / 100;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const VacationCard: React.FC<VacationCardProps> = ({ state, update, styles, courtConfig }) => {
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

    // Incidências das parcelas padrão e dinâmicas
    const incideVenc = state.feriasIncideVencimento !== false;
    const incideGAJ = state.feriasIncideGAJ !== false;
    const incideFuncao = state.feriasIncideFuncao !== false;
    const incideAQTitulo = state.feriasIncideAQTitulo !== false;
    const incideAQTreino = state.feriasIncideAQTreino !== false;
    const incideVPNI = state.feriasIncideVPNI !== false;
    const incideATS = state.feriasIncideATS !== false;
    const incideGrat = state.feriasIncideGrat !== false;
    const incideAbono = state.feriasIncideAbono !== false;

    // Base apurada da remuneração de férias com as seleções dinâmicas
    const totalBaseApurada = useMemo(() => {
        let total = 0;
        if (incideVenc) total += (state.vencimento || 0);
        if (incideGAJ) total += (state.gaj || 0);
        if (incideFuncao) total += funcaoValorBruta;
        if (incideAQTitulo) total += (state.aqTituloValor || 0);
        if (incideAQTreino) total += (state.aqTreinoValor || 0);
        if (incideGrat) total += (state.gratEspecificaValor || 0);
        if (incideVPNI) total += (state.vpni_lei || 0) + (state.vpni_decisao || 0);
        if (incideATS) total += (state.ats || 0);
        if (incideAbono && temAbonoAtivo) total += valorAbono;

        if (state.feriasRubricasInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'C' && state.feriasRubricasInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.feriasOutrasParcelas && state.feriasOutrasParcelas > 0) {
            total += state.feriasOutrasParcelas;
        }

        return roundCurrency(total);
    }, [
        incideVenc,
        incideGAJ,
        incideFuncao,
        funcaoValorBruta,
        incideAQTitulo,
        incideAQTreino,
        incideGrat,
        incideVPNI,
        incideATS,
        incideAbono,
        temAbonoAtivo,
        valorAbono,
        state.vencimento,
        state.gaj,
        state.aqTituloValor,
        state.aqTreinoValor,
        state.gratEspecificaValor,
        state.vpni_lei,
        state.vpni_decisao,
        state.ats,
        state.feriasRubricasInclusas,
        state.rubricasExtras,
        state.feriasOutrasParcelas
    ]);

    const tercoCalculado = useMemo(() => {
        return roundCurrency(totalBaseApurada / 3);
    }, [totalBaseApurada]);

    useEffect(() => {
        if (!state.feriasAntecipadas || state.feriasDescManual) {
            return;
        }

        const proximoDesconto = Math.round((state.ferias1_3 || 0) * 100) / 100;
        if (Math.abs((state.feriasDesc || 0) - proximoDesconto) > 0.009) {
            update('feriasDesc', proximoDesconto);
        }
    }, [state.feriasAntecipadas, state.feriasDescManual, state.ferias1_3, state.feriasDesc, update]);

    const handleFeriasAntecipadasChange = (checked: boolean) => {
        update('feriasAntecipadas', checked);

        if (!checked) {
            update('feriasDescManual', false);
            update('feriasDesc', 0);
            return;
        }

        if (!state.feriasDescManual) {
            update('feriasDesc', Math.round((state.ferias1_3 || 0) * 100) / 100);
        }
    };

    const handleFeriasDescManualChange = (checked: boolean) => {
        update('feriasDescManual', checked);

        if (!checked) {
            update('feriasDesc', Math.round((state.ferias1_3 || 0) * 100) / 100);
        } else if ((state.feriasDesc || 0) <= 0) {
            update('feriasDesc', Math.round((state.ferias1_3 || 0) * 100) / 100);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                O adicional de 1/3 de férias corresponde a um terço da remuneração de referência do servidor no período de usufruto (art. 7º, XVII, da CF/88 c/c art. 76 da Lei nº 8.112/1990).
            </p>

            {/* Composição da Base da Remuneração (similar ao 13º e GAACTA) */}
            <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={styles.label}>
                        Composição da Remuneração de Referência (Férias)
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Selecione as parcelas que integram o cálculo de 1/3
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Vencimento Básico */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideVenc}
                            onChange={e => update('feriasIncideVencimento', e.target.checked)}
                        />
                        <span className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Vencimento Básico</span>
                            <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.vencimento)}</span>
                        </span>
                    </label>

                    {/* GAJ (140%) */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideGAJ}
                            onChange={e => update('feriasIncideGAJ', e.target.checked)}
                        />
                        <span className="flex-1 flex items-center justify-between gap-2">
                            <span className="text-body-xs text-neutral-700 dark:text-neutral-300">GAJ (140%)</span>
                            <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.gaj)}</span>
                        </span>
                    </label>

                    {/* FC / CJ */}
                    {funcaoValorBruta > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideFuncao}
                                onChange={e => update('feriasIncideFuncao', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">FC / CJ</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(funcaoValorBruta)}</span>
                            </span>
                        </label>
                    )}

                    {/* AQ Títulos */}
                    {(state.aqTituloValor || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideAQTitulo}
                                onChange={e => update('feriasIncideAQTitulo', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Títulos</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTituloValor || 0)}</span>
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
                                onChange={e => update('feriasIncideAQTreino', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">AQ Treinamento</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.aqTreinoValor || 0)}</span>
                            </span>
                        </label>
                    )}

                    {/* VPNI (Lei e Decisão Judicial) */}
                    {((state.vpni_lei || 0) > 0 || (state.vpni_decisao || 0) > 0) && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideVPNI}
                                onChange={e => update('feriasIncideVPNI', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">VPNI (Quintos/Graduação)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency((state.vpni_lei || 0) + (state.vpni_decisao || 0))}</span>
                            </span>
                        </label>
                    )}

                    {/* ATS (Anuênios) */}
                    {(state.ats || 0) > 0 && (
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={incideATS}
                                onChange={e => update('feriasIncideATS', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">ATS (Anuênios)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.ats)}</span>
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
                                onChange={e => update('feriasIncideGrat', e.target.checked)}
                            />
                            <span className="flex-1 flex items-center justify-between gap-2">
                                <span className="text-body-xs text-neutral-700 dark:text-neutral-300">Gratificação Específica (GAE/GAS)</span>
                                <span className="font-mono text-body-xs text-neutral-600 dark:text-neutral-400 font-semibold">{formatCurrency(state.gratEspecificaValor)}</span>
                            </span>
                        </label>
                    )}

                    {/* Abono de Permanência */}
                    <label className={`${styles.checkboxLabel} ${!temAbonoAtivo ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            disabled={!temAbonoAtivo}
                            checked={incideAbono}
                            onChange={e => update('feriasIncideAbono', e.target.checked)}
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

                    {/* Rubricas Manuais de Crédito dinâmicas */}
                    {creditRubricas.map((rubrica, idx) => {
                        const isChecked = Boolean(state.feriasRubricasInclusas?.[rubrica.id]);
                        const label = rubrica.descricao.trim() || `Crédito Dinâmico #${idx + 1}`;
                        return (
                            <label key={rubrica.id} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={isChecked}
                                    onChange={e => {
                                        const current = state.feriasRubricasInclusas || {};
                                        update('feriasRubricasInclusas', {
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
                        Outras parcelas / Ajustes na base de férias:
                    </label>
                    <div className="relative w-full sm:w-44">
                        <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                            value={state.feriasOutrasParcelas || ''}
                            onChange={e => update('feriasOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                {/* Subtotal da Base Apurada e Adicional Correspondente */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-body-xs text-neutral-600 dark:text-neutral-400">Base apurada da remuneração (Férias)</span>
                        <span className="font-mono text-body-xs text-neutral-800 dark:text-neutral-200 font-bold">{formatCurrency(totalBaseApurada)}</span>
                    </div>
                    <div className={styles.internalTotalWrapper}>
                        <span className={styles.internalTotalLabel}>1/3 Constitucional correspondente</span>
                        <span className={styles.internalTotalValue}>{formatCurrency(tercoCalculado)}</span>
                    </div>
                </div>
            </div>

            {/* Configuração de recebimento no mês e valor */}
            <div className="flex items-center justify-between pt-1">
                <label className={styles.label}>Adicional 1/3 Férias (Mês Atual)</label>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={state.manualFerias}
                        onChange={e => update('manualFerias', e.target.checked)}
                        className={styles.checkbox}
                    />
                    Manual
                </label>
            </div>

            {state.manualFerias ? (
                <div className="relative">
                    <input
                        type="text"
                        className={styles.input}
                        data-calculator="true"
                        value={state.ferias1_3 ? state.ferias1_3.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                        onChange={e => update('ferias1_3', parseCurrencyInput(e.target.value))}
                        placeholder="0,00"
                    />
                </div>
            ) : (
                <div
                    className={styles.innerBox + ' cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'}
                    onClick={() => update('ferias1_3', state.ferias1_3 > 0 ? 0 : 1)}
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={state.ferias1_3 > 0}
                            readOnly
                            className={styles.checkbox}
                        />
                        <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <span className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300">Receber adicional no mês</span>
                                <span className={styles.valueDisplay}>{formatCurrency(state.ferias1_3)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Seção de férias recebidas anteriormente */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={state.feriasAntecipadas}
                        onChange={e => handleFeriasAntecipadasChange(e.target.checked)}
                        className={styles.checkbox}
                    />
                    Recebido 1/3 de férias em um mês anterior
                </label>
                <p className="text-label text-neutral-400 mt-1 ml-6">
                    Marque se recebeu o pagamento no contracheque anterior.
                </p>

                {state.feriasAntecipadas && (
                    <div className="mt-3 ml-6 space-y-2">
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={state.feriasDescManual}
                                onChange={e => handleFeriasDescManualChange(e.target.checked)}
                                className={styles.checkbox}
                            />
                            Alterar valor do desconto manualmente
                        </label>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-label text-neutral-500 dark:text-neutral-400">
                                Desconto aplicado
                            </span>
                            <span className={styles.valueDisplay}>
                                {formatCurrency(state.feriasDescManual ? state.feriasDesc : state.ferias1_3)}
                            </span>
                        </div>
                        {state.feriasDescManual && (
                            <input
                                type="text"
                                className={styles.input}
                                data-calculator="true"
                                value={state.feriasDesc ? state.feriasDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => update('feriasDesc', parseCurrencyInput(e.target.value))}
                                placeholder="0,00"
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
