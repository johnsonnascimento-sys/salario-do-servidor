import React from 'react';
import type { DailiesInput, ResolvedDailiesConfig } from '../../services/agency/dailies/types';

export const dailiesFieldClass = 'mt-1 min-h-11 w-full min-w-0 rounded-lg border border-neutral-300 p-2 bg-white text-neutral-900 dark:bg-neutral-800 dark:text-white dark:border-neutral-600';
export function DailiesField({ label, children }: { label: string; children: React.ReactNode; key?: string }) { return <label className="block min-w-0 text-sm font-medium">{label}{children}</label>; }

export function dailiesBenefitMonths(input: DailiesInput): string[] {
  if (input.mode !== 'period' || !input.start_date || !input.end_date || input.end_date < input.start_date) return [];
  const first = input.start_date.slice(0, 7), last = input.end_date.slice(0, 7);
  if (![first, last].every(month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))) return [];
  const count = (Number(last.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(last.slice(5, 7)) - Number(first.slice(5, 7)) + 1;
  // The motor rejects trips longer than ten years; do not create unbounded form controls.
  if (count > 121) return [];
  return Array.from({ length: count }, (_, offset) => { const index = Number(first.slice(0, 4)) * 12 + Number(first.slice(5, 7)) - 1 + offset; return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`; });
}

export default function DailiesForm({ input, onChange, config, configs = [] }: { input: DailiesInput; onChange: (input: DailiesInput) => void; config?: ResolvedDailiesConfig; configs?: ResolvedDailiesConfig[] }) {
  const update = (value: Partial<DailiesInput>) => onChange({ ...input, ...value });
  const circumstances = input.circumstances || {};
  const applicable = configs.length ? configs : config ? [config] : [];
  const rules = config?.payload.rules || applicable[0]?.payload.rules;
  const allRules = applicable.map(c => c.payload.rules).filter(Boolean);
  const boardingRates = allRules.flatMap(r => r.boarding ? [r.boarding.rate] : []);
  const boardingRate = boardingRates[0];
  const boardingNeedsLegs = allRules.some(r => r.boarding?.count === 'per_leg');
  const allowedReductions = Object.assign({}, ...allRules.map(r => r.allowed_reductions || {}));
  const additionalRates = [...new Set(allRules.flatMap(r => r.additional_rates || []))];
  const categories = [...new Set(applicable.flatMap(c => Object.keys(c.payload.rates || {})))].filter(key => !boardingRates.includes(key) && !additionalRates.includes(key));
  const deductMeals = allRules.some(r => r.deduct_meals), deductTransport = allRules.some(r => r.deduct_transport);
  const months = dailiesBenefitMonths(input);
  const multipleMonths = months.length > 1;
  const benefitMonths = multipleMonths ? months : [months[0] || input.normative_date?.slice(0, 7) || input.competence];
  const chronological = [...applicable].sort((a, b) => a.date.localeCompare(b.date));
  const benefitsRequiredIn = (month: string) => {
    const relevant = chronological.filter((c, index) => c.date.slice(0, 7) <= month && (!chronological[index + 1] || chronological[index + 1].date > `${month}-01`));
    return { meals: relevant.some(c => c.payload.rules?.deduct_meals), transport: relevant.some(c => c.payload.rules?.deduct_transport) };
  };
  const updateBenefits = (month: string, next: Partial<NonNullable<DailiesInput['benefits']>>) => {
    const monthly = input.benefits_by_month?.[month];
    const current = multipleMonths ? monthly : monthly || input.benefits;
    const benefits = { currency: '', ...current, ...next };
    update(multipleMonths || monthly ? { benefits_by_month: { ...input.benefits_by_month, [month]: benefits } } : { benefits });
  };
  return <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:bg-neutral-900 dark:border-neutral-700">
    <h2 className="text-xl font-bold mb-4">Dados da viagem</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <DailiesField label="Competência"><input type="month" required className={dailiesFieldClass} value={input.competence} onChange={e => update({ competence: e.target.value })} /></DailiesField>
      <DailiesField label="Modo de cálculo"><select className={dailiesFieldClass} value={input.mode} onChange={e => update({ mode: e.target.value as DailiesInput['mode'] })}><option value="period">Período da viagem</option><option value="quantity">Quantidade manual</option></select></DailiesField>
      {input.mode === 'period' ? <>
        <DailiesField label="Data de saída"><input className={dailiesFieldClass} type="date" required value={input.start_date || ''} onChange={e => update({ start_date: e.target.value })} /></DailiesField>
        <DailiesField label="Data de retorno"><input className={dailiesFieldClass} type="date" required min={input.start_date} value={input.end_date || ''} onChange={e => update({ end_date: e.target.value })} /></DailiesField>
      </> : <>
        <DailiesField label="Quantidade de diárias"><input type="number" min="0" step="0.5" className={dailiesFieldClass} value={input.quantity ?? ''} onChange={e => update({ quantity: e.target.value === '' ? undefined : Number(e.target.value) })} /></DailiesField>
        <DailiesField label="Data de referência normativa (se necessária)"><input type="date" className={dailiesFieldClass} value={input.normative_date || ''} onChange={e => update({ normative_date: e.target.value || undefined })} /></DailiesField>
      </>}
      <DailiesField label="Enquadramento"><select className={dailiesFieldClass} value={input.category} onChange={e => update({ category: e.target.value })}><option value="">Selecione a categoria publicada</option>{categories.map(key => <option key={key} value={key}>{key.replaceAll('_', ' ')}</option>)}</select></DailiesField>
    </div>
    {rules && <fieldset className="mt-5 border-t pt-4"><legend className="font-semibold">Circunstâncias da viagem</legend><div className="flex flex-col gap-3 mt-2">
      {([['no_overnight', 'Sem pernoite'], ['supplied_lodging', 'Hospedagem fornecida'], ['supplied_meals', 'Alimentação fornecida']] as const).map(([key, label]) => <label key={key} className="flex min-h-11 gap-2 items-center"><input type="checkbox" checked={!!circumstances[key]} onChange={e => update({ circumstances: { ...circumstances, [key]: e.target.checked } })} />{label}</label>)}
      {boardingRate && <><label className="flex min-h-11 gap-2 items-center"><input type="checkbox" checked={!!circumstances.boarding} onChange={e => update({ circumstances: { ...circumstances, boarding: e.target.checked } })} />Adicional de embarque</label>{circumstances.boarding && boardingNeedsLegs && <DailiesField label="Número de trechos"><input type="number" min="1" step="1" className={dailiesFieldClass} value={circumstances.boarding_legs ?? ''} onChange={e => update({ circumstances: { ...circumstances, boarding_legs: Number(e.target.value) } })} /></DailiesField>}</>}
      {allRules.some(r => r.supplied_transport_fraction !== undefined) && <label className="flex min-h-11 gap-2 items-center"><input type="checkbox" checked={!!circumstances.supplied_transport} onChange={e => update({ circumstances: { ...circumstances, supplied_transport: e.target.checked } })} />Transporte fornecido</label>}
      {additionalRates.map(key => <label key={key} className="flex min-h-11 gap-2 items-center"><input type="checkbox" checked={circumstances.additional_rates?.includes(key) || false} onChange={e => update({ circumstances: { ...circumstances, additional_rates: e.target.checked ? [...(circumstances.additional_rates || []), key] : circumstances.additional_rates?.filter(value => value !== key) } })} />{key.replaceAll('_', ' ')}</label>)}
      {Object.keys(allowedReductions).length > 0 && <DailiesField label="Glosa cadastrada"><select className={dailiesFieldClass} value={circumstances.reduction_id || ''} onChange={e => update({ circumstances: { ...circumstances, reduction_id: e.target.value || undefined } })}><option value="">Sem glosa adicional</option>{Object.keys(allowedReductions).map(key => <option value={key} key={key}>{key.replaceAll('_', ' ')}</option>)}</select></DailiesField>}
    </div></fieldset>}
    {(deductMeals || deductTransport) && <fieldset className="mt-5 border-t pt-4"><legend className="font-semibold">Benefícios efetivamente percebidos</legend><p className="text-sm text-neutral-500 my-2">Informe os valores mensais e a moeda em que os recebe. Use zero quando não recebe o benefício. Moedas diferentes da diária exigem regra específica; não há conversão automática.</p>
      {multipleMonths && <p className="text-sm font-medium my-3">A viagem cruza competências. Preencha cada mês separadamente; um valor único não será repetido automaticamente.</p>}
      {benefitMonths.map(month => {
        const required = benefitsRequiredIn(month);
        if (!required.meals && !required.transport) return null;
        const benefits = multipleMonths ? input.benefits_by_month?.[month] : input.benefits_by_month?.[month] || input.benefits;
        return <fieldset key={month} className="rounded-lg border p-3 mt-3"><legend className="font-semibold px-1">Benefícios — {month || 'competência a informar'}</legend><div className="grid sm:grid-cols-2 gap-4">
          <DailiesField label="Moeda dos benefícios (código ISO)"><input className={dailiesFieldClass} maxLength={3} placeholder={config?.payload.rates?.[input.category]?.currency || 'Código da moeda'} value={benefits?.currency || ''} onChange={e => updateBenefits(month, { currency: e.target.value.toUpperCase() })} /></DailiesField>
          {([['meals_monthly', 'Auxílio-alimentação', required.meals], ['transport_monthly', 'Auxílio-transporte', required.transport]] as const).filter(([, , enabled]) => enabled).map(([key, label]) => <DailiesField key={key} label={label}><input className={dailiesFieldClass} type="number" min="0" step="0.01" value={benefits?.[key] ?? ''} onChange={e => updateBenefits(month, { [key]: e.target.value === '' ? undefined : Number(e.target.value) })} /></DailiesField>)}
        </div></fieldset>;
      })}
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
      {input.mode === 'quantity' && <>
        {deductMeals && <DailiesField label="Dias para desconto de alimentação"><input type="number" min="0" step="any" className={dailiesFieldClass} value={input.food_deduction_days_quantity ?? input.deduction_days_quantity ?? ''} onChange={e => update({ food_deduction_days_quantity: e.target.value === '' ? undefined : Number(e.target.value) })} /></DailiesField>}
        {deductTransport && <DailiesField label="Dias para desconto de transporte"><input type="number" min="0" step="any" className={dailiesFieldClass} value={input.transport_deduction_days_quantity ?? input.deduction_days_quantity ?? ''} onChange={e => update({ transport_deduction_days_quantity: e.target.value === '' ? undefined : Number(e.target.value) })} /></DailiesField>}
      </>}
    </div></fieldset>}
  </section>;
}
