import React, { useEffect, useState } from 'react';
import { PensionRegimeSelect } from './PensionRegimeSelect';
import type { PensionContext } from '../../services/agency/engine/modules/pensionContext';
import { PensionParticipationSelect } from './PensionParticipationSelect';
import { PENSION_GUIDANCE, PENSION_HELP_CLASS } from './pensionHelp';
import { CalculatorState, CourtConfig } from '../../types';
import { PensionParticipation } from '../../types/pension';
import { toDecimalRateFromPercentInput, toPercentLabel, toPositiveNumber } from './dynamicPayrollForm.helpers';

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
    onResolveParticipation?: () => void;
}

export const DynamicPayrollTaxSection: React.FC<DynamicPayrollTaxSectionProps> = ({
    styles, state, update, handleRegimePrevChange, showFunprespSection,
    previdenciaComplementar: config, funprespNormalOptions, handleFunprespParticipacaoChange,
    funprespValidationError, funprespAdditionalValidationError, calculationError, pensionContext, selectionRequired, onResolveParticipation
}) => {
    const participates = state.funprespParticipacao !== 'nao';
    const optionalItems = [
        ['fc', 'funprespIncluirFC', 'FC/CJ'], ['gas', 'funprespIncluirGAS', 'GAS'],
        ['gae', 'funprespIncluirGAE', 'GAE'], ['aqTreino', 'funprespIncluirAQTreino', 'AQ de treinamento']
    ] as const;
    const pensionEngineError = /previdência/i.test(calculationError ?? '') ? calculationError : null;
    const pendingOptions = Boolean(pensionEngineError || (participates && (state.funprespRevisarOpcoes || funprespAdditionalValidationError)));
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
            <PensionRegimeSelect className={styles.input} labelClassName={styles.label}
                value={state.regimePrev} onChange={handleRegimePrevChange} disabled={!pensionContext} />
            <label className={styles.label}>Dependentes (IR)
                <input type="number" min={0} step={1} className={styles.input} value={state.dependentes} onChange={e => update('dependentes', Math.floor(toPositiveNumber(e.target.value)))} />
            </label>

        </div>
        <p className={PENSION_HELP_CLASS}>{PENSION_GUIDANCE}</p>
        {selectionRequired && !showFunprespSection && <p role="status" className={PENSION_HELP_CLASS}>
            A configuração atual não habilita a participação complementar.{' '}
            <button type="button" onClick={onResolveParticipation} className="font-semibold underline">Revisar participação salva</button>
        </p>}
        {optionalItems.some(([rule, field]) => state[field] && !config?.incidenceRules?.[rule]) && <fieldset className="mt-3 space-y-2">
            <legend className={styles.label}>Opções salvas que precisam de revisão</legend>
            <p className={PENSION_HELP_CLASS}>A configuração atual não permite estas inclusões. Desmarque-as para continuar, ou confira a configuração e a competência desta simulação.</p>
            {optionalItems.filter(([rule, field]) => state[field] && !config?.incidenceRules?.[rule]).map(([, field, label]) => <label key={field} className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} checked onChange={event => { if (!event.target.checked) update(field, false); }} />
                <span>{label} — inclusão salva</span>
            </label>)}
        </fieldset>}
        {showFunprespSection && config && <fieldset className="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
            <legend className={styles.innerBoxTitle}>Funpresp-Jud</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PensionParticipationSelect className={styles.input} labelClassName={styles.label}
                    value={state.funprespParticipacao} onChange={handleFunprespParticipacaoChange}
                    disabled={!pensionContext}
                    allowed={pensionContext?.allowed ?? []} unavailableReasons={pensionContext?.unavailableReasons} />
                {participates && <label className={styles.label}>Alíquota {state.funprespParticipacao === 'vinculado' ? 'vinculada' : 'normal patrocinada'}
                    <select className={styles.input} value={state.funprespAliq} onChange={e => update('funprespAliq', Number(e.target.value))}>
                        {!funprespNormalOptions.includes(state.funprespAliq) && <option value={state.funprespAliq}>Selecione a alíquota</option>}
                        {funprespNormalOptions.map(rate => <option key={rate} value={rate}>{toPercentLabel(rate)}</option>)}
                    </select>
                </label>}
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Remuneração de participação escolhida (R$)
                    <input type="number" className={styles.input} min={0} step="0.01" value={state.funprespBaseIntegral ?? ''} onChange={e => update('funprespBaseIntegral', toPositiveNumber(e.target.value))} />
                </label>}
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Competência de inscrição ou eleição da base
                    <input type="month" className={styles.input} value={state.funprespVinculadaInicio ?? ''} onChange={e => update('funprespVinculadaInicio', e.target.value)} />
                </label>}
            </div>
            {!pensionContext && <p role="status" className={PENSION_HELP_CLASS}>Aguarde a base previdenciária ou confira os dados salariais para escolher sua participação.</p>}
            {selectionRequired && <div role="status" className={PENSION_HELP_CLASS}>
                <p>Escolha uma participação compatível para continuar esta simulação.</p>
                <button type="button" onClick={onResolveParticipation} className="mt-2 font-semibold underline">Escolher participação</button>
            </div>}
            {!selectionRequired && funprespValidationError && <p role="alert" className="text-body-xs text-error-600 dark:text-error-400">{funprespValidationError}</p>}
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
