import React from 'react';
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
}

export const DynamicPayrollTaxSection: React.FC<DynamicPayrollTaxSectionProps> = ({
    styles, state, update, handleRegimePrevChange, showFunprespSection,
    previdenciaComplementar: config, funprespNormalOptions, handleFunprespParticipacaoChange, funprespValidationError
}) => {
    const participates = state.funprespParticipacao !== 'nao';
    const optionalItems = [
        ['fc', 'funprespIncluirFC', 'FC/CJ'], ['gas', 'funprespIncluirGAS', 'GAS'],
        ['gae', 'funprespIncluirGAE', 'GAE'], ['aqTreino', 'funprespIncluirAQTreino', 'AQ de treinamento']
    ] as const;
    return <div className={styles.innerBox}>
        <h4 className={styles.innerBoxTitle}>Configurações tributárias</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className={styles.label}>Regime previdenciário
                <select className={styles.input} value={state.regimePrev} onChange={e => handleRegimePrevChange(e.target.value)}>
                    <option value="antigo">RPPS - sem teto</option>
                    <option value="novo_antigo">RPPS - novo sem migração (sem teto)</option>
                    <option value="migrado">RPPS migrado (com teto)</option>
                    <option value="rpc">RPC (RPPS com teto)</option>
                </select>
            </label>
            <label className={styles.label}>Dependentes (IR)
                <input type="number" min={0} step={1} className={styles.input} value={state.dependentes} onChange={e => update('dependentes', Math.floor(toPositiveNumber(e.target.value)))} />
            </label>
            <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} checked={state.pssSobreFC} onChange={e => update('pssSobreFC', e.target.checked)} />
                <span>PSS sobre FC/CJ (RPPS)</span>
            </label>
        </div>
        <p className="mt-2 text-body-xs text-neutral-600 dark:text-neutral-300">O teto do RPPS depende do seu enquadramento. A adesão à Funpresp é informada separadamente; mudar este campo não altera sua adesão.</p>
        {showFunprespSection && config && <fieldset className="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
            <legend className="text-label font-bold">Previdência complementar (Funpresp)</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className={styles.label}>Participação no plano
                    <select className={styles.input} value={state.funprespParticipacao} onChange={e => handleFunprespParticipacaoChange(e.target.value as PensionParticipation)}>
                        <option value="nao">Não participa</option>
                        <option value="patrocinado">Patrocinada</option>
                        <option value="vinculado">Vinculada (sem patrocínio)</option>
                    </select>
                </label>
                <label className={styles.label}>Alíquota {state.funprespParticipacao === 'vinculado' ? 'vinculada' : 'normal patrocinada'}
                    <select className={styles.input} value={state.funprespAliq} onChange={e => update('funprespAliq', Number(e.target.value))} disabled={!participates}>
                        {!funprespNormalOptions.includes(state.funprespAliq) && <option value={state.funprespAliq}>Selecione a alíquota</option>}
                        {funprespNormalOptions.map(rate => <option key={rate} value={rate}>{toPercentLabel(rate)}</option>)}
                    </select>
                </label>
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Remuneração de participação escolhida (R$)
                    <input type="number" className={styles.input} min={0} step="0.01" value={state.funprespBaseIntegral ?? ''} onChange={e => update('funprespBaseIntegral', toPositiveNumber(e.target.value))} />
                </label>}
                {state.funprespParticipacao === 'vinculado' && <label className={styles.label}>Competência de inscrição ou eleição da base
                    <input type="month" className={styles.input} value={state.funprespVinculadaInicio ?? ''} onChange={e => update('funprespVinculadaInicio', e.target.value)} />
                </label>}
            </div>
            {participates && <>
                {state.funprespRevisarOpcoes && <div role="alert" className="rounded-lg border border-amber-400 p-3 text-body-xs">
                    <p>Esta simulação foi salva com a base antiga da Funpresp. Confira as opções de inclusão antes de recalcular.</p>
                    <button type="button" className="mt-2 font-semibold underline" onClick={() => update('funprespRevisarOpcoes', false)}>Confirmar opções da Funpresp</button>
                </div>}
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Informe a modalidade e as opções do seu cadastro no plano. A patrocinada usa o excedente da base própria sobre o teto. A vinculada usa a remuneração de participação escolhida, sujeita aos limites e à URP da competência, sem alterar seu regime no RPPS.</p>
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
                <p className="text-body-xs text-neutral-600 dark:text-neutral-300">Contribuições facultativas não recebem contrapartida patronal. Pagamentos externos aparecem na memória e não reduzem o líquido da folha; a dedução anual será informada separadamente.</p>
            </>}
            {funprespValidationError && <p role="alert" className="text-body-xs text-error-600 dark:text-error-400">{funprespValidationError}</p>}
        </fieldset>}
    </div>;
};
