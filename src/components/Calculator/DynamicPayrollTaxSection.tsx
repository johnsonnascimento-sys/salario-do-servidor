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
import { SharedPensionSummary } from './SharedPensionSummary';
import { getPensionErrorFeedback } from '../../utils/pensionFeedback';

interface DynamicPayrollTaxSectionProps {
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
}

export const DynamicPayrollTaxSection: React.FC<DynamicPayrollTaxSectionProps> = ({
    styles, state, update, handleRegimePrevChange, showFunprespSection,
    previdenciaComplementar: config, funprespNormalOptions, handleFunprespParticipacaoChange,
    funprespValidationError, funprespAdditionalValidationError, calculationError, pensionContext, selectionRequired, calculationReady
}) => {
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
    return <div className={styles.innerBox}>
        <h4 className={styles.innerBoxTitle}>Configurações tributárias</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PensionRegimeSelect className={styles.input} labelClassName={styles.label} compact
                value={state.regimePrev} onChange={handleRegimePrevChange} disabled={!pensionContext} />
            <label className={styles.label}>Dependentes (IR)
                <input type="number" min={0} step={1} className={styles.input} value={state.dependentes} onChange={e => update('dependentes', Math.floor(toPositiveNumber(e.target.value)))} />
            </label>

        </div>
        {optionalItems.some(([rule, field]) => state[field] && !config?.incidenceRules?.[rule]) && <fieldset className="mt-3 space-y-2">
            <legend className={styles.label}>Opções salvas que precisam de revisão</legend>
            <p className={PENSION_HELP_CLASS}>A configuração atual não permite estas inclusões. Desmarque-as para continuar, ou confira a configuração e a competência desta simulação.</p>
            {optionalItems.filter(([rule, field]) => state[field] && !config?.incidenceRules?.[rule]).map(([, field, label]) => <label key={field} className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} checked onChange={event => { if (!event.target.checked) update(field, false); }} />
                <span>{label} — inclusão salva</span>
            </label>)}
        </fieldset>}
        {showFunprespSection && config && <fieldset id="funpresp-settings" tabIndex={-1} className="mt-4 space-y-3 scroll-mt-24 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
            <legend className={styles.innerBoxTitle}>Funpresp-Jud</legend>
            <p className={PENSION_HELP_CLASS}>Use os dados da sua adesão ao plano. A participação na Funpresp é uma escolha separada do regime previdenciário acima.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PensionParticipationSelect className={styles.input} labelClassName={styles.label} compact
                    value={state.funprespParticipacao} onChange={handleFunprespParticipacaoChange}
                    disabled={!pensionContext}
                    allowed={pensionContext?.allowed ?? []} unavailableReasons={pensionContext?.unavailableReasons} />
                {participates && <label className={styles.label}>Alíquota {state.funprespParticipacao === 'vinculado' ? 'vinculada' : 'normal patrocinada'}
                    <select className={styles.input} value={state.funprespAliq} onChange={e => update('funprespAliq', Number(e.target.value))}>
                        {!funprespNormalOptions.includes(state.funprespAliq) && <option value={state.funprespAliq}>Selecione a alíquota</option>}
                        {funprespNormalOptions.map(rate => <option key={rate} value={rate}>{toPercentLabel(rate)}</option>)}
                    </select>
                </label>}
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Base de contribuição escolhida no plano (R$)
                    <input type="number" className={styles.input} min={0} step="0.01" aria-describedby="funpresp-urp-reference" aria-invalid={Boolean(linkedError && !linkedFeedback?.configuration)} value={state.funprespBaseIntegral ?? ''} onChange={e => update('funprespBaseIntegral', toPositiveNumber(e.target.value))} />
                    <span className={PENSION_HELP_CLASS}>É o valor sobre o qual a alíquota será aplicada. Não informe aqui o desconto mensal do contracheque.</span>
                </label>}
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Mês e ano da inscrição ou alteração da base
                    <input type="month" className={styles.input} aria-describedby="funpresp-date-help" value={state.funprespVinculadaInicio ?? ''} onChange={e => update('funprespVinculadaInicio', e.target.value)} />
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
            {participates && calculationReady && state.pensionMemory && <details className="group rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none">
                    <span className="text-label font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Resumo calculado</span>
                    <span className="ml-auto text-body-xs text-neutral-600 dark:text-neutral-300">Desconto em folha: <strong className="font-mono text-error-600 dark:text-error-400">{formatCurrency(state.pensionMemory.mensal.descontoFolha)}</strong></span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
                </summary>
                <SharedPensionSummary memory={state.pensionMemory} rubricas={state.rubricasExtras} scope="monthly" embedded />
            </details>}
        </fieldset>}
        <details className="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4"
            open={optionsOpen} onToggle={event => setOptionsOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer text-body-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                Opções adicionais de previdência ({activeOptions} {activeOptions === 1 ? 'ativa' : 'ativas'})
            </summary>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} />
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
                        <input type="number" className={styles.input} min={0} max={config.facultativeRate.max === undefined ? undefined : config.facultativeRate.max * 100} step={config.facultativeRate.step === undefined ? 'any' : config.facultativeRate.step * 100} value={Number((state.funprespFacul * 100).toFixed(6))} onChange={e => update('funprespFacul', toDecimalRateFromPercentInput(e.target.value))} />
                    </label>
                    <label className={styles.label}>Aporte esporádico (R$)
                        <input type="number" className={styles.input} min={0} step="0.01" value={state.funprespFaculValor ?? 0} onChange={e => update('funprespFaculValor', toPositiveNumber(e.target.value))} />
                    </label>
                    <label className={styles.label}>Pagamento das facultativas e do aporte
                        <select className={styles.input} value={state.funprespFaculForma ?? 'folha'} onChange={e => update('funprespFaculForma', e.target.value)}>
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
    </div>;
};
