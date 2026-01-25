import React, { useEffect, useMemo, useState } from 'react';
import ConfigTable from '../components/Admin/ConfigTable';
import JsonEditor from '../components/Admin/JsonEditor';
import { AdminService } from '../services/admin/AdminService';
import { PowerConfig } from '../types/admin';

export default function AdminPower() {
  const [configs, setConfigs] = useState<PowerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PowerConfig | null>(null);
  const [editValue, setEditValue] = useState(editing?.config_value || {});
  const [saving, setSaving] = useState(false);
  const [selectedPower, setSelectedPower] = useState('');

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await AdminService.listPowerConfigs();
      setConfigs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    if (editing) {
      setEditValue(editing.config_value || {});
    }
  }, [editing]);

  const powers = useMemo(() => {
    const unique = new Set(configs.map((item) => item.power_name));
    return Array.from(unique).sort();
  }, [configs]);

  const filtered = useMemo(() => {
    if (!selectedPower) return configs;
    return configs.filter((item) => item.power_name === selectedPower);
  }, [configs, selectedPower]);

  const handleSave = async () => {
    if (!editing) return;
    const confirmed = window.confirm('Essa alteracao impacta os calculos imediatamente. Deseja continuar?');
    if (!confirmed) return;

    setSaving(true);
    try {
      const payload = {
        id: editing.id,
        power_name: editing.power_name,
        config_key: editing.config_key,
        config_value: editValue,
        valid_from: editing.valid_from,
        valid_to: editing.valid_to,
      };
      await AdminService.upsertPowerConfig(payload);
      await loadConfigs();
      setEditing(null);
    } catch (err) {
      alert((err as Error).message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-h4 font-bold text-gray-900">Admin - Regras por Poder</h1>
            <p className="text-body text-gray-500">Filtre por poder e edite configuracoes.</p>
          </div>
          <div className="w-full md:w-72">
            <select
              className="w-full rounded-md border border-gray-300 p-2 text-body"
              value={selectedPower}
              onChange={(e) => setSelectedPower(e.target.value)}
            >
              <option value="">Todos os poderes</option>
              {powers.map((power) => (
                <option key={power} value={power}>{power}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando dados...</div>
        ) : (
          <ConfigTable kind="power" rows={filtered} onEdit={(row) => setEditing(row as PowerConfig)} />
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg w-full max-w-3xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-h4 font-bold text-gray-900">Editar {editing.power_name} / {editing.config_key}</h2>
                <p className="text-body-xs text-gray-500">Validade: {editing.valid_from}{' -> '}{editing.valid_to || 'Atual'}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700">Fechar</button>
            </div>

            <JsonEditor value={editValue} onChange={setEditValue} />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-body text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-md text-body text-white bg-secondary-500 hover:bg-secondary-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
