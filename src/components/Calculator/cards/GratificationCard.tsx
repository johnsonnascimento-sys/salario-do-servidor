import React, { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
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

export const GratificationCard: React.FC<GratificationCardProps> = ({ state: savedState, update: saveField, styles, courtConfig }) => {
    const fieldId = React.useId();
    const [draft, setDraft] = React.useState<CalculatorState | null>(null);
    const state = draft ?? savedState;
    const update = (field: keyof CalculatorState, value: any) => {
        if (draft) setDraft(current => current ? { ...current, [field]: value } : current);
        else saveField(field, value);
    };
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
    const pssDefault = courtConfig?.payrollRules?.specificGratificationPssDefaults?.[state.gratEspecificaTipo as 'gae' | 'gas'];
    const personalizada = !incideVenc || incideGAJ || incideFuncao || incideAQTitulo || incideAQTreino || incideVPNI || incideATS || incideAbono || Boolean(state.gratOutrasParcelas) || Object.values(state.gratRubricasInclusas || {}).some(Boolean) || (typeof pssDefault === 'boolean' && state.incidirPSSGrat !== pssDefault);
    const valorGratificacaoCalculada = useMemo(() => {
        if (!isGratAtiva) return 0;
        return roundCurrency(totalBaseApurada * specificGratRate);
    }, [isGratAtiva, totalBaseApurada, specificGratRate]);

    return (
        <div className="space-y-4">
            {!draft && <p className="text-body text-neutral-600 dark:text-neutral-300">Qual gratificação se aplica ao seu cargo?</p>}
            {!draft && <>
            <fieldset>
                <legend className="sr-only">Tipo de gratificação</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                        { value: '0', label: 'Nenhuma' },
                        { value: 'gae', label: 'GAE — Atividade externa' },
                        { value: 'gas', label: 'GAS — Atividade de segurança' }
                    ].map(option => {
                        const selected = option.value === '0' ? !isGratAtiva : state.gratEspecificaTipo === option.value;
                        return <label key={option.value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-body font-medium ${selected ? 'border-neutral-600 bg-neutral-100 text-neutral-900 dark:border-neutral-400 dark:bg-neutral-700 dark:text-neutral-100' : 'border-neutral-200 text-neutral-700 dark:border-neutral-700 dark:text-neutral-200'}`}>
                            <input type="radio" name={`${fieldId}-gratificacao`} value={option.value} checked={selected} className="accent-neutral-700 dark:accent-neutral-300"
                                onChange={e => {
                                    const patch = getGratificationSelectionPatch(e.target.value, courtConfig);
                                    Object.entries(patch).forEach(([field, value]) => update(field as keyof CalculatorState, value));
                                }} />
                            <span>{option.label}</span>
                        </label>;
                    })}
                </div>
            </fieldset>
            {isGratAtiva && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold dark:border-neutral-600" onClick={() => setDraft(savedState)}><SlidersHorizontal size={16} aria-hidden="true" />Personalizar cálculo</button>
            </div>}
            </>}
            {draft && <section className="space-y-4" aria-label="Personalizar cálculo">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Personalizar {state.gratEspecificaTipo.toUpperCase()}</h3>
            {/* Composição da Base da Remuneração (similar ao 13º e GAACTA) */}
            <div>
                <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={styles.label}>
                        Composição da Base de Cálculo (GAE / GAS)
                    </span>
                    <span className="text-body-xs text-neutral-500 dark:text-neutral-400">
                        Selecione as parcelas que compõem a base
                    </span>
                </div>

                <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-700 [&>label]:py-3">
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
                                <span className="text-body-xs text-neutral-400 dark:text-neutral-500 font-normal">
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
                                    <span className="text-body-xs text-neutral-700 dark:text-neutral-300 min-w-0 break-words" title={label}>
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
                        <input id={`${fieldId}-gratOutrasParcelas`} aria-label="Outras parcelas da base da GAE / GAS"
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

                <fieldset className="border-t border-neutral-200 pt-3 dark:border-neutral-700">
                    <legend className="sr-only">Contribuição previdenciária</legend>
                    <p className={styles.label}>Contribuição previdenciária</p>
                    <label className={`${styles.checkboxLabel} border-b border-neutral-200 py-3 dark:border-neutral-700`}>
                        <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={state.incidirPSSGrat}
                            onChange={e => update('incidirPSSGrat', e.target.checked)}
                        />
                        <span className="text-body-xs text-neutral-700 dark:text-neutral-300">
                            Incluir a gratificação no cálculo da contribuição previdenciária (PSS)
                        </span>
                    </label>
                    <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Confira se essa inclusão se aplica ao seu caso.</p>
                    <p className="text-body-xs text-neutral-600 dark:text-neutral-300">A GAE compõe a base do PSS. A GAS fica fora dessa base por padrão, ressalvados a opção de inclusão e o enquadramento previdenciário aplicável. Consulte <a className="underline" href="https://scon.stj.jus.br/SCON/GetInteiroTeorDoAcordao?dt_publicacao=24%2F09%2F2020&num_registro=201903436453" target="_blank" rel="noopener noreferrer">STJ</a> e <a className="underline" href="https://www.cjf.jus.br/cjf/noticias/2020/11-novembro/gratificacao-de-atividade-de-seguranca-nao-incorpora-aos-proventos-de-aposentadoria-do-servidor-publico" target="_blank" rel="noopener noreferrer">TNU, Tema 257</a>.</p>
                    {typeof pssDefault !== 'boolean' && (
                        <p role="status" className="text-body-xs text-amber-700 dark:text-amber-300">
                            Padrão de PSS ainda não cadastrado para esta gratificação. Confira a seleção previdenciária antes de concluir a simulação.
                        </p>
                    )}
                </fieldset>

                {/* Subtotal da Base Apurada e Valor Correspondente (35%) */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-body-xs text-neutral-600 dark:text-neutral-400">Base apurada da gratificação</span>
                        <span className="font-mono text-body-xs text-neutral-800 dark:text-neutral-200 font-bold">{formatCurrency(totalBaseApurada)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-body-xs dark:border-neutral-700">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">Valor da gratificação</span>
                        <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(valorGratificacaoCalculada)}</span>
                    </div>
                </div>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" className="rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-600" onClick={() => setDraft(null)}>Cancelar</button>
                <button type="button" className="rounded-lg bg-neutral-800 px-4 py-2 font-semibold text-white dark:bg-neutral-200 dark:text-neutral-900" onClick={() => {
                    const fields: (keyof CalculatorState)[] = ['incidirPSSGrat', 'gratIncideVencimento', 'gratIncideGAJ', 'gratIncideFuncao', 'gratIncideAQTitulo', 'gratIncideAQTreino', 'gratIncideVPNI', 'gratIncideATS', 'gratIncideAbono', 'gratRubricasInclusas', 'gratOutrasParcelas'];
                    fields.forEach(field => { if (draft[field] !== savedState[field]) saveField(field, draft[field]); });
                    setDraft(null);
                }}>Aplicar ajustes</button>
            </div>
            </section>}

        </div>
    );
};

