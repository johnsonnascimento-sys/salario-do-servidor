import { resolvePensionUrp, validateLinkedPensionSalary } from '../../services/agency/engine/modules/pensionUrp';
import { toReferenceMonthIndex } from './referenceDateUtils';
import React, { useEffect, useState } from 'react';
import { PensionRegimeSelect } from './PensionRegimeSelect';
import type { PensionContext } from '../../services/agency/engine/modules/pensionContext';
import { PensionParticipationSelect } from './PensionParticipationSelect';
import { PENSION_HELP_CLASS } from './pensionHelp';
import { formatCurrency } from '../../utils/calculations';
import { ChevronDown } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../types';
import { PensionParticipation } from '../../types/pension';
import { toDecimalRateFromPercentInput, toPercentLabel, toPositiveNumber } from './dynamicPayrollForm.helpers';
import { PresetGrossSummary } from './PresetGrossSummary';
import { PresetGrossLine } from './dynamicPayrollForm.helpers';
import { getPensionErrorFeedback } from '../../utils/pensionFeedback';
import { groupPayslipRowsForDisplay } from '../../utils/payslipRows';
import type { PayslipResultRow } from '../../types/user';

interface DynamicPayrollTaxSectionProps {
    activeSection: 'pension' | 'incomeTax';
    resultRows: PayslipResultRow[];
    styles: Record<string, string>;
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    handleRegimePrevChange: (value: string) => void;
    showFunprespSection: boolean;
    previdenciaComplementar: CourtConfig['previdenciaComplementar'];
    funprespNormalOptions: number[];
    handleFunprespParticipacaoChange: (value: PensionParticipation) => void;
    funprespValidationError?: string;
    funprespAdditionalValidationError?: string;
    calculationError?: string | null;
    pensionContext?: PensionContext | null;
    selectionRequired?: boolean;
    calculationReady?: boolean;
    deducaoPorDependente?: number;
    abonoGrossLines: PresetGrossLine[];
}

export const DynamicPayrollTaxSection: React.FC<DynamicPayrollTaxSectionProps> = ({
    activeSection, resultRows, styles, state, update, handleRegimePrevChange, showFunprespSection,
    previdenciaComplementar: config, funprespNormalOptions, handleFunprespParticipacaoChange,
    funprespValidationError, funprespAdditionalValidationError, calculationError, pensionContext, selectionRequired, calculationReady, deducaoPorDependente, abonoGrossLines
}) => {
    const fieldId = React.useId();
    const participates = state.funprespParticipacao !== 'nao';
    const urp = state.funprespParticipacao === 'vinculado' ? resolvePensionUrp(config,
        `${state.anoRef}-${String(toReferenceMonthIndex(state.mesRef)).padStart(2, '0')}`, state.funprespVinculadaInicio ?? '') : null;
    const linkedError = urp?.reference ? validateLinkedPensionSalary(state.funprespBaseIntegral, urp.reference, pensionContext?.base) : urp?.error;
    const linkedFeedback = getPensionErrorFeedback(linkedError);
    const optionalItems = [
        ['fc', 'funprespIncluirFC', 'FC/CJ'], ['gas', 'funprespIncluirGAS', 'GAS'],
        ['gae', 'funprespIncluirGAE', 'GAE'], ['aqTreino', 'funprespIncluirAQTreino', 'AQ de treinamento']
    ] as const;
    const pensionEngineError = /previdência/i.test(calculationError ?? '') ? calculationError : null;
    const pendingOptions = Boolean((pensionEngineError && !linkedFeedback?.configuration) || (participates && (state.funprespRevisarOpcoes || funprespAdditionalValidationError)));
    const [optionsOpen, setOptionsOpen] = useState(pendingOptions);
    useEffect(() => {
        if (pendingOptions) setOptionsOpen(true);
    }, [pendingOptions, funprespAdditionalValidationError, pensionEngineError]);
    const activeOptions = Number(Boolean(state.pssSobreFC)) + (participates && showFunprespSection ?
        optionalItems.filter(([rule, field]) => config?.incidenceRules?.[rule] && state[field]).length +
        Number(state.funprespFacul > 0) + Number((state.funprespFaculValor ?? 0) > 0) : 0);
    const irDiscountRows = calculationReady
        ? groupPayslipRowsForDisplay(resultRows, state).filter(row => row.type === 'D' && row.label.startsWith('IMPOSTO DE RENDA'))
        : [];
    const irDiscountTotal = irDiscountRows.reduce((total, row) => total + row.value, 0);
    const pensionDiscountRows = calculationReady
        ? groupPayslipRowsForDisplay(resultRows, state).filter(row => row.type === 'D' &&
            (row.label.startsWith('CONTRIBUIÇÃO RPPS') || row.label.startsWith('FUNPRESP-JUD')))
        : [];
    const pensionDiscountTotal = pensionDiscountRows.reduce((total, row) => total + row.value, 0);
    const hasSavedSubstitutionPss = state.substitutionEntries.length > 0
        ? state.substitutionEntries.some(entry => entry.pssIsEA)
        : state.substPssIsEA;
    return <div className="space-y-4">
        {activeSection === 'pension' && <p id={`${fieldId}-tax-help`} className="mb-3 text-body text-neutral-600 dark:text-neutral-300">Informe seu regime previdenciário e, se aplicável, sua participação na Funpresp e o recebimento de abono de permanência.</p>}
        {activeSection === 'pension' && <>
        <section className={styles.card}>
            <h5 className="mb-1 text-h5 font-semibold">Regime previdenciário</h5>
            <p className="mb-3 text-body-xs text-neutral-600 dark:text-neutral-300">Informe o enquadramento da sua contribuição ao RPPS.</p>
            <PensionRegimeSelect className={styles.input} labelClassName={styles.label} compact
                value={state.regimePrev} onChange={handleRegimePrevChange} disabled={!pensionContext} />
        </section>
        <section className={`${styles.card} space-y-3`}>
            <h5 className="mb-1 text-h5 font-semibold">Abono de permanência</h5>
            <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Marque se você já cumpriu os requisitos para aposentadoria voluntária e optou por continuar em atividade. O abono é calculado com base na contribuição previdenciária (PSS) e será incluído como crédito na simulação.</p>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} checked={state.recebeAbono}
                    onChange={event => {
                        update('recebeAbono', event.target.checked);
                        if (event.target.checked) {
                            update('gaactaIncideAbono', true);
                            update('decimoIncideAbono', true);
                            update('feriasIncideAbono', true);
                        }
                    }} />
                <span>Recebo abono de permanência nesta competência</span>
            </label>
            {state.recebeAbono && <PresetGrossSummary lines={abonoGrossLines} />}
        </section>
        {optionalItems.some(([rule, field]) => state[field] && !config?.incidenceRules?.[rule]) && <fieldset className="mt-3 space-y-2">
            <legend className={styles.label}>Opções salvas que precisam de revisão</legend>
            <p className={PENSION_HELP_CLASS}>A configuração atual não permite estas inclusões. Desmarque-as para continuar, ou confira a configuração e a competência desta simulação.</p>
            {optionalItems.filter(([rule, field]) => state[field] && !config?.incidenceRules?.[rule]).map(([, field, label]) => <label key={field} className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} checked onChange={event => { if (!event.target.checked) update(field, false); }} />
                <span>{label} — inclusão salva</span>
            </label>)}
        </fieldset>}
        {showFunprespSection && config && <section id="funpresp-settings" tabIndex={-1} aria-labelledby={`${fieldId}-funpresp-title`} className={`${styles.card} space-y-3 scroll-mt-24`}>
            <h5 id={`${fieldId}-funpresp-title`} className="mb-1 text-h5 font-semibold">Funpresp-Jud</h5>
            <p className={PENSION_HELP_CLASS}>Use os dados da sua adesão ao plano. A participação na Funpresp é uma escolha separada do regime previdenciário acima.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PensionParticipationSelect className={styles.input} labelClassName={styles.label} compact
                    value={state.funprespParticipacao} onChange={handleFunprespParticipacaoChange}
                    disabled={!pensionContext}
                    allowed={pensionContext?.allowed ?? []} unavailableReasons={pensionContext?.unavailableReasons} />
                {participates && <label className={styles.label}>Alíquota {state.funprespParticipacao === 'vinculado' ? 'vinculada' : 'normal patrocinada'}
                    <select id={`${fieldId}-funprespAliq`} aria-invalid={!funprespNormalOptions.includes(state.funprespAliq)} aria-describedby={!funprespNormalOptions.includes(state.funprespAliq) ? `${fieldId}-rate-help` : undefined} className={styles.input} value={state.funprespAliq} onChange={e => update('funprespAliq', Number(e.target.value))}>
                        {!funprespNormalOptions.includes(state.funprespAliq) && <option value={state.funprespAliq}>Selecione a alíquota</option>}
                        {funprespNormalOptions.map(rate => <option key={rate} value={rate}>{toPercentLabel(rate)}</option>)}
                    </select>
                    {!funprespNormalOptions.includes(state.funprespAliq) && <span id={`${fieldId}-rate-help`} className="block mt-1 text-body-xs text-error-600 dark:text-error-400">Selecione o percentual da sua adesão entre as alíquotas permitidas.</span>}
                </label>}
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Base de contribuição escolhida no plano (R$)
                    <input id={`${fieldId}-funprespBaseIntegral`} type="number" className={styles.input} min={0} step="0.01" aria-describedby="funpresp-urp-reference" aria-invalid={Boolean(linkedError && !linkedFeedback?.configuration)} value={state.funprespBaseIntegral ?? ''} onChange={e => update('funprespBaseIntegral', toPositiveNumber(e.target.value))} />
                    <span className={PENSION_HELP_CLASS}>É o valor sobre o qual a alíquota será aplicada. Não informe aqui o desconto mensal do contracheque.</span>
                </label>}
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Mês e ano da inscrição ou alteração da base
                    <input id={`${fieldId}-funprespVinculadaInicio`} type="month" className={styles.input} aria-describedby="funpresp-date-help" value={state.funprespVinculadaInicio ?? ''} onChange={e => update('funprespVinculadaInicio', e.target.value)} />
                </label>}
            </div>
            {urp?.reference && <p id="funpresp-urp-reference" className={PENSION_HELP_CLASS}>
                Menor base permitida: <strong>{formatCurrency(urp.reference.minimo)}</strong>.
                {' '}Referência: {urp.reference.competencia}.
                {' '}<a href={/^https?:\/\//i.test(urp.reference.fonte) ? urp.reference.fonte : undefined} target="_blank" rel="noopener noreferrer" className="underline">Fonte oficial</a>
                {pensionContext && <> Máximo pela base elegível: {formatCurrency(pensionContext.base)}.</>}
            </p>}
            {urp?.reference && pensionContext && urp.reference.minimo <= pensionContext.base && <button type="button" className="text-body-xs font-semibold underline" onClick={() => update('funprespBaseIntegral', urp.reference!.minimo)}>
                Usar menor base permitida
            </button>}
            {urp?.reference && <p className={PENSION_HELP_CLASS}>Use a menor base somente se ela corresponder à sua adesão ao plano.</p>}
            {state.funprespParticipacao === 'vinculado' && <p id="funpresp-date-help" className={PENSION_HELP_CLASS}>
                Use a inscrição ou alteração que já estava valendo no mês deste holerite.
                Uma alteração solicitada em novembro pode começar a valer somente em janeiro. Confira essa informação no cadastro do plano.
            </p>}
            {!pensionContext && <p role="status" className={PENSION_HELP_CLASS}>Aguarde a base previdenciária ou confira os dados salariais para escolher sua participação.</p>}
            {!selectionRequired && (linkedError || funprespValidationError) && (linkedFeedback?.configuration ?
                <div id="funpresp-urp-reference" role="status" className="rounded-lg border border-warning-300 bg-warning-50 p-4 text-body-xs text-warning-800 dark:bg-warning-900/20 dark:text-warning-200">
                    <p className="font-semibold">{linkedFeedback.title}</p>
                    <p className="mt-2">{linkedFeedback.message}</p>
                    <p className="mt-2">O resultado completo ficará disponível depois dessa atualização. Você pode continuar preenchendo as outras verbas; seu rascunho será mantido.</p>
                    <details className="mt-2"><summary className="cursor-pointer underline">Informações para suporte</summary><p className="mt-2 break-words">{linkedError}</p></details>
                </div> : <p id={urp?.reference ? undefined : "funpresp-urp-reference"} role="alert" className="text-body-xs text-error-600 dark:text-error-400">{linkedFeedback?.message || linkedError || funprespValidationError}</p>)}
        </section>}
        <details className={`${styles.card} space-y-3`}
            open={optionsOpen} id={`${fieldId}-options`} onToggle={event => setOptionsOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer min-h-11 py-2 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                Opções adicionais de previdência ({activeOptions} {activeOptions === 1 ? 'ativa' : 'ativas'})
            </summary>
            <label className={styles.checkboxLabel}>
                <input id={`${fieldId}-pssSobreFC`} type="checkbox" className={styles.checkbox} checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} />
                <span>PSS sobre FC/CJ (RPPS)</span>
            </label>
            {showFunprespSection && config && participates && <>
                {state.funprespRevisarOpcoes && <div role="alert" className="rounded-lg border border-amber-400 p-3 text-body-xs">
                    <p>Esta simulação foi salva com a base antiga da Funpresp. Confira as opções de inclusão antes de recalcular.</p>
                    <button type="button" className="mt-2 font-semibold underline" onClick={() => update('funprespRevisarOpcoes', false)}>Confirmar opções da Funpresp</button>
                </div>}
                <fieldset className="space-y-2">
                    <legend className={styles.label}>Opções de inclusão na base da Funpresp</legend>
                    <p className="text-body-xs">Marque somente parcelas cuja inclusão você optou no plano. Estas escolhas são independentes da incidência no RPPS.</p>
                    <div className="flex flex-wrap gap-4">
                        {optionalItems.filter(([rule]) => config.incidenceRules?.[rule]).map(([, field, label]) => <label key={field} className={styles.checkboxLabel}>
                            <input type="checkbox" className={styles.checkbox} checked={Boolean(state[field])} onChange={e => update(field, e.target.checked)} />
                            <span>{label}</span>
                        </label>)}
                    </div>
                </fieldset>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className={styles.label}>Facultativa regular (%)
                        <input id={`${fieldId}-funprespFacul`} type="number" className={styles.input} min={0} max={config.facultativeRate.max === undefined ? undefined : config.facultativeRate.max * 100} step={config.facultativeRate.step === undefined ? 'any' : config.facultativeRate.step * 100} value={Number((state.funprespFacul * 100).toFixed(6))} onChange={e => update('funprespFacul', toDecimalRateFromPercentInput(e.target.value))} />
                    </label>
                    <label className={styles.label}>Aporte esporádico (R$)
                        <input id={`${fieldId}-funprespFaculValor`} type="number" className={styles.input} min={0} step="0.01" value={state.funprespFaculValor ?? 0} onChange={e => update('funprespFaculValor', toPositiveNumber(e.target.value))} />
                    </label>
                    <label className={styles.label}>Pagamento das facultativas e do aporte
                        <select id={`${fieldId}-funprespFaculForma`} className={styles.input} value={state.funprespFaculForma ?? 'folha'} onChange={e => update('funprespFaculForma', e.target.value)}>
                            <option value="folha">Desconto em folha</option>
                            <option value="externo">Pagamento externo</option>
                        </select>
                    </label>
                </div>
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">O desconto normal da Funpresp é calculado pela alíquota e pela base escolhidas. O aporte esporádico é um valor adicional: não informe nele o desconto normal do holerite.</p>
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Contribuições facultativas não recebem contrapartida patronal. Pagamentos externos aparecem na memória e não reduzem o líquido da folha; a dedução anual será informada separadamente.</p>
            </>}
            {funprespAdditionalValidationError && <p role="alert" className="text-body-xs text-error-600 dark:text-error-400">{funprespAdditionalValidationError}</p>}
        </details>
        {hasSavedSubstitutionPss && (
            <p className={`${styles.card} text-body-xs text-neutral-600 dark:text-neutral-300`}>
                Esta simulação anterior tem PSS sobre substituição de função. O cálculo mantém a incidência registrada.
            </p>
        )}
        <details aria-label="Resumo calculado da previdência" className={`${styles.card} group`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                <span className="text-label font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Resumo calculado</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-1.5 pt-2 text-body-xs">
                <dl className="space-y-1.5">
                    <div className="flex flex-wrap justify-between gap-2"><dt>Regime previdenciário</dt><dd>{state.regimePrev === 'rpc' || state.regimePrev === 'migrado' ? 'RPPS limitado ao teto do RGPS' : 'RPPS sem teto do RGPS'}</dd></div>
                    <div className="flex flex-wrap justify-between gap-2"><dt>PSS sobre FC/CJ</dt><dd>{state.pssSobreFC ? 'Incluído' : 'Não incluído'}</dd></div>
                    {showFunprespSection && <div className="flex flex-wrap justify-between gap-2"><dt>Participação na Funpresp</dt><dd>{state.funprespParticipacao === 'nao' ? 'Não participa' : state.funprespParticipacao === 'patrocinado' ? 'Patrocinada — com contrapartida' : 'Vinculada — sem contrapartida'}</dd></div>}
                </dl>
                {calculationReady ? <>
                    <dl className="space-y-1.5 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                        {state.pensionMemory?.mensal && <div className="flex flex-wrap justify-between gap-2"><dt>Base de contribuição RPPS mensal</dt><dd className="font-mono font-semibold">{formatCurrency(state.pensionMemory.mensal.baseRpps)}</dd></div>}
                    </dl>
                    {pensionDiscountRows.length > 0 ? <div className="space-y-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                        {pensionDiscountRows.map(row => <div key={row.label} className="space-y-1">
                            <div className="flex flex-wrap justify-between gap-2"><dt>{row.label}</dt><dd className="font-mono font-semibold text-error-600 dark:text-error-400">{formatCurrency(row.value)}</dd></div>
                            {row.details?.map((detail, index) => <div key={`${row.label}-${detail.label}-${index}`} className="flex flex-wrap justify-between gap-2 pl-3 text-neutral-600 dark:text-neutral-300">
                                <dt>{detail.label}</dt><dd className="font-mono">{formatCurrency(detail.value)}</dd>
                            </div>)}
                        </div>)}
                        <div className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-2 font-semibold dark:border-neutral-700"><dt>Total de descontos previdenciários</dt><dd className="font-mono text-error-600 dark:text-error-400">{formatCurrency(pensionDiscountTotal)}</dd></div>
                    </div> : <p className="border-t border-neutral-200 pt-2 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">Não há descontos previdenciários nesta simulação.</p>}
                    <p className="text-neutral-600 dark:text-neutral-300">Os valores e detalhamentos seguem as mesmas rubricas previdenciárias do detalhamento final do holerite, incluindo PSS e Funpresp quando aplicáveis.</p>
                </> : <p role="status" className="pt-2 text-neutral-600 dark:text-neutral-300">{calculationError ? 'Resolva as pendências da simulação para consultar os valores deste resumo.' : 'Aguardando o cálculo atual para exibir a contribuição.'}</p>}
            </div>
        </details>
        </>
        }
        {activeSection === 'incomeTax' && <>
        <section id="dependentes-ir" className={styles.card}>
            <h5 className="mb-1 text-h5 font-semibold">Dependentes para IR</h5>
            <p className="mb-3 text-body-xs text-neutral-600 dark:text-neutral-300">Informe a quantidade de dependentes considerados no imposto de renda.</p>
            <div className="max-w-xs">
            <div>
                <label htmlFor={`${fieldId}-dependentes`} className={styles.label}>Dependentes (IR)</label>
                <div className="flex items-stretch gap-2">
                    <button type="button" aria-label="Remover dependente" disabled={state.dependentes <= 0} onClick={() => update('dependentes', Math.max(0, state.dependentes - 1))} className="min-h-11 min-w-11 rounded-lg border border-neutral-300 text-xl font-semibold disabled:opacity-40 dark:border-neutral-600">−</button>
                    <input id={`${fieldId}-dependentes`} type="number" min={0} step={1} className={`${styles.input} text-center`} value={state.dependentes} onChange={e => update('dependentes', Math.floor(toPositiveNumber(e.target.value)))} />
                    <button type="button" aria-label="Adicionar dependente" onClick={() => update('dependentes', state.dependentes + 1)} className="min-h-11 min-w-11 rounded-lg border border-neutral-300 text-xl font-semibold dark:border-neutral-600">+</button>
                </div>
            </div>
            </div>
            <div className="mt-2">
                <PresetGrossSummary compact lines={[
                    { label: 'Abatimento mensal dos dependentes (IR)', value: state.dependentes * (deducaoPorDependente ?? 0), isDiscount: false }
                ]} />
            </div>
        </section>
        <details aria-label="Descontos de Imposto de Renda" className={`${styles.card} group`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                <span className="text-label font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Descontos de Imposto de Renda</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-1.5 pt-2 text-body-xs">
                {calculationReady ? <>
                    {irDiscountRows.length > 0 ? <div className="space-y-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                        {irDiscountRows.map(row => <div key={row.label} className="space-y-1">
                            <div className="flex flex-wrap justify-between gap-2"><dt>{row.label}</dt><dd className="font-mono font-semibold text-error-600 dark:text-error-400">{formatCurrency(row.value)}</dd></div>
                            {row.details?.map((detail, index) => <div key={`${row.label}-${detail.label}-${index}`} className="flex flex-wrap justify-between gap-2 pl-3 text-neutral-600 dark:text-neutral-300">
                                <dt>{detail.label}</dt><dd className="font-mono">{formatCurrency(detail.value)}</dd>
                            </div>)}
                        </div>)}
                        <div className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 pt-2 font-semibold dark:border-neutral-700"><dt>Total de descontos de IR</dt><dd className="font-mono text-error-600 dark:text-error-400">{formatCurrency(irDiscountTotal)}</dd></div>
                    </div> : <p className="border-t border-neutral-200 pt-2 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">Não há descontos de IR nesta simulação.</p>}
                    <p className="text-neutral-600 dark:text-neutral-300">Os valores e detalhamentos seguem as mesmas rubricas do detalhamento final do holerite, incluindo exercício corrente, exercícios anteriores, férias e 13º quando aplicáveis.</p>
                </> : <p role="status" className="pt-2 text-neutral-600 dark:text-neutral-300">{calculationError ? 'Resolva as pendências da simulação para consultar os valores deste resumo.' : 'Aguardando o cálculo atual para exibir as bases e os descontos.'}</p>}
            </div>
        </details>
        </>}
    </div>;
};
