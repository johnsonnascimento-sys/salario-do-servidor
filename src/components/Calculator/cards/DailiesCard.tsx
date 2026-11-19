import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CalculatorState, CourtConfig } from '../../../types';
import { formatCurrency } from '../../../utils/calculations';
import { resolveDailiesDailyRate } from '../../../utils/dailiesRules';
import { formatTravelDate, getDailiesPresentation, transportLegs } from '../dailiesPresentation';
import { useDailiesPreview } from '../hooks/useDailiesPreview';

interface DailiesCardProps {
    state: CalculatorState;
    inputState?: CalculatorState;
    update: (field: keyof CalculatorState, value: any) => void;
    styles: any;
    courtConfig?: CourtConfig | null;
    competenciaReferencia: string;
    calculationReady?: boolean;
    onEditingChange?: (editing: boolean) => void;
}
const editableFields = [
    'diariasModoDesconto', 'diariasQtd', 'diariasDataInicio', 'diariasDataFim', 'diariasFeriados',
    'diariasEmbarque', 'diariasTrechosTransporte', 'diariasDescontarAlimentacao', 'diariasDescontarTransporte',
    'diariasDiasDescontoAlimentacao', 'diariasDiasDescontoTransporte', 'diariasExtHospedagem',
    'diariasExtAlimentacao', 'diariasExtTransporte', 'diariasAssessoramentoMagistrado',
    'diariasAcompanhamentoIntegral', 'diariasAutoridadeAssistida', 'diariasEquipeTrabalho', 'diariasEquipeTrabalhoMaiorCargo'
] as const satisfies readonly (keyof CalculatorState)[];
type Draft = Pick<CalculatorState, typeof editableFields[number]>;
const pickInputs = (state: CalculatorState): Draft => Object.fromEntries(editableFields.map(field => [field, state[field]])) as Draft;
const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-body font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary-700 dark:border-neutral-600';
const sectionClass = 'space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700';
const hintClass = 'text-body-xs text-neutral-500 dark:text-neutral-400';
const nonNegative = (value: string) => Math.max(0, Number(value) || 0);

const Totals: React.FC<{ bruto: number; discounts: number; net: number; label?: string }> = ({ bruto, discounts, net, label }) => <dl aria-label={label || 'Totais de diárias'} className="divide-y divide-neutral-200 dark:divide-neutral-700">
    {[{ label: 'Diárias brutas', value: bruto }, { label: 'Descontos e abatimentos', value: discounts, discount: true }, { label: 'Total diárias líquidas', value: net }].map(row =>
        <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className={row.label.includes('líquidas') ? 'text-body font-semibold' : 'text-body-xs'}>{row.label}</dt>
            <dd className={`font-mono font-semibold ${row.discount ? 'text-error-600 dark:text-error-400' : ''}`}>{formatCurrency(row.value)}</dd>
        </div>)}
</dl>;

export const DailiesCard: React.FC<DailiesCardProps> = ({ state: savedState, inputState, update: saveField, styles, courtConfig, calculationReady = false, onEditingChange }) => {
    const id = React.useId();
    const inputs = inputState ?? savedState;
    const [draft, setDraft] = useState<Draft | null>(null);
    const initial = useRef<Draft | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const wasEditing = useRef(false);
    const state = useMemo(() => draft ? { ...inputs, ...draft } : inputs, [inputs, draft]);
    const info = getDailiesPresentation(state, courtConfig);
    const { isJmu, isMagistrate, period, label: additionalLabel } = info;
    const isPeriod = state.diariasModoDesconto === 'periodo';
    const validPeriod = !isPeriod || Boolean(period);
    const preview = useDailiesPreview(state, courtConfig, Boolean(draft) && validPeriod);
    useLayoutEffect(() => {
        if (Boolean(draft) !== wasEditing.current) {
            const target = draft ? headingRef.current : buttonRef.current;
            target?.focus({ preventScroll: true });
            target?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            wasEditing.current = Boolean(draft);
        }
    }, [Boolean(draft)]);
    const update = (field: keyof CalculatorState, value: any) => {
        if (draft) setDraft(current => current ? { ...current, [field]: value } : current);
        else saveField(field, value);
    };
    const openEditor = () => {
        initial.current = pickInputs(inputs);
        setDraft(pickInputs(inputs));
        onEditingChange?.(true);
    };
    const closeEditor = (apply: boolean) => {
        if (apply && draft && initial.current) editableFields.forEach(field => {
            if (JSON.stringify(draft[field]) !== JSON.stringify(initial.current![field])) saveField(field, draft[field]);
        });
        setDraft(null);
        initial.current = null;
        onEditingChange?.(false);
    };
    const changeMode = (mode: 'periodo' | 'manual') => {
        update('diariasModoDesconto', mode);
        if (mode === 'periodo') {
            update('diariasDiasDescontoAlimentacao', 0);
            update('diariasDiasDescontoTransporte', 0);
        } else {
            update('diariasDataInicio', ''); update('diariasDataFim', ''); update('diariasFeriados', []);
        }
    };
    const changeDate = (start: boolean, value: string) => {
        const nextStart = start ? value : state.diariasDataInicio;
        const nextEnd = (start ? state.diariasDataFim : value);
        const end = nextEnd && nextStart && nextEnd < nextStart ? nextStart : nextEnd;
        update(start ? 'diariasDataInicio' : 'diariasDataFim', start ? nextStart : end);
        if (start && end !== state.diariasDataFim) update('diariasDataFim', end);
        const holidays = (state.diariasFeriados || []).filter(date => (!nextStart || date >= nextStart) && (!end || date <= end));
        if (holidays.length !== (state.diariasFeriados || []).length) update('diariasFeriados', holidays);
    };
    const check = (field: keyof CalculatorState, text: string, onChange?: (checked: boolean) => void) => <label className={styles.checkboxLabel}>
        <input type="checkbox" className={styles.checkbox} checked={Boolean(state[field])} onChange={e => onChange ? onChange(e.target.checked) : update(field, e.target.checked)} />
        <span>{text}</span>
    </label>;
    const numberField = (field: 'diariasQtd' | 'diariasDiasDescontoAlimentacao' | 'diariasDiasDescontoTransporte', text: string) => <div>
        <label htmlFor={`${id}-${field}`} className={styles.label}>{text}</label>
        <input id={`${id}-${field}`} type="number" min="0" step="0.5" className={styles.input} value={state[field] || ''} onChange={e => update(field, nonNegative(e.target.value))} placeholder="0" data-calculator="true" />
    </div>;
    const travelFields = <div className="space-y-3">
        <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">Modo de lançamento da viagem</legend>
            {(['periodo', 'manual'] as const).map(mode => <label key={mode} className={styles.checkboxLabel}>
                <input type="radio" name={`${id}-mode`} checked={state.diariasModoDesconto === mode} onChange={() => changeMode(mode)} />
                {mode === 'periodo' ? 'Lançar por datas' : 'Lançar por quantidade de diárias'}
            </label>)}
        </fieldset>
        {isPeriod ? <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={`${id}-start`} className={styles.label}>Data de início</label><input id={`${id}-start`} type="date" className={styles.input} value={state.diariasDataInicio} max={state.diariasDataFim || undefined} onChange={e => changeDate(true, e.target.value)} /></div>
            <div><label htmlFor={`${id}-end`} className={styles.label}>Data de fim</label><input id={`${id}-end`} type="date" className={styles.input} value={state.diariasDataFim} min={state.diariasDataInicio || undefined} onChange={e => changeDate(false, e.target.value)} /></div>
        </div> : numberField('diariasQtd', 'Quantidade de diárias')}
        {isPeriod && <p className={hintClass}>{period ? `${period.totalDays.toLocaleString('pt-BR')} dias no calendário · ${period.payableDays.toLocaleString('pt-BR')} diárias pagas${period.halfDailyApplied ? ' · meia diária no retorno' : ''}.` : 'Preencha início e fim para calcular a viagem.'}</p>}
    </div>;
    const selectedLegs = Array.isArray(state.diariasTrechosTransporte) ? state.diariasTrechosTransporte
        : state.diariasEmbarque === 'completo' ? transportLegs.map(leg => leg.id) : state.diariasEmbarque === 'metade' ? transportLegs.slice(0, 2).map(leg => leg.id) : [];
    const selectLegs = (legs: string[]) => {
        update('diariasTrechosTransporte', legs);
        update('diariasEmbarque', legs.length === 4 ? 'completo' : legs.length ? 'metade' : 'nenhum');
    };
    const defaultTeam = /analista/i.test(state.cargo) ? 'cj' : 'analista';
    const teamOptions = [
        { id: 'cj', label: 'Cargo em Comissão (CJ)', cargo: 'Analista Judiciário', funcao: 'CJ-4' },
        { id: 'analista', label: 'Analista Judiciário', cargo: 'Analista Judiciário', funcao: '' },
        ...(/auxiliar/i.test(state.cargo) ? [{ id: 'tecnico', label: 'Técnico Judiciário', cargo: 'Técnico Judiciário', funcao: '' }] : [])
    ];
    const authorityOptions = isJmu ? [ ['ministro_stm', 'Ministro do STM'], ['juiz_federal', 'Juiz Federal da JMU / Substituto'] ]
        : [ ['desembargador_trf', 'Desembargador Federal / Membro de TRF'], ['juiz_federal', 'Juiz Federal / Substituto'], ['ministro_cjf', 'Ministro / Membro do CJF'] ];
    const conditions = [
        !isMagistrate && state.diariasEquipeTrabalho && `Equipe: ${teamOptions.find(option => option.id === state.diariasEquipeTrabalhoMaiorCargo)?.label || 'maior diária da equipe'}`,
        !isMagistrate && state.diariasAssessoramentoMagistrado && `Assessoramento: ${info.assisted?.authorityLabel || 'autoridade selecionada'}${state.diariasAcompanhamentoIntegral ? ' · acompanhamento integral' : ''}`,
        isPeriod && `Feriados/pontos facultativos: ${(state.diariasFeriados || []).length}`,
        `Descontos de auxílios: ${[state.diariasDescontarAlimentacao && 'alimentação', state.diariasDescontarTransporte && 'transporte'].filter(Boolean).join(' e ') || 'nenhum'}`,
        `Benefícios fornecidos: ${[state.diariasExtHospedagem && 'hospedagem', state.diariasExtAlimentacao && 'alimentação', state.diariasExtTransporte && 'transporte'].filter(Boolean).join(', ') || 'nenhum'}`
    ].filter(Boolean);
    return <div className="space-y-4 text-neutral-700 dark:text-neutral-200">
        {!draft ? <>
            {travelFields}
            <div className="space-y-1 text-body-xs">
                <p>{additionalLabel}: {isJmu ? ({ nenhum: 'nenhum', metade: 'ida ou volta', completo: 'ida e volta' }[state.diariasEmbarque]) : `${selectedLegs.length} de 4 trechos sem veículo oficial`}.</p>
                {conditions.map((text, index) => <p key={index} className={hintClass}>{text}</p>)}
            </div>
            {calculationReady && validPeriod ? <>
                <dl className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    <div className="flex flex-wrap justify-between gap-2 py-3 text-body-xs"><dt>Diária unitária</dt><dd className="font-mono font-semibold">{formatCurrency(info.dailyRate)}</dd></div>
                    <div className="flex flex-wrap justify-between gap-2 py-3 text-body-xs"><dt>{additionalLabel}</dt><dd className="font-mono font-semibold">{formatCurrency(info.additional)}</dd></div>
                </dl>
                <Totals bruto={savedState.diariasBruto || 0} discounts={(savedState.diariasCorteLdo || 0) + (savedState.diariasGlosa || 0) + (savedState.diariasDescAlim || 0) + (savedState.diariasDescTransp || 0)} net={savedState.diariasValorTotal || 0} />
            </> : <p role="status" className={hintClass}>Aguardando cálculo. Os totais serão exibidos após a conclusão da simulação e o preenchimento da viagem.</p>}
            <div className="flex justify-end border-t border-neutral-200 pt-4 dark:border-neutral-700"><button ref={buttonRef} type="button" className={actionClass} onClick={openEditor}><SlidersHorizontal size={16} aria-hidden="true" />Personalizar cálculo</button></div>
        </> : <section aria-labelledby={`${id}-title`} className="space-y-5">
            <h4 ref={headingRef} tabIndex={-1} id={`${id}-title`} className="text-h5 focus-visible:outline focus-visible:outline-2">Personalizar diárias de viagem</h4>
            <section className={sectionClass} aria-labelledby={`${id}-additional`}>
                <h5 id={`${id}-additional`} className="font-semibold">{additionalLabel}</h5>
                {isJmu ? <><label htmlFor={`${id}-embarkation`} className={styles.label}>Percurso coberto</label><select id={`${id}-embarkation`} className={styles.input} value={state.diariasEmbarque} onChange={e => update('diariasEmbarque', e.target.value)}>
                    <option value="nenhum">Nenhum</option><option value="metade">Ida ou volta — {formatCurrency(info.half)}</option><option value="completo">Ida e volta — {formatCurrency(info.full)}</option>
                </select></> : <>
                    <p className={hintClass}>Marque os trechos realizados sem veículo oficial. Cada trecho corresponde a uma das quatro partes do percurso integral ({formatCurrency(info.full)}).</p>
                    <div className="flex flex-wrap gap-2">{[{ text: 'Todos', legs: transportLegs }, { text: 'Apenas ida', legs: transportLegs.slice(0, 2) }, { text: 'Apenas volta', legs: transportLegs.slice(2) }, { text: 'Nenhum', legs: [] }].map(action => <button key={action.text} type="button" className={actionClass} onClick={() => selectLegs(action.legs.map(leg => leg.id))}>{action.text}</button>)}</div>
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">{transportLegs.map(leg => <label key={leg.id} className={styles.checkboxLabel}><input type="checkbox" className={styles.checkbox} checked={selectedLegs.includes(leg.id)} onChange={e => selectLegs(e.target.checked ? [...selectedLegs, leg.id] : selectedLegs.filter(item => item !== leg.id))} /><span>{leg.label}</span></label>)}</div>
                </>}
                <p className={hintClass}>{additionalLabel}: {formatCurrency(info.additional)}.</p>
            </section>
            {!isMagistrate && <section className={sectionClass} aria-labelledby={`${id}-conditions`}>
                <h5 id={`${id}-conditions`} className="font-semibold">Condições da viagem</h5>
                {check('diariasEquipeTrabalho', 'Deslocamento em equipe de trabalho', checked => {
                    update('diariasEquipeTrabalho', checked);
                    if (checked) { if (!state.diariasEquipeTrabalhoMaiorCargo) update('diariasEquipeTrabalhoMaiorCargo', defaultTeam); update('diariasAssessoramentoMagistrado', false); update('diariasAcompanhamentoIntegral', false); }
                })}
                {state.diariasEquipeTrabalho && <><label htmlFor={`${id}-team`} className={styles.label}>Maior diária entre os membros da equipe</label><select id={`${id}-team`} className={styles.input} value={state.diariasEquipeTrabalhoMaiorCargo || defaultTeam} onChange={e => update('diariasEquipeTrabalhoMaiorCargo', e.target.value)}>{teamOptions.map(option => <option key={option.id} value={option.id}>{option.label} — {formatCurrency(resolveDailiesDailyRate({ dailiesConfig: courtConfig?.dailies, cargo: option.cargo, funcao: option.funcao, hasCommissionRole: Boolean(option.funcao) }))}</option>)}</select><p className={hintClass}>Aplica-se o maior valor entre a diária do próprio servidor e a diária informada da equipe.</p></>}
                {check('diariasAssessoramentoMagistrado', 'Assessoramento direto / segurança a magistrado', checked => {
                    update('diariasAssessoramentoMagistrado', checked);
                    if (checked) update('diariasEquipeTrabalho', false); else update('diariasAcompanhamentoIntegral', false);
                })}
                {state.diariasAssessoramentoMagistrado && <>
                    <label htmlFor={`${id}-authority`} className={styles.label}>Autoridade assistida</label>
                    <select id={`${id}-authority`} className={styles.input} value={info.params.diariasAutoridadeAssistida} onChange={e => update('diariasAutoridadeAssistida', e.target.value)}>{authorityOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
                    {check('diariasAcompanhamentoIntegral', 'Acompanhamento em tempo integral e hospedagem no mesmo local')}
                    {info.assisted && <p className={hintClass}>Diária aplicada: {formatCurrency(info.assisted.serverRate)} ({(info.assisted.percentage * 100).toLocaleString('pt-BR')}% da diária da autoridade assistida).</p>}
                </>}
            </section>}
            {isPeriod && <section className={sectionClass} aria-labelledby={`${id}-holidays`}>
                <h5 id={`${id}-holidays`} className="font-semibold">Feriados e pontos facultativos</h5>
                <p className={hintClass}>Sábados e domingos já são excluídos dos descontos de auxílios. Marque os feriados e pontos facultativos locais; as diárias da viagem continuam sendo pagas.</p>
                {period ? <>
                    <div className="flex flex-wrap gap-2">{info.weekdays.map(day => <button key={day.isoDate} type="button" aria-pressed={(state.diariasFeriados || []).includes(day.isoDate)} className={`${actionClass} ${state.diariasFeriados?.includes(day.isoDate) ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900' : ''}`} onClick={() => update('diariasFeriados', state.diariasFeriados?.includes(day.isoDate) ? state.diariasFeriados.filter(date => date !== day.isoDate) : [...(state.diariasFeriados || []), day.isoDate].sort())}>{day.weekdayLabel}, {formatTravelDate(day.isoDate)}{day.isoDate === period.returnDate ? ' (retorno)' : ''}</button>)}</div>
                    {!info.weekdays.length && <p className={hintClass}>O período compreende apenas finais de semana.</p>}
                    {Boolean(state.diariasFeriados?.length) && <button type="button" className={actionClass} onClick={() => update('diariasFeriados', [])}>Limpar marcados ({state.diariasFeriados.length})</button>}
                </> : <p className={hintClass}>Preencha o período para selecionar os feriados.</p>}
            </section>}
            <section className={sectionClass} aria-labelledby={`${id}-discounts`}>
                <h5 id={`${id}-discounts`} className="font-semibold">Descontos de auxílios</h5>
                {check('diariasDescontarAlimentacao', 'Descontar auxílio-alimentação')}
                {check('diariasDescontarTransporte', 'Descontar auxílio-transporte')}
                {isPeriod ? <p className={hintClass}>{period ? `Dias usados no desconto: ${period.discountDays.toLocaleString('pt-BR')}. Dias excluídos: ${period.excludedDays.toLocaleString('pt-BR')}.` : 'Preencha o período para calcular os descontos automaticamente.'}</p> : <>
                    <p className={hintClass}>Informe os dias de desconto manualmente no lançamento por quantidade.</p>
                    <div className="grid gap-4 sm:grid-cols-2">{state.diariasDescontarAlimentacao && numberField('diariasDiasDescontoAlimentacao', 'Dias para desconto do auxílio-alimentação')}{state.diariasDescontarTransporte && numberField('diariasDiasDescontoTransporte', 'Dias para desconto do auxílio-transporte')}</div>
                </>}
            </section>
            <section className={sectionClass} aria-labelledby={`${id}-gloss`}>
                <h5 id={`${id}-gloss`} className="font-semibold">Benefícios fornecidos no deslocamento (glosa)</h5>
                <p className={hintClass}>Informe os benefícios custeados externamente para aplicar os abatimentos previstos na configuração do órgão.</p>
                {check('diariasExtHospedagem', 'Hospedagem fornecida')}{check('diariasExtAlimentacao', 'Alimentação fornecida')}{check('diariasExtTransporte', 'Transporte fornecido')}
            </section>
            <section className={sectionClass} aria-label="Prévia do rascunho">
                <h5 className="font-semibold">Prévia dos ajustes</h5>
                {!validPeriod ? <p role="status" className={hintClass}>Preencha início e fim para conferir a prévia.</p> : preview.loading ? <p role="status" className={hintClass}>Calculando prévia…</p> : preview.error ? <p role="status" className="text-body-xs text-error-600 dark:text-error-400">{preview.error}</p> : preview.result && <Totals bruto={preview.result.bruto} discounts={preview.result.corteLdo + preview.result.glosa + preview.result.deducoes} net={preview.result.valor} label="Prévia das diárias" />}
                <p className={hintClass}>Os ajustes passam a integrar a simulação ao aplicar.</p>
            </section>
            <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700"><button type="button" className={actionClass} onClick={() => closeEditor(false)}>Cancelar</button><button type="button" className={`${actionClass} bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900`} onClick={() => closeEditor(true)}>Aplicar ajustes</button></div>
        </section>}
    </div>;
};
