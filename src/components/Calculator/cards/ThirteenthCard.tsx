import React, { useState, useMemo } from 'react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';

interface ThirteenthCardProps {
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

export const ThirteenthCard: React.FC<ThirteenthCardProps> = ({ state, update, styles, courtConfig }) => {
    const isNov = state.tipoCalculo === 'nov';

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
    const incideVenc = state.decimoIncideVencimento !== false;
    const incideGAJ = state.decimoIncideGAJ !== false;
    const incideFuncao = state.decimoIncideFuncao !== false;
    const incideAQTitulo = state.decimoIncideAQTitulo !== false;
    const incideAQTreino = state.decimoIncideAQTreino !== false;
    const incideVPNI = state.decimoIncideVPNI !== false;
    const incideATS = state.decimoIncideATS !== false;
    const incideGrat = state.decimoIncideGrat !== false;
    const incideAbono = Boolean(state.decimoIncideAbono);

    const funcaoValor = incideFuncao ? funcaoValorBruta : 0;

    // Base apurada do cargo efetivo com as seleções dinâmicas
    const baseSemFC = useMemo(() => {
        let total = 0;
        if (incideVenc) total += (state.vencimento || 0);
        if (incideGAJ) total += (state.gaj || 0);
        if (incideAQTitulo) total += (state.aqTituloValor || 0);
        if (incideAQTreino) total += (state.aqTreinoValor || 0);
        if (incideGrat) total += (state.gratEspecificaValor || 0);
        if (incideVPNI) total += (state.vpni_lei || 0) + (state.vpni_decisao || 0);
        if (incideATS) total += (state.ats || 0);
        if (incideAbono && temAbonoAtivo) total += valorAbono;

        if (state.decimoRubricasInclusas && Array.isArray(state.rubricasExtras)) {
            state.rubricasExtras
                .filter(r => r.tipo === 'C' && state.decimoRubricasInclusas?.[r.id] === true)
                .forEach(r => {
                    total += (r.valor || 0);
                });
        }

        if (state.decimoOutrasParcelas && state.decimoOutrasParcelas > 0) {
            total += state.decimoOutrasParcelas;
        }

        return roundCurrency(total);
    }, [
        incideVenc,
        incideGAJ,
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
        state.decimoRubricasInclusas,
        state.rubricasExtras,
        state.decimoOutrasParcelas
    ]);

    const totalBaseApurada = roundCurrency(baseSemFC + funcaoValor);

    const saldoVencCalculado = useMemo(() => {
        return roundCurrency(Math.max(0, baseSemFC - (state.adiant13Venc || 0)));
    }, [baseSemFC, state.adiant13Venc]);

    const saldoFCCalculado = useMemo(() => {
        return roundCurrency(Math.max(0, funcaoValor - (state.adiant13FC || 0)));
    }, [funcaoValor, state.adiant13FC]);

    // Permite que o usuário opte por customizar manualmente a 2ª parcela
    const [customizarSegunda, setCustomizarSegunda] = useState(false);

    const handleToggleManual = (enabled: boolean) => {
        update('manualAdiant13', enabled);
        if (enabled) {
            if (!state.adiant13Venc || state.adiant13Venc <= 1) {
                update('adiant13Venc', roundCurrency(baseSemFC / 2));
            }
            if (funcaoValor > 0 && (!state.adiant13FC || state.adiant13FC <= 1)) {
                update('adiant13FC', roundCurrency(funcaoValor / 2));
            }
        }
    };

    const renderAutoToggle = (enabled: boolean, amount: number, label: string, onToggle: () => void) => (
        <div
            className={styles.innerBox + ' cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'}
            onClick={onToggle}
        >
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    checked={enabled}
                    readOnly
                    className={styles.checkbox}
                />
                <div className="flex-1">
                    <div className="flex justify-between">
                        <span className="text-body-xs font-bold text-neutral-700 dark:text-neutral-300">{label}</span>
                        <span className="text-body-xs font-mono text-neutral-500">{formatCurrency(amount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <p className="text-body-xs text-neutral-500 dark:text-neutral-400">
                1ª parcela sem IR/PSS. Na 2ª parcela (novembro), IR e PSS incidem sobre a remuneração integral (1ª + 2ª), sem PSS sobre FC/CJ, com abatimento do adiantamento recebido.
            </p>

            {/* Composição da Base da Remuneração (similar ao GAACTA) */}
            <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={styles.label}>
                        Composição da Remuneração de Referência (13º)
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Selecione as parcelas que integram o cálculo
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Vencimento Básico */}
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={incideVenc}
                            onChange={e => update('decimoIncideVencimento', e.target.checked)}
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
                            onChange={e => update('decimoIncideGAJ', e.target.checked)}
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
                                onChange={e => update('decimoIncideFuncao', e.target.checked)}
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
                                onChange={e => update('decimoIncideAQTitulo', e.target.checked)}
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
                                onChange={e => update('decimoIncideAQTreino', e.target.checked)}
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
                                onChange={e => update('decimoIncideVPNI', e.target.checked)}
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
                                onChange={e => update('decimoIncideATS', e.target.checked)}
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
                                onChange={e => update('decimoIncideGrat', e.target.checked)}
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
                            checked={temAbonoAtivo && incideAbono}
                            onChange={e => update('decimoIncideAbono', e.target.checked)}
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
                        const isChecked = Boolean(state.decimoRubricasInclusas?.[rubrica.id]);
                        const label = rubrica.descricao.trim() || `Crédito Dinâmico #${idx + 1}`;
                        return (
                            <label key={rubrica.id} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={isChecked}
                                    onChange={e => {
                                        const current = state.decimoRubricasInclusas || {};
                                        update('decimoRubricasInclusas', {
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
                        Outras parcelas / Ajustes na base do 13º:
                    </label>
                    <div className="relative w-full sm:w-44">
                        <span className="absolute left-3 top-2.5 text-body-xs font-mono text-neutral-400">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`${styles.input} pl-9 py-1.5 text-right font-mono text-body-xs`}
                            value={state.decimoOutrasParcelas || ''}
                            onChange={e => update('decimoOutrasParcelas', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0,00"
                        />
                    </div>
                </div>

                {/* Subtotal da Base Apurada */}
                <div className={styles.internalTotalWrapper}>
                    <span className={styles.internalTotalLabel}>Base apurada da remuneração (13º)</span>
                    <span className={styles.internalTotalValue}>{formatCurrency(totalBaseApurada)}</span>
                </div>
            </div>

            {/* Seção de Adiantamento e Parcelas */}
            <div className="flex justify-end">
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={state.manualAdiant13}
                        onChange={e => handleToggleManual(e.target.checked)}
                        className={styles.checkbox}
                    />
                    Ajustar valores manualmente (adiantamento recebido)
                </label>
            </div>

            {state.manualAdiant13 && (
                <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg p-3 text-body-xs text-primary-800 dark:text-primary-300">
                    💡 <strong>Como preencher:</strong> Informe nos campos de <em>Adiantamento</em> o valor que foi descontado no seu contracheque a título de adiantamento da 1ª parcela (cargo efetivo e função comissionada ou cargo em comissão - FC/CJ). A calculadora apura automaticamente o <strong>saldo da 2ª parcela</strong> para garantir que a base integral e as retenções tributárias (IRRF e PSS) fechem em 100%.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1ª Parcela - Vencimento */}
                <div>
                    <label className={styles.label}>
                        Adiantamento 1ª Parcela (Cargo Efetivo)
                    </label>
                    {state.manualAdiant13 ? (
                        <div>
                            <input
                                type="text"
                                className={styles.input}
                                data-calculator="true"
                                value={state.adiant13Venc ? state.adiant13Venc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                onChange={e => update('adiant13Venc', parseCurrencyInput(e.target.value))}
                                placeholder="0,00"
                            />
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                                Valor descontado do adiantamento do cargo no contracheque
                            </p>
                        </div>
                    ) : (
                        renderAutoToggle(
                            state.adiant13Venc > 0,
                            state.adiant13Venc,
                            'Receber adiantamento',
                            () => {
                                const nextEnabled = !(state.adiant13Venc > 0);
                                if (!nextEnabled && state.segunda13Venc > 0) {
                                    update('segunda13Venc', 0);
                                }
                                update('adiant13Venc', nextEnabled ? 1 : 0);
                            }
                        )
                    )}
                </div>

                {/* 1ª Parcela - FC/CJ */}
                {funcaoValorBruta > 0 && incideFuncao && (
                    <div>
                        <label className={styles.label}>
                            Adiantamento 1ª Parcela (FC/CJ)
                        </label>
                        {state.manualAdiant13 ? (
                            <div>
                                <input
                                    type="text"
                                    className={styles.input}
                                    data-calculator="true"
                                    value={state.adiant13FC ? state.adiant13FC.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                    onChange={e => update('adiant13FC', parseCurrencyInput(e.target.value))}
                                    placeholder="0,00"
                                />
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                                    Valor descontado do adiantamento de FC ou CJ no contracheque
                                </p>
                            </div>
                        ) : (
                            renderAutoToggle(
                                state.adiant13FC > 0,
                                state.adiant13FC,
                                'Receber adiantamento',
                                () => {
                                    const nextEnabled = !(state.adiant13FC > 0);
                                    if (!nextEnabled && state.segunda13FC > 0) {
                                        update('segunda13FC', 0);
                                    }
                                    update('adiant13FC', nextEnabled ? 1 : 0);
                                }
                            )
                        )}
                    </div>
                )}

                {/* 2ª Parcela - Vencimento */}
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className={styles.label}>2ª Parcela (Cargo Efetivo)</label>
                        {state.manualAdiant13 && !customizarSegunda && (
                            <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                Saldo automático
                            </span>
                        )}
                    </div>
                    {state.manualAdiant13 ? (
                        customizarSegunda ? (
                            <div>
                                <input
                                    type="text"
                                    className={styles.input}
                                    data-calculator="true"
                                    value={state.segunda13Venc ? state.segunda13Venc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                    onChange={e => update('segunda13Venc', parseCurrencyInput(e.target.value))}
                                    placeholder="0,00"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCustomizarSegunda(false);
                                        update('segunda13Venc', 1);
                                    }}
                                    className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline mt-1"
                                >
                                    Voltar para cálculo automático do saldo
                                </button>
                            </div>
                        ) : (
                            <div className={styles.innerBox}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="text-body-xs font-bold text-neutral-800 dark:text-neutral-200">
                                            {formatCurrency(state.segunda13Venc > 1 ? state.segunda13Venc : saldoVencCalculado)}
                                        </span>
                                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                            Integral ({formatCurrency(baseSemFC)}) − Adiantamento ({formatCurrency(state.adiant13Venc || 0)})
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomizarSegunda(true);
                                            update('segunda13Venc', saldoVencCalculado);
                                        }}
                                        className="text-[11px] text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 underline"
                                    >
                                        Editar
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        renderAutoToggle(
                            state.segunda13Venc > 0,
                            state.segunda13Venc,
                            'Receber segunda parcela',
                            () => {
                                const nextEnabled = !(state.segunda13Venc > 0);
                                if (nextEnabled) {
                                    update('segunda13Venc', 1);
                                    if (state.adiant13Venc <= 0) {
                                        update('adiant13Venc', 1);
                                    }
                                    return;
                                }
                                update('segunda13Venc', 0);
                            }
                        )
                    )}
                </div>

                {/* 2ª Parcela - FC/CJ */}
                {funcaoValorBruta > 0 && incideFuncao && (
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className={styles.label}>2ª Parcela (FC/CJ)</label>
                            {state.manualAdiant13 && !customizarSegunda && (
                                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                    Saldo automático
                                </span>
                            )}
                        </div>
                        {state.manualAdiant13 ? (
                            customizarSegunda ? (
                                <div>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        data-calculator="true"
                                        value={state.segunda13FC ? state.segunda13FC.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                        onChange={e => update('segunda13FC', parseCurrencyInput(e.target.value))}
                                        placeholder="0,00"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomizarSegunda(false);
                                            update('segunda13FC', 1);
                                        }}
                                        className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline mt-1"
                                    >
                                        Voltar para cálculo automático do saldo
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.innerBox}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-body-xs font-bold text-neutral-800 dark:text-neutral-200">
                                                {formatCurrency(state.segunda13FC > 1 ? state.segunda13FC : saldoFCCalculado)}
                                            </span>
                                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                                Integral ({formatCurrency(funcaoValor)}) − Adiantamento ({formatCurrency(state.adiant13FC || 0)})
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCustomizarSegunda(true);
                                                update('segunda13FC', saldoFCCalculado);
                                            }}
                                            className="text-[11px] text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 underline"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            renderAutoToggle(
                                state.segunda13FC > 0,
                                state.segunda13FC,
                                'Receber segunda parcela',
                                () => {
                                    const nextEnabled = !(state.segunda13FC > 0);
                                    if (nextEnabled) {
                                        update('segunda13FC', 1);
                                        if (state.adiant13FC <= 0) {
                                            update('adiant13FC', 1);
                                        }
                                        return;
                                    }
                                    update('segunda13FC', 0);
                                }
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
