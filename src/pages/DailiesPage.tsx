import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DailiesForm from '../components/Dailies/DailiesForm';
import DailiesResult from '../components/Dailies/DailiesResult';
import { useDailies } from '../hooks/useDailies';
import { useUserAuth } from '../hooks/user/useUserAuth';
import type { DailiesInput } from '../services/agency/dailies/types';
import { INITIAL_STATE, type CalculatorState } from '../types';
import { exportToPDF, exportToExcel } from '../services/exportService';
import { createPayslip } from '../services/user/payslipService';
import { dailiesResultRows } from '../utils/dailiesExport';

function DailiesSimulator({ slug }: { slug: string; key?: string }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const navigation = useNavigate();
  const location = useLocation();
  const restored = (location.state as { dailiesInput?: DailiesInput } | null)?.dailiesInput;
  const { user } = useUserAuth();
  const [input, setInput] = useState<DailiesInput>(restored?.org_slug === slug ? structuredClone(restored) : { org_slug: slug, competence: today.slice(0, 7), mode: 'period', start_date: today, end_date: today, category: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const state = useDailies(input, { org_slug: slug, power: 'PJU', branch: slug === 'jmu' ? 'JMU' : 'CJF' });
  const name = slug === 'jmu' ? 'Justiça Militar da União' : 'Justiça Federal';
  const snapshot = (currency: string): CalculatorState => {
    if (!state.result?.available || state.loading) throw new Error('Aguarde um resultado válido.');
    const totals = state.result.totals[currency];
    return { ...INITIAL_STATE, anoRef: Number(input.competence.slice(0, 4)), mesRef: new Date(`${input.competence}-01T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' }).toUpperCase(),
      dailiesOnly: true, dailiesCurrency: currency, dailiesInput: input, dailiesMemory: state.result.memory,
      diariasValorTotal: totals.net, totalBruto: totals.gross + totals.boarding + totals.additions,
      totalDescontos: totals.reductions + totals.limit_cut + totals.deductions, liquido: totals.net };
  };
  const save = async (currency: string) => {
    if (!user) { navigation(`/acesso?redirect=${encodeURIComponent(`/diarias/${slug}`)}`); return; }
    setSaving(true); setMessage('');
    try {
      const saved = snapshot(currency);
      const created = await createPayslip({ title: `Diárias ${name} - ${input.competence} (${currency})`, agency_slug: slug, agency_name: name,
        month_ref: saved.mesRef, year_ref: saved.anoRef, calculator_state: saved, result_rows: dailiesResultRows(saved.dailiesMemory!, currency),
        total_bruto: saved.totalBruto, total_descontos: saved.totalDescontos, liquido: saved.liquido, tags: ['diarias', currency] });
      navigation(`/minha-area/holerites/${created.id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };
  return <main className="max-w-5xl mx-auto px-4 py-10 text-neutral-900 dark:text-white">
    <Link to="/beta-access" className="text-secondary-700 underline">Voltar aos simuladores</Link>
    <h1 className="text-3xl font-bold mt-4">Diárias — {name}</h1>
    <p className="text-neutral-600 dark:text-neutral-400 mt-2 mb-6">Simulação independente, com as regras publicadas para o órgão e o período informado.</p>
    <div className="space-y-6"><DailiesForm input={input} onChange={next => { setInput(next); setMessage(''); }} config={state.config} configs={state.configs} />
      {state.loading && <p role="status">Carregando configuração do período…</p>}
      {state.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">{state.error}</p>}
      {state.result && <DailiesResult result={state.result} />}
      {state.result?.available && Object.keys(state.result.totals).map(currency => <div key={currency} className="flex flex-wrap gap-3">
        <button className="rounded-lg border px-4 py-2" disabled={saving} onClick={() => { const s = snapshot(currency); exportToPDF(s, dailiesResultRows(s.dailiesMemory!, currency), null, { filename: `Diarias_${slug}_${input.competence}_${currency}` }); }}>Exportar PDF ({currency})</button>
        <button className="rounded-lg border px-4 py-2" disabled={saving} onClick={() => { const s = snapshot(currency); exportToExcel(s, dailiesResultRows(s.dailiesMemory!, currency), null, { filename: `Diarias_${slug}_${input.competence}_${currency}` }); }}>Exportar Excel ({currency})</button>
        <button className="rounded-lg bg-secondary-700 text-white px-4 py-2" disabled={saving} onClick={() => void save(currency)}>Salvar simulação ({currency})</button>
      </div>)}
      {message && <p role="alert">{message}</p>}
    </div>
  </main>;
}
export default function DailiesPage() {
  const { slug = '' } = useParams();
  if (!['jmu', 'jf'].includes(slug)) return <main className="p-8"><h1 className="text-xl font-bold">Órgão sem módulo de diárias disponível</h1><Link to="/beta-access" className="underline">Voltar aos simuladores</Link></main>;
  return <DailiesSimulator key={slug} slug={slug} />;
}
