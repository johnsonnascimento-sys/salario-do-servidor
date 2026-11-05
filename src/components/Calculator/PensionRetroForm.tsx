import React from 'react';
import { CalculatorState } from '../../types';
import { PensionRetroSelection } from './PensionRetroSelection';
import type { IAgencyCalculationParams } from '../../services/agency/engine/types';
import type { PensionSelectionContexts } from '../../services/agency/engine/modules/pensionSelectionContext';
import { deriveLinkedPensionBases, getPensionRubricDistribution } from '../../services/agency/engine/modules/pensionPending';
import { PensionRetroEntry } from '../../types/pension';
import { toPositiveNumber, toDecimalRateFromPercentInput } from './dynamicPayrollForm.helpers';
import { formatCurrency } from '../../utils/calculations';

interface Props {
    state: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: Record<string, string>;
    pssTableOptions: string[];
    pensionParams?: IAgencyCalculationParams;
    pensionContexts?: PensionSelectionContexts | null;
    allowNormalization?: boolean;
    invalidateOptionConfirmation?: (rubricaIds: string[]) => void;
}

const newRetroId = () => globalThis.crypto?.randomUUID?.() ?? `retro-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const PensionRetroForm: React.FC<Props> = ({ state, update, styles, pssTableOptions, pensionParams, pensionContexts, invalidateOptionConfirmation }) => {
    const entries = state.pensionRetroEntries ?? [];
    const rubrics = state.rubricasExtras ?? [];
    const eligible = rubrics.filter(rubrica => Number(rubrica.valor) > 0 &&
        (rubrica.pssCompetenciaSeparada || (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada)));
    const distributed = getPensionRubricDistribution({ pensionRetroEntries: entries });
    const openForHistory = entries.length > 0 || rubrics.some(rubrica => rubrica.pssCompetenciaSeparada ||
        (rubrica.incideFunpresp && rubrica.funprespCompetenciaSeparada));
    const replace = (id: string, changes: Partial<PensionRetroEntry>) => {
        if (['vinculos', 'competencia', 'regraHistoricaId', 'tipo'].some(key => key in changes)) {
            const previous = entries.find(entry => entry.id === id);
            invalidateOptionConfirmation?.([...new Set([...(previous?.vinculos ?? []), ...(changes.vinculos ?? [])].map(link => link.rubricaId))]);
        }
        update('pensionRetroEntries', entries.map(entry => entry.id === id ? { ...entry, ...changes } : entry));
    };
    const currency = (entry: PensionRetroEntry, key: keyof PensionRetroEntry, label: string) => <label className={styles.label} key={key}>{label} (R$)
        <input type="number" min={0} step="0.01" className={styles.input} value={entry[key] === undefined ? '' : String(entry[key])}
            onChange={e => replace(entry.id, { [key]: e.target.value === '' ? undefined : toPositiveNumber(e.target.value) })} />
    </label>;
    const rate = (entry: PensionRetroEntry, key: 'aliquotaNormal' | 'aliquotaFacultativa', label: string) => <label className={styles.label} key={key}>{label} (%)
        <input type="number" min={0} step="any" className={styles.input} value={entry[key] === undefined ? '' : Number((entry[key]! * 100).toFixed(6))}
            onChange={e => replace(entry.id, { [key]: e.target.value === '' ? undefined : toDecimalRateFromPercentInput(e.target.value) })} />
    </label>;
    const addEntry = () => update('pensionRetroEntries', [...entries, {
        id: newRetroId(), competencia: '', modo: 'completo', tipo: 'mensal', vinculos: [],
    } satisfies PensionRetroEntry]);
    return <details id="pension-retro-form" className={styles.innerBox} open={openForHistory || undefined}>
        <summary className="cursor-pointer text-body-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Apuração previdenciária por competência</summary>
        <p className="mt-2 text-body-xs">Informe a situação de cada competência original e vincule as rubricas que compõem a apuração. Não duplique descontos já informados em ajustes salvos.</p>
        <button type="button" className="mt-3 font-semibold underline" onClick={addEntry}>Adicionar competência</button>
        {eligible.length > 0 && <div className="mt-3 text-body-xs" aria-label="Distribuição das rubricas por competência">
            <p className="font-semibold">Distribuição das rubricas</p>
            {eligible.map(rubrica => {
                const assigned = distributed[rubrica.id] ?? 0;
                const remaining = Math.round((rubrica.valor - assigned) * 100) / 100;
                return <p key={rubrica.id}>{rubrica.descricao.trim() || 'Rubrica sem descrição'}: {formatCurrency(assigned)} de {formatCurrency(rubrica.valor)} distribuídos · {remaining >= 0 ? `${formatCurrency(remaining)} restante(s)` : `${formatCurrency(-remaining)} acima do valor`}</p>;
            })}
        </div>}
        {entries.map((entry, index) => {
            const linked = entry.vinculos !== undefined;
            const selectedParticipation = linked ? entry.participacao : (entry.participacao ?? state.funprespParticipacao);
            const allRules = pensionParams?.agencyConfig?.previdenciaComplementar?.historicalRules ?? [];
            const rules = allRules.filter(rule => Boolean(entry.competencia) && rule.validFrom <= entry.competencia && (!rule.validTo || entry.competencia < rule.validTo));
            const selectedRule = allRules.find(rule => rule.id === entry.regraHistoricaId);
            let bases: ReturnType<typeof deriveLinkedPensionBases> | undefined;
            if (linked) {
                try { bases = deriveLinkedPensionBases({ rubricasExtras: rubrics }, entry); } catch { /* Incomplete inputs stay editable. */ }
            }
            const updateLink = (linkIndex: number, patch: Partial<{ rubricaId: string; valor: number }>) => {
                replace(entry.id, { vinculos: (entry.vinculos ?? []).map((link, i) => i === linkIndex ? { ...link, ...patch } : link) });
            };
            return <fieldset key={entry.id} className="mt-4 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
                <legend className="font-semibold">{linked ? 'Competência' : 'Ajuste salvo'} {index + 1}</legend>
                {!linked && <p className="text-body-xs">Ajuste salvo anteriormente. Revise os dados e evite lançá-lo novamente.</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className={styles.label}>Competência original
                        <input type="month" className={styles.input} value={entry.competencia} onChange={e => replace(entry.id, { competencia: e.target.value })} />
                    </label>
                    {!linked && <label className={styles.label}>Apuração
                        <select className={styles.input} value={entry.modo ?? 'completo'} onChange={e => replace(entry.id, { modo: e.target.value as PensionRetroEntry['modo'] })}>
                            <option value="completo">Recalcular por competência</option><option value="manual">Ajuste informado</option>
                        </select>
                    </label>}
                    <label className={styles.label}>Folha de origem
                        <select className={styles.input} value={entry.tipo ?? 'mensal'} onChange={e => replace(entry.id, { tipo: e.target.value as PensionRetroEntry['tipo'] })}>
                            <option value="mensal">Mensal</option><option value="13">13º salário</option>
                        </select>
                    </label>
                    <label className={styles.label}>Deduzir previdência na apuração de IR
                        <select required className={styles.input} value={entry.destinoIR ?? (linked ? '' : entry.tipo === '13' ? '13' : 'ea')} onChange={e => replace(entry.id, { destinoIR: (e.target.value || undefined) as PensionRetroEntry['destinoIR'] })}>
                            {linked && <option value="">Selecione o destino</option>}
                            <option value="mensal">Folha mensal</option><option value="ea">Exercícios anteriores (EA)</option><option value="13">13º salário</option>
                        </select>
                    </label>
                </div>
                {!linked && entry.modo === 'manual' ? <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{currency(entry, 'ajusteRpps', 'Desconto RPPS')}{currency(entry, 'ajusteComplementar', 'Desconto Funpresp')}</div>
                    <label className={styles.label}>Justificativa ou referência da memória de cálculo
                        <textarea className={styles.input} value={entry.justificativa ?? ''} onChange={e => replace(entry.id, { justificativa: e.target.value })} />
                    </label>
                </> : <>
                    {linked && <section className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-body-xs">
                        <p className="font-semibold">Rubricas vinculadas</p>
                        {(entry.vinculos ?? []).map((link, linkIndex) => <div key={linkIndex} className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className={styles.label}>Rubrica {linkIndex + 1}
                                <select aria-label={`Rubrica ${linkIndex + 1} da competência ${index + 1}`} className={styles.input} value={link.rubricaId}
                                    onChange={e => updateLink(linkIndex, { rubricaId: e.target.value })}>
                                    <option value="">Selecione a rubrica</option>
                                    {link.rubricaId && !eligible.some(r => r.id === link.rubricaId) && <option value={link.rubricaId}>Rubrica indisponível — revise o vínculo</option>}
                                    {eligible.map(r => <option key={r.id} value={r.id} disabled={(entry.vinculos ?? []).some((other, otherIndex) => otherIndex !== linkIndex && other.rubricaId === r.id)}>{r.descricao.trim() || 'Rubrica sem descrição'}</option>)}
                                </select>
                            </label>
                            <label className={styles.label}>Valor na competência (R$)
                                <input aria-label={`Valor do vínculo ${linkIndex + 1} da competência ${index + 1}`} type="number" min={0} step="0.01" className={styles.input} value={link.valor || ''}
                                    onChange={e => updateLink(linkIndex, { valor: toPositiveNumber(e.target.value) })} />
                            </label>
                            <button type="button" className="self-end text-error-600 underline" onClick={() => replace(entry.id, { vinculos: (entry.vinculos ?? []).filter((_, i) => i !== linkIndex) })}>Remover vínculo {linkIndex + 1}</button>
                        </div>)}
                        <button type="button" className="mt-2 font-semibold underline" onClick={() => replace(entry.id, { vinculos: [...(entry.vinculos ?? []), { rubricaId: '', valor: 0 }] })}>Vincular rubrica</button>
                        {eligible.length === 0 && <p className="mt-1">Marque uma rubrica para apuração previdenciária por competência original.</p>}
                    </section>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {linked && <label className={styles.label}>Regra histórica da Funpresp
                            <select aria-label="Regra histórica da Funpresp" className={styles.input} value={entry.regraHistoricaId ?? ''} onChange={e => {
                                const rule = allRules.find(item => item.id === e.target.value);
                                replace(entry.id, { regraHistoricaId: rule?.id, tabelaPSS: rule?.tabelaPSS });
                            }}>
                                <option value="">Selecione a regra da competência</option>
                                {entry.regraHistoricaId && !rules.some(rule => rule.id === entry.regraHistoricaId) && <option value={entry.regraHistoricaId}>Regra salva indisponível para esta competência</option>}
                                {rules.map(rule => <option key={rule.id} value={rule.id}>{rule.id} — {rule.validFrom}{rule.validTo ? ` a antes de ${rule.validTo}` : ''}</option>)}
                            </select>
                        </label>}
                        <label className={styles.label}>Tabela PSS original
                            <select className={styles.input} value={entry.tabelaPSS ?? ''} onChange={e => replace(entry.id, { tabelaPSS: e.target.value || undefined })}>
                                <option value="">Selecione a tabela vigente</option>{pssTableOptions.map(key => <option key={key} value={key}>{key}</option>)}
                            </select>
                        </label>
                        <PensionRetroSelection entry={entry} params={pensionParams} styles={styles}
                            fallbackRegime={state.regimePrev} fallbackParticipation={state.funprespParticipacao}
                            context={pensionContexts?.retro[entry.id]?.context ?? null} error={pensionContexts?.retro[entry.id]?.error}
                            onApply={patch => replace(entry.id, patch)} />
                        {currency(entry, 'baseRppsOriginal', 'Base RPPS já paga')}
                        {linked ? <label className={styles.label}>Base RPPS corrigida total (R$)
                            <input aria-label="Base RPPS corrigida total" type="text" readOnly className={styles.input} value={bases ? formatCurrency(bases.baseRppsDevida) : '—'} />
                        </label> : currency(entry, 'baseRppsDevida', 'Base RPPS corrigida total')}
                        {currency(entry, 'contribuicaoRppsRecolhida', 'RPPS já recolhido')}
                        {currency(entry, 'baseComplementarOriginal', 'Remuneração integral elegível Funpresp já paga')}
                        {linked ? <label className={styles.label}>Remuneração integral elegível Funpresp corrigida total (R$)
                            <input aria-label="Remuneração integral elegível Funpresp corrigida total" type="text" readOnly className={styles.input} value={bases ? formatCurrency(bases.baseComplementarDevida) : '—'} />
                        </label> : currency(entry, 'baseComplementarDevida', 'Remuneração integral elegível Funpresp corrigida total')}
                        {currency(entry, 'contribuicaoComplementarRecolhida', 'Funpresp já recolhida')}
                        {selectedParticipation === 'vinculado' && <>
                            {currency(entry, 'salarioParticipacaoVinculado', 'Salário de participação escolhido na competência')}
                            <label className={styles.label}>Inscrição ou eleição da base vinculada original
                                <input type="month" className={styles.input} value={entry.inicioVinculado ?? ''} onChange={e => replace(entry.id, { inicioVinculado: e.target.value })} />
                            </label>
                        </>}
                        {(!linked || selectedParticipation === 'patrocinado' || selectedParticipation === 'vinculado') && <>
                            {rate(entry, 'aliquotaNormal', 'Alíquota normal original')}
                            {rate(entry, 'aliquotaFacultativa', 'Alíquota facultativa original')}
                        </>}
                    </div>
                    {linked && !rules.length && <p role="status" className="text-body-xs">Não há regra histórica cadastrada para esta competência. Você pode preencher os dados; a apuração permanece pendente até existir uma regra válida.</p>}
                    {linked && selectedRule && <p className="text-body-xs">Fonte da regra histórica: {selectedRule.source}</p>}
                    {selectedParticipation === 'vinculado' && <p className="text-body-xs">Informe o salário de participação escolhido na competência; ele será conferido com os limites históricos.</p>}
                </>}
                <button type="button" className="text-error-600 underline" onClick={() => {
                    invalidateOptionConfirmation?.((entry.vinculos ?? []).map(link => link.rubricaId));
                    update('pensionRetroEntries', entries.filter(item => item.id !== entry.id));
                }}>Remover {linked ? 'competência' : 'ajuste salvo'} {index + 1}</button>
            </fieldset>;
        })}
    </details>;
};
