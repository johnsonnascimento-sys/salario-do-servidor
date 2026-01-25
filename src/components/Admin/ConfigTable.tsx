import React from 'react';
import { GlobalConfig, OrgConfig, PowerConfig } from '../../types/admin';

type ConfigRow = GlobalConfig | PowerConfig | OrgConfig;

type ConfigKind = 'global' | 'power' | 'org';

interface ConfigTableProps {
  kind: ConfigKind;
  rows: ConfigRow[];
  onEdit: (row: ConfigRow) => void;
}

const getKeyLabel = (kind: ConfigKind, row: ConfigRow) => {
  if (kind === 'global') {
    return (row as GlobalConfig).config_key;
  }
  if (kind === 'power') {
    const powerRow = row as PowerConfig;
    return `${powerRow.power_name} / ${powerRow.config_key}`;
  }
  return (row as OrgConfig).org_slug;
};

const getValidity = (row: ConfigRow) => {
  if ('valid_from' in row) {
    const from = row.valid_from || '-';
    const to = row.valid_to || 'Atual';
    return `${from} -> ${to}`;
  }
  return '—';
};

const shortId = (id: string) => id.slice(0, 8);

export default function ConfigTable({ kind, rows, onEdit }: ConfigTableProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-body-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-body-xs font-medium text-gray-500 uppercase tracking-wider">Chave / Slug</th>
              <th className="px-6 py-3 text-left text-body-xs font-medium text-gray-500 uppercase tracking-wider">Validade</th>
              <th className="px-6 py-3 text-right text-body-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 whitespace-nowrap text-body text-gray-500 font-mono">{shortId(row.id)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-body font-bold text-gray-900">
                  {getKeyLabel(kind, row)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-body text-gray-500">
                  {getValidity(row)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-body">
                  <button
                    onClick={() => onEdit(row)}
                    className="text-secondary-500 hover:text-secondary-900 font-medium"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-8 text-center text-gray-500">Nenhum registro encontrado.</div>
        )}
      </div>
    </div>
  );
}
