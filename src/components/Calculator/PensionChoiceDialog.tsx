import React, { useEffect, useId, useRef, useState } from 'react';
import type { IAgencyCalculationParams } from '../../services/agency/engine/types';
import type { PensionContext } from '../../services/agency/engine/modules/pensionContext';
import type { PensionParticipation } from '../../types/pension';
import { buildRateOptions, toPercentLabel } from './dynamicPayrollForm.helpers';
import { validatePensionSelection, type PensionSelectionPatch } from './hooks/usePensionSelection';
import { PENSION_HELP_CLASS } from './pensionHelp';

export interface PensionChoiceDialogProps {
    params: IAgencyCalculationParams;
    context: PensionContext;
    tipo: 'mensal' | '13';
    isRegimeChange: boolean;
    onCancel: () => void;
    onConfirm: (patch: PensionSelectionPatch) => void;
}

export const PensionChoiceDialog: React.FC<PensionChoiceDialogProps> = ({ params, context, tipo, isRegimeChange, onCancel, onConfirm }) => {
    const id = useId();
    const dialog = useRef<HTMLDialogElement>(null);
    const [choice, setChoice] = useState<PensionParticipation | ''>('');
    const [rate, setRate] = useState(params.funprespAliq);
    const [salary, setSalary] = useState(params.funprespBaseIntegral === undefined ? '' : String(params.funprespBaseIntegral));
    const [start, setStart] = useState(params.funprespVinculadaInicio ?? '');
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const element = dialog.current;
        const previousFocus = document.activeElement as HTMLElement | null;
        const selectionField = previousFocus?.closest<HTMLElement>('[data-pension-selection-field]');
        element?.showModal?.();
        return () => {
            element?.close?.();
            if (previousFocus?.isConnected && !(previousFocus as HTMLInputElement).disabled) previousFocus.focus?.();
            else if (selectionField?.isConnected) selectionField.focus();
        };
    }, []);
    const rule = choice === 'vinculado' ? params.agencyConfig?.previdenciaComplementar?.linkedRate : params.agencyConfig?.previdenciaComplementar?.sponsoredRate;
    const rates = rule ? buildRateOptions(rule.min, rule.max, rule.step) : [];
    const patch: PensionSelectionPatch = choice === 'nao' ? { funprespParticipacao: 'nao' } : {
        funprespParticipacao: choice || undefined, funprespAliq: rate,
        ...(choice === 'vinculado' ? { funprespBaseIntegral: salary === '' ? undefined : Number(salary), funprespVinculadaInicio: start } : {}),
    };
    const error = choice && choice !== 'nao' && !rates.includes(rate)
        ? 'Selecione uma alíquota disponível para esta participação.'
        : choice ? validatePensionSelection(params, context, patch, tipo) : null;
    const inputClass = 'w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 p-3 font-normal normal-case tracking-normal';
    const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return <dialog ref={dialog} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
        onCancel={event => { event.preventDefault(); onCancel(); }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 text-body text-neutral-800 shadow-xl backdrop:bg-black/50 dark:bg-neutral-800 dark:text-neutral-100">
        <form onSubmit={event => { event.preventDefault(); if (choice && !error) onConfirm(patch); }} className="space-y-4">
            <h2 id={`${id}-title`} className="text-lg font-semibold">Escolha sua participação na Funpresp</h2>
            <p id={`${id}-description`}>Para este enquadramento, escolha uma das opções disponíveis. A escolha altera somente esta simulação.</p>
            <p className={PENSION_HELP_CLASS}>Base contributiva calculada: {money(context.base)}. Teto da competência: {money(context.teto)}. A base escolhida para contribuição vinculada não determina a modalidade disponível.</p>
            <fieldset className="space-y-3">
                <legend className="mb-2 font-semibold">Como deseja simular?</legend>
                {context.allowed.filter(value => value !== 'nao').concat('nao').map(value => <label key={value} className="flex items-start gap-2">
                    <input type="radio" name={`${id}-choice`} value={value} checked={choice === value}
                        onChange={() => setChoice(value)} className="mt-1" />
                    <span>{value === 'nao' ? 'Não participar da Funpresp' : value === 'patrocinado' ? 'Participar como patrocinado — com contrapartida' : 'Participar como vinculado — sem contrapartida'}</span>
                </label>)}
            </fieldset>
            {choice && choice !== 'nao' && <label className="block">Alíquota da participação
                <select className={inputClass} value={rates.includes(rate) ? rate : ''} onChange={event => setRate(Number(event.target.value))} required>
                    <option value="" disabled>Selecione a alíquota</option>
                    {rates.map(value => <option key={value} value={value}>{toPercentLabel(value)}</option>)}
                </select>
            </label>}
            {choice === 'vinculado' && <>
                <label className="block">Remuneração de participação escolhida (R$)
                    <input className={inputClass} type="number" min={0} step="0.01" value={salary} onChange={event => setSalary(event.target.value)} required />
                </label>
                <label className="block">Competência de inscrição ou eleição da base
                    <input className={inputClass} type="month" value={start} max={params.competencia}
                        onInput={event => setStart(event.currentTarget.value)} onChange={event => setStart(event.target.value)} required />
                </label>
            </>}
            {error && <p role="status" className="text-body-xs text-error-700 dark:text-error-300">{error}</p>}
            <div className="flex flex-wrap justify-end gap-3">
                <button type="button" className="rounded-xl border border-neutral-300 px-4 py-2" onClick={onCancel}>{isRegimeChange ? 'Cancelar a troca' : 'Voltar ao preenchimento'}</button>
                <button type="submit" disabled={!choice || Boolean(error)} className="rounded-xl bg-secondary px-4 py-2 text-white disabled:opacity-50">Confirmar escolha</button>
            </div>
        </form>
    </dialog>;
};
