import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, Edit3, Eye, FileDown, FileSpreadsheet, Search, Trash2 } from 'lucide-react';
import { useUserPayslips } from '../hooks/user/useUserPayslips';
import { formatCurrency } from '../utils/calculations';
import { exportToExcel, exportToPDF } from '../services/exportService';
import { UserPayslip } from '../types/user';

export default function UserPayslipsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { result, loading, error, reload, create, remove } = useUserPayslips({ page: 1, pageSize: 10 });

  const yearOptions = useMemo(() => {
    const years = new Set<number>(
      result.data
        .map((item) => Number(item.year_ref))
        .filter((value): value is number => Number.isFinite(value))
    );
    return Array.from<number>(years).sort((a, b) => b - a);
  }, [result.data]);

  const handleFilter = async () => {
    setCurrentPage(1);
    await reload({
      page: 1,
      pageSize: result.pageSize,
      query,
      year: year ? Number(year) : undefined,
      month: month || undefined,
    });
  };

  const handlePageChange = async (page: number) => {
    const safePage = Math.max(1, page);
    setCurrentPage(safePage);
    await reload({
      page: safePage,
      pageSize: result.pageSize,
      query,
      year: year ? Number(year) : undefined,
      month: month || undefined,
    });
  };

  const handleExport = (item: UserPayslip, type: 'pdf' | 'excel') => {
    const safeTitle = item.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
    const filename = `${safeTitle || 'Holerite'}_${item.month_ref}_${item.year_ref}`;

    if (type === 'pdf') {
      exportToPDF(item.calculator_state, item.result_rows, null, { filename });
    } else {
      exportToExcel(item.calculator_state, item.result_rows, null, { filename });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('Deseja excluir este holerite? Essa ação não pode ser desfeita.');
    if (!ok) return;
    await remove(id);
  };

  const handleDuplicate = async (item: UserPayslip) => {
    await create({
      title: `${item.title} - Cópia`,
      agency_slug: item.agency_slug,
      agency_name: item.agency_name,
      month_ref: item.month_ref,
      year_ref: item.year_ref,
      tags: item.tags,
      notes: item.notes,
      calculator_state: item.calculator_state,
      result_rows: item.result_rows,
      liquido: item.liquido,
      total_bruto: item.total_bruto,
      total_descontos: item.total_descontos,
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h3 font-bold text-neutral-900 dark:text-neutral-100">Meus Holerites</h1>
          <p className="text-neutral-500 dark:text-neutral-300 text-body">Gerencie snapshots da calculadora e exporte quando quiser.</p>
        </div>
        <Link
          to="/simulador/jmu"
          state={{ startBlank: true }}
          className="rounded-xl bg-secondary-600 text-white px-4 py-2 font-semibold"
        >
          Nova simulação
        </Link>
      </div>

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-body-xs text-neutral-500">Buscar</label>
          <div className="mt-1 relative">
            <Search size={16} className="absolute left-3 top-3 text-neutral-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-9 p-2" />
          </div>
        </div>
        <div>
          <label className="text-body-xs text-neutral-500">Ano</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2">
            <option value="">Todos</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-body-xs text-neutral-500">Mês</label>
          <input value={month} onChange={(e) => setMonth(e.target.value.toUpperCase())} placeholder="MARÇO" className="mt-1 w-full rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2" />
        </div>
        <div className="md:col-span-4">
          <button onClick={handleFilter} className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-body-xs font-semibold">Aplicar filtros</button>
        </div>
      </div>

      {error && <div className="text-error-600">{error}</div>}

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-3 text-left text-body-xs uppercase tracking-widest text-neutral-500">Título</th>
              <th className="px-4 py-3 text-left text-body-xs uppercase tracking-widest text-neutral-500">Referência</th>
              <th className="px-4 py-3 text-left text-body-xs uppercase tracking-widest text-neutral-500">Órgão</th>
              <th className="px-4 py-3 text-right text-body-xs uppercase tracking-widest text-neutral-500">Líquido</th>
              <th className="px-4 py-3 text-right text-body-xs uppercase tracking-widest text-neutral-500">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Carregando...</td></tr>
            ) : result.data.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">Nenhum holerite salvo.</td></tr>
            ) : result.data.map((item) => (
              <tr key={item.id} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="px-4 py-3">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</div>
                  {item.notes && <div className="text-body-xs text-neutral-500 truncate max-w-xs">{item.notes}</div>}
                </td>
                <td className="px-4 py-3 text-body text-neutral-700 dark:text-neutral-300">{item.month_ref}/{item.year_ref}</td>
                <td className="px-4 py-3 text-body text-neutral-700 dark:text-neutral-300">{item.agency_name}</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.liquido)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => navigate(`/minha-area/holerites/${item.id}`)} className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700" title="Detalhes"><Eye size={14} /></button>
                    <button onClick={() => handleExport(item, 'pdf')} className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700" title="Exportar PDF"><FileDown size={14} /></button>
                    <button onClick={() => handleExport(item, 'excel')} className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700" title="Exportar Excel"><FileSpreadsheet size={14} /></button>
                    <button onClick={() => handleDuplicate(item)} className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700" title="Duplicar"><Copy size={14} /></button>
                    <button
                      onClick={() => navigate(`/simulador/${item.agency_slug}?editPayslipId=${item.id}`, {
                        state: { editPayslipId: item.id },
                      })}
                      className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-700"
                      title="Editar"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg border border-error-300 text-error-600" title="Excluir"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-body-xs text-neutral-500">
          Página {result.page} de {Math.max(1, Math.ceil(result.count / result.pageSize))} ({result.count} registro(s))
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-body-xs disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= Math.max(1, Math.ceil(result.count / result.pageSize))}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-body-xs disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
