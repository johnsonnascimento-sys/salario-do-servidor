import React from 'react';
import { CalculatorState } from '../../types';
import { PensionRetroSelection } from './PensionRetroSelection';
import type { IAgencyCalculationParams } from '../../services/agency/engine/types';
import type { PensionSelectionContexts } from '../../services/agency/engine/modules/pensionSelectionContext';
import { PensionRetroEntry } from '../../types/pension';
import { createUniqueId, toPositiveNumber, toDecimalRateFromPercentInput } from './dynamicPayrollForm.helpers';

interface Props {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: Record<string, string>;
    pssTableOptions: string[];
    pensionParams?: IAgencyCalculationParams;
    pensionContexts?: PensionSelectionContexts | null;
    allowAutoResolve?: boolean;
}

export const PensionRetroForm: React.FC<Props> = ({ state, update, styles, pssTableOptions, pensionParams, pensionContexts, allowAutoResolve = true }) => {
    const entries = state.pensionRetroEntries ?? [];
    const firstIncompatible = entries.findIndex(entry => {
        const context = pensionContexts?.retro[entry.id]?.context;
        return entry.modo !== 'manual' && context && !context.allowed.includes(entry.participacao ?? state.funprespParticipacao);
    });
    const replace = (id: string, changes: Partial<PensionRetroEntry>) => update('pensionRetroEntries', entries.map(entry => entry.id === id ? { ...entry, ...changes } : entry));
    const currency = (entry: PensionRetroEntry, key: keyof PensionRetroEntry, label: string) => <label className={styles.label} key={key}>{label} (R$)
        <input type="number" min={0} step="0.01" className={styles.input} value={entry[key] === undefined ? '' : String(entry[key])} onChange={e => replace(entry.id, { [key]: e.target.value === '' ? undefined : toPositiveNumber(e.target.value) })} />
    </label>;
    return <details className={styles.innerBox} open={entries.length > 0}>
        <summary className="cursor-pointer text-body-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Previdência de retroativos por competência</summary>
        <p className="mt-2 text-body-xs">Cadastre cada competência original separadamente. O modo completo recalcula as diferenças com a tabela original; ajuste informado exige a memória ou justificativa do desconto. As bases são integrais, antes do teto. Sem dados completos, o motor identifica a pendência.</p>
        <p className="mt-2 text-body-xs">Os ajustes previdenciários não adicionam rendimentos. Informe os créditos retroativos nas rubricas correspondentes, evitando duplicar descontos manuais.</p>
        {entries.map((entry, index) => <fieldset key={entry.id} className="mt-4 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
            <legend className="font-semibold">Retroativo {index + 1}</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className={styles.label}>Competência original
                    <input type="month" className={styles.input} value={entry.competencia} onChange={e => replace(entry.id, { competencia: e.target.value })} />
                </label>
                <label className={styles.label}>Apuração
                    <select className={styles.input} value={entry.modo ?? 'completo'} onChange={e => replace(entry.id, { modo: e.target.value as PensionRetroEntry['modo'] })}>
                        <option value="completo">Recalcular por competência</option><option value="manual">Ajuste informado</option>
                    </select>
                </label>
                <label className={styles.label}>Folha de origem
                    <select className={styles.input} value={entry.tipo ?? 'mensal'} onChange={e => replace(entry.id, { tipo: e.target.value as PensionRetroEntry['tipo'] })}>
                        <option value="mensal">Mensal</option><option value="13">13º salário</option>
                    </select>
                </label>
                <label className={styles.label}>Deduzir previdência na apuração de IR
                    <select required className={styles.input} value={entry.destinoIR ?? (entry.tipo === '13' ? '13' : 'ea')} onChange={e => replace(entry.id, { destinoIR: e.target.value as PensionRetroEntry['destinoIR'] })}>
                        <option value="mensal">Folha mensal</option><option value="ea">Exercícios anteriores (EA)</option><option value="13">13º salário</option>
                    </select>
                </label>
            </div>
            {entry.modo === 'manual' ? <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{currency(entry, 'ajusteRpps', 'Desconto RPPS')}{currency(entry, 'ajusteComplementar', 'Desconto Funpresp')}</div>
                <label className={styles.label}>Justificativa ou referência da memória de cálculo
                    <textarea className={styles.input} value={entry.justificativa ?? ''} onChange={e => replace(entry.id, { justificativa: e.target.value })} />
                </label>
            </> : <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className={styles.label}>Tabela PSS original
                        <select className={styles.input} value={entry.tabelaPSS ?? ''} onChange={e => replace(entry.id, { tabelaPSS: e.target.value })}>
                            <option value="">Selecione a tabela vigente</option>{pssTableOptions.map(key => <option key={key} value={key}>{key}</option>)}
                        </select>
                    </label>
                    <PensionRetroSelection entry={entry} params={pensionParams} styles={styles}
                        fallbackRegime={state.regimePrev} fallbackParticipation={state.funprespParticipacao}
                        context={pensionContexts?.retro[entry.id]?.context ?? null}
                        error={pensionContexts?.retro[entry.id]?.error}
                        allowAutoResolve={allowAutoResolve && (firstIncompatible < 0 || firstIncompatible === index)}
                        onApply={patch => replace(entry.id, patch)} />
                    {currency(entry, 'baseRppsOriginal', 'Base RPPS já paga')}
                    {currency(entry, 'baseRppsDevida', 'Base RPPS corrigida total')}
                    {currency(entry, 'contribuicaoRppsRecolhida', 'RPPS já recolhido')}
                    {currency(entry, 'baseComplementarOriginal', 'Remuneração integral elegível Funpresp já paga')}
                    {currency(entry, 'baseComplementarDevida', 'Remuneração integral elegível Funpresp corrigida total')}
                    {currency(entry, 'contribuicaoComplementarRecolhida', 'Funpresp já recolhida')}
                    {(entry.participacao ?? state.funprespParticipacao) === 'vinculado' && <>
                        {currency(entry, 'salarioParticipacaoVinculado', 'Salário de participação escolhido na competência')}
                        <label className={styles.label}>Inscrição ou eleição da base vinculada original
                            <input type="month" className={styles.input} value={entry.inicioVinculado ?? ''} onChange={e => replace(entry.id, { inicioVinculado: e.target.value })} />
                        </label>
                    </>}
                    <label className={styles.label}>Alíquota normal original (%)
                        <input type="number" min={0} step="any" className={styles.input} value={entry.aliquotaNormal === undefined ? '' : Number((entry.aliquotaNormal * 100).toFixed(6))} onChange={e => replace(entry.id, { aliquotaNormal: e.target.value === '' ? undefined : toDecimalRateFromPercentInput(e.target.value) })} />
                    </label>
                    <label className={styles.label}>Alíquota facultativa original (%)
                        <input type="number" min={0} step="any" className={styles.input} value={entry.aliquotaFacultativa === undefined ? '' : Number((entry.aliquotaFacultativa * 100).toFixed(6))} onChange={e => replace(entry.id, { aliquotaFacultativa: e.target.value === '' ? undefined : toDecimalRateFromPercentInput(e.target.value) })} />
                    </label>
                </div>
                {(entry.participacao ?? state.funprespParticipacao) === 'vinculado' && <p className="text-body-xs">A remuneração integral elegível é a soma das parcelas que podem compor a base na competência, antes do teto. Informe separadamente o salário de participação escolhido no plano; ele pode ser diferente dessa remuneração e será conferido com os limites e a URP históricos.</p>}
            </>}
            <button type="button" className="text-error-600 underline" onClick={() => update('pensionRetroEntries', entries.filter(item => item.id !== entry.id))}>Remover retroativo {index + 1}</button>
        </fieldset>)}
        <button type="button" className="mt-3 font-semibold underline" onClick={() => update('pensionRetroEntries', [...entries, { id: createUniqueId('pension-retro'), competencia: '', modo: 'completo', tipo: 'mensal', destinoIR: 'ea', regimePrev: state.regimePrev, participacao: state.funprespParticipacao }])}>Adicionar competência de retroativo</button>
    </details>;
};
