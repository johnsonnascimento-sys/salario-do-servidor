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

    // Base integral do cargo e da função para referência e apuração automática de saldos
    const baseSemFC = useMemo(() => {
        return (state.vencimento || 0) +
            (state.gaj || 0) +
            (state.aqTituloValor || 0) +
            (state.aqTreinoValor || 0) +
            (state.gratEspecificaValor || 0) +
            (state.vpni_lei || 0) +
            (state.vpni_decisao || 0) +
            (state.ats || 0);
    }, [
        state.vencimento,
        state.gaj,
        state.aqTituloValor,
        state.aqTreinoValor,
        state.gratEspecificaValor,
        state.vpni_lei,
        state.vpni_decisao,
        state.ats
    ]);

    const noFunctionCode = courtConfig?.careerCatalog?.noFunctionCode;
    const funcaoValor = useMemo(() => {
        if (!state.funcao || state.funcao === noFunctionCode || !courtConfig?.bases?.funcoes) {
            return 0;
        }
        return courtConfig.bases.funcoes[state.funcao] || 0;
    }, [state.funcao, noFunctionCode, courtConfig]);

    const saldoVencCalculado = useMemo(() => {
        return roundCurrency(Math.max(0, baseSemFC - (state.adiant13Venc || 0)));
    }, [baseSemFC, state.adiant13Venc]);

    const saldoFCCalculado = useMemo(() => {
        return roundCurrency(Math.max(0, funcaoValor - (state.adiant13FC || 0)));
    }, [funcaoValor, state.adiant13FC]);

    // Permite que o usuário opte por customizar manualmente a 2ª parcela
    // caso não queira usar o saldo complementar automático
    const [customizarSegunda, setCustomizarSegunda] = useState(false);

    const handleToggleManual = (enabled: boolean) => {
        update('manualAdiant13', enabled);
        if (enabled) {
            // Se os valores estiverem zerados ou com flag booleana (1), preenche com os 50% padrão como ponto de partida
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
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className={styles.label}>2ª Parcela (FC/CJ)</label>
                        {state.manualAdiant13 && !customizarSegunda && funcaoValor > 0 && (
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
                                    {funcaoValor > 0 && (
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
                                    )}
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
            </div>
        </div>
    );
};
