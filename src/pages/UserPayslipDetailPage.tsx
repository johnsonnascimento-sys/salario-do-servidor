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

  const detailedRows = useMemo(() => {
    const rows = Array.isArray(item?.result_rows) ? item.result_rows : [];
    const credits = rows.filter((row) => row.type === 'C');
    const debits = rows.filter((row) => row.type === 'D');
    const totalCredits = credits.reduce((sum, row) => sum + Number(row.value || 0), 0);
    const totalDebits = debits.reduce((sum, row) => sum + Number(row.value || 0), 0);

    return {
      credits,
      debits,
      totalCredits,
      totalDebits,
    };
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

      const updated = await updatePayslip(item.id, payload);
      setItem(updated);
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
    navigate(`/simulador/${item.agency_slug}?editPayslipId=${item.id}`, {
      state: { editPayslipId: item.id },
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

        <div className="rounded-xl border border-warning-300/40 bg-warning-50/60 dark:border-warning-700/40 dark:bg-warning-900/10 px-4 py-3">
          <p className="text-body-xs text-warning-900 dark:text-warning-200">
            O snapshot deste holerite só pode ser atualizado reabrindo-o na calculadora e salvando novamente.
          </p>
        </div>

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

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-4">
          <h2 className="text-body-lg font-bold text-neutral-900 dark:text-neutral-100">Detalhamento de Créditos e Débitos</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-success-300/40 dark:border-success-700/50">
              <div className="px-4 py-3 border-b border-success-300/40 dark:border-success-700/50 bg-success-50/60 dark:bg-success-900/20">
                <p className="text-body-xs font-bold uppercase tracking-widest text-success-700 dark:text-success-400">
                  Créditos ({detailedRows.credits.length})
                </p>
                <p className="text-body font-semibold text-success-700 dark:text-success-400">
                  {formatCurrency(detailedRows.totalCredits)}
                </p>
              </div>
              <div className="max-h-72 overflow-auto">
                {detailedRows.credits.length === 0 ? (
                  <p className="p-4 text-body-xs text-neutral-500">Nenhum crédito encontrado neste holerite.</p>
                ) : (
                  detailedRows.credits.map((row, index) => (
                    <div key={`credit-${index}-${row.label}`} className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
                      <p className="text-body-xs text-neutral-700 dark:text-neutral-200">{row.label}</p>
                      <p className="text-body-xs font-bold text-success-700 dark:text-success-400">{formatCurrency(row.value)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-error-300/40 dark:border-error-700/50">
              <div className="px-4 py-3 border-b border-error-300/40 dark:border-error-700/50 bg-error-50/60 dark:bg-error-900/20">
                <p className="text-body-xs font-bold uppercase tracking-widest text-error-700 dark:text-error-400">
                  Débitos ({detailedRows.debits.length})
                </p>
                <p className="text-body font-semibold text-error-700 dark:text-error-400">
                  {formatCurrency(detailedRows.totalDebits)}
                </p>
              </div>
              <div className="max-h-72 overflow-auto">
                {detailedRows.debits.length === 0 ? (
                  <p className="p-4 text-body-xs text-neutral-500">Nenhum débito encontrado neste holerite.</p>
                ) : (
                  detailedRows.debits.map((row, index) => (
                    <div key={`debit-${index}-${row.label}`} className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
                      <p className="text-body-xs text-neutral-700 dark:text-neutral-200">{row.label}</p>
                      <p className="text-body-xs font-bold text-error-700 dark:text-error-400">{formatCurrency(row.value)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-2">
          <h2 className="text-body-lg font-bold text-neutral-900 dark:text-neutral-100">Notas Salvas</h2>
          <p className="text-body whitespace-pre-wrap text-neutral-700 dark:text-neutral-200">
            {notes?.trim() || 'Sem notas registradas para este holerite.'}
          </p>
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
