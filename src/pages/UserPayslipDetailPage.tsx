import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown, FileSpreadsheet, Save, Trash2 } from 'lucide-react';
import { getPayslipById, deletePayslip, updatePayslip } from '../services/user/payslipService';
import { UpdatePayslipDTO, UserPayslip } from '../types/user';
import { exportToExcel, exportToPDF } from '../services/exportService';
import { formatCurrency } from '../utils/calculations';

const parseTags = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function UserPayslipDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<UserPayslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [refreshSnapshot, setRefreshSnapshot] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    getPayslipById(id)
      .then((data) => {
        setItem(data);
        if (data) {
          setTitle(data.title);
          setNotes(data.notes || '');
          setTagsText((data.tags || []).join(', '));
        }
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  const filename = useMemo(() => {
    if (!item) return 'Holerite';
    const safeTitle = item.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
    return `${safeTitle || 'Holerite'}_${item.month_ref}_${item.year_ref}`;
  }, [item]);

  const onExport = (type: 'pdf' | 'excel') => {
    if (!item) return;

    if (type === 'pdf') {
      exportToPDF(item.calculator_state, item.result_rows, null, { filename });
    } else {
      exportToExcel(item.calculator_state, item.result_rows, null, { filename });
    }
  };

  const onSave = async () => {
    if (!item) return;
    setSaving(true);

    try {
      const payload: UpdatePayslipDTO = {
        title,
        notes,
        tags: parseTags(tagsText),
      };

      if (refreshSnapshot) {
        try {
          const rawState = localStorage.getItem('user_area_last_calculator_state');
          const rawRows = localStorage.getItem('user_area_last_result_rows');

          if (!rawState || !rawRows) {
            alert('Nenhuma simulação recente encontrada no navegador para atualizar o snapshot.');
            return;
          }

          const parsedState = JSON.parse(rawState);
          const parsedRows = JSON.parse(rawRows);

          payload.calculator_state = parsedState;
          payload.result_rows = parsedRows;
          payload.liquido = Number(parsedState.liquido || 0);
          payload.total_bruto = Number(parsedState.totalBruto || 0);
          payload.total_descontos = Number(parsedState.totalDescontos || 0);
        } catch (_error) {
          alert('Falha ao ler a última simulação do navegador.');
          return;
        }
      }

      const updated = await updatePayslip(item.id, payload);
      setItem(updated);
      setRefreshSnapshot(false);
      alert('Holerite atualizado com sucesso.');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!item) return;
    const ok = window.confirm('Deseja realmente excluir este holerite?');
    if (!ok) return;

    await deletePayslip(item.id);
    navigate('/minha-area/holerites');
  };

  const onReopen = () => {
    if (!item) return;
    navigate(`/simulador/${item.agency_slug}`, {
      state: {
        restoreSnapshot: {
          calculatorState: item.calculator_state,
        },
      },
    });
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-10">Carregando...</div>;
  }

  if (!item) {
    return <div className="max-w-4xl mx-auto px-4 py-10">Holerite não encontrado.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/minha-area/holerites" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <button onClick={onReopen} className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-body-xs font-semibold">
          Reabrir na calculadora
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 space-y-4">
        <h1 className="text-h3 font-bold text-neutral-900 dark:text-neutral-100">Detalhe do Holerite</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-body-xs text-neutral-500">Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2" />
          </div>
          <div>
            <label className="text-body-xs text-neutral-500">Tags (separadas por vírgula)</label>
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2" />
          </div>
          <div className="md:col-span-2">
            <label className="text-body-xs text-neutral-500">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2" />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-body-xs text-neutral-600 dark:text-neutral-300">
          <input type="checkbox" checked={refreshSnapshot} onChange={(e) => setRefreshSnapshot(e.target.checked)} />
          Atualizar snapshot com o estado atual da calculadora
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <p className="text-label uppercase tracking-widest text-neutral-500">Total Bruto</p>
            <p className="text-body-xl font-bold">{formatCurrency(item.total_bruto)}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <p className="text-label uppercase tracking-widest text-neutral-500">Total Descontos</p>
            <p className="text-body-xl font-bold">{formatCurrency(item.total_descontos)}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
            <p className="text-label uppercase tracking-widest text-neutral-500">Líquido</p>
            <p className="text-body-xl font-bold">{formatCurrency(item.liquido)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-secondary-600 text-white px-4 py-2 text-body-xs font-semibold disabled:opacity-60">
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button onClick={() => onExport('pdf')} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-body-xs font-semibold">
            <FileDown size={14} /> Exportar PDF
          </button>
          <button onClick={() => onExport('excel')} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-body-xs font-semibold">
            <FileSpreadsheet size={14} /> Exportar Excel
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl border border-error-300 text-error-600 px-4 py-2 text-body-xs font-semibold">
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>

      {error && <div className="text-error-600">{error}</div>}
    </div>
  );
}
