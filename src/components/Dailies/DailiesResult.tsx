import React from 'react';
import type { DailiesCalculationResult } from '../../services/agency/dailies/types';

const money = (value: number, currency: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
function memoryFields(value: unknown, prefix = ''): Array<[string, string]> {
  if (value === null || typeof value !== 'object') return [[prefix, String(value)]];
  return Object.entries(value).flatMap(([key, child]) => memoryFields(child, prefix ? `${prefix}.${key}` : key));
}

export default function DailiesResult({ result }: { result: DailiesCalculationResult }) {
  if (!result.available) return <section role="status" className="min-w-0 [overflow-wrap:anywhere] rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"><h2 className="font-bold">Simulação pendente</h2><ul className="mt-2 list-disc pl-5">{result.issues.map((issue, index) => <li key={index}>{issue.date && `${issue.date}: `}{issue.message}</li>)}</ul><p className="mt-3 text-sm">Nenhum valor é apresentado enquanto houver pendências.</p></section>;
  return <section className="min-w-0 [overflow-wrap:anywhere] rounded-xl border border-neutral-200 bg-white p-5 dark:bg-neutral-900 dark:border-neutral-700" aria-label="Resultado de diárias">
    <h2 className="text-xl font-bold mb-4">Diárias</h2>
    {Object.entries(result.totals).map(([currency, totals]) => <dl key={currency} className="space-y-2 mb-5">
      <div className="flex justify-between"><dt>Diárias brutas ({currency})</dt><dd>{money(totals.gross, currency)}</dd></div>
      <div className="flex justify-between"><dt>Adicional de embarque</dt><dd>{money(totals.boarding, currency)}</dd></div>
      <div className="flex justify-between"><dt>Outros adicionais</dt><dd>{money(totals.additions, currency)}</dd></div>
      <div className="flex justify-between text-red-700 dark:text-red-400"><dt>Descontos</dt><dd>{money(totals.deductions, currency)}</dd></div>
      <div className="flex justify-between text-sm"><dt>Alimentação / transporte</dt><dd>{money(totals.food_deduction, currency)} / {money(totals.transport_deduction, currency)}</dd></div>
      <div className="flex justify-between text-red-700 dark:text-red-400"><dt>Despesas fornecidas e glosas</dt><dd>{money(totals.reductions, currency)}</dd></div>
      <div className="flex justify-between text-red-700 dark:text-red-400"><dt>Corte por limites</dt><dd>{money(totals.limit_cut, currency)}</dd></div>
      <div className="flex justify-between border-t pt-3 font-bold text-lg"><dt>Total de diárias líquidas</dt><dd>{money(totals.net, currency)}</dd></div>
    </dl>)}
    <details className="border-t pt-3"><summary className="cursor-pointer font-semibold">Memória de cálculo e fundamentos</summary>
      <p className="text-sm my-3">Valores separados por moeda, sem conversão cambial. Cada parcela conserva a configuração utilizada.</p>
      <details className="my-3"><summary className="cursor-pointer">Entradas utilizadas, benefícios e circunstâncias</summary><dl className="text-sm mt-2">{memoryFields(result.memory.input).map(([path, value]) => <div key={path} className="flex flex-wrap gap-x-2"><dt className="font-medium">{path}:</dt><dd>{value}</dd></div>)}</dl></details>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">Parcelas de diárias</caption><thead><tr><th scope="col" className="p-2">Data / referência</th><th scope="col" className="p-2">Quantidade / fração</th><th scope="col" className="p-2">Valor unitário</th><th scope="col" className="p-2">Bruto</th><th scope="col" className="p-2">Embarque</th><th scope="col" className="p-2">Adicionais</th><th scope="col" className="p-2">Descontos</th><th scope="col" className="p-2">Líquido</th></tr></thead><tbody>{result.parcels.map((p, index) => <tr className="border-t" key={index}><td className="p-2">{p.date}<br /><small>{p.configuration_date}</small></td><td className="p-2">{p.quantity} × {p.fraction}</td>{[p.daily_rate, p.gross, p.boarding, p.additions, p.deductions, p.net].map((amount, i) => <td className="p-2 whitespace-nowrap" key={i}>{money(amount, p.currency)}</td>)}</tr>)}</tbody></table></div>
      {result.memory.versions.map(v => <div key={v.id} className="mt-4 border-t pt-3 text-sm"><p className="font-semibold">{v.scope_type}: {v.scope_key} · revisão {v.revision}</p><p>Vigência: {v.valid_from} a {v.valid_to || 'sem término'} · versão {v.id}</p>{Object.entries(v.payload.sources || {}).map(([id, source]) => <p className="mt-1" key={id}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-secondary-700 underline">{source.title}</a>{source.article && ` — ${source.article}`}{source.published_on && ` · publicação ${source.published_on}`}</p>)}</div>)}
      <details className="mt-4"><summary className="cursor-pointer">Valores resolvidos, calendário e origem de cada parâmetro</summary>{result.parcels.map((parcel, index) => <dl className="text-xs mt-2" key={index}><dt className="font-bold">{parcel.date}</dt>{memoryFields(parcel.config.payload).map(([path, value]) => { const origin = parcel.config.provenance[path.split('.').slice(0, 2).join('.')]; return <dd key={path} className="mt-1">{path}: {value}{origin && ` · ${origin.scope_type}/${origin.scope_key}, revisão ${origin.revision}, ${origin.valid_from} a ${origin.valid_to || 'sem término'}`}</dd>; })}<dd className="mt-2">Fração: {parcel.fraction}; fator de redução: {parcel.reduction_factor}; despesas/glosas: {money(parcel.reductions, parcel.currency)}; cortes por limites: {money(parcel.limit_cut, parcel.currency)}; dias de desconto alimentação/transporte: {parcel.food_deduction_days}/{parcel.transport_deduction_days}.</dd></dl>)}</details>
    </details>
  </section>;
}
