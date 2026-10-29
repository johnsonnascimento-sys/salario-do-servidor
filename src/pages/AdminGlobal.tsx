import React, { useEffect, useState } from 'react';
import ConfigTable from '../components/Admin/ConfigTable';
import JsonEditor from '../components/Admin/JsonEditor';
import { AdminService } from '../services/admin/AdminService';
import { configService } from '../services/config';
import { GlobalConfig } from '../types/admin';
import ConfigVersionDateField from '../components/Admin/ConfigVersionDateField';
import { configurationToday, validateConfigVersionDate } from '../services/admin/configVersionValidation';

export default function AdminGlobal() {
  const [configs, setConfigs] = useState<GlobalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GlobalConfig | null>(null);
  const [editValue, setEditValue] = useState(editing?.config_value || {});
  const [saving, setSaving] = useState(false);
  const [versionDate, setVersionDate] = useState(configurationToday);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await AdminService.listGlobalConfigs();
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
      setVersionDate(configurationToday());
      setSaveError(null);
    }
  }, [editing]);

  const handleSave = async () => {
    if (!editing) return;
    const dateError = validateConfigVersionDate(editing, versionDate);
    if (dateError) { setSaveError(dateError); return; }
    const confirmed = window.confirm('Essa alteracao impacta os calculos imediatamente. Deseja continuar?');
    if (!confirmed) return;

    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        previous_id: editing.id,
        config_key: editing.config_key,
        config_value: editValue,
        valid_from: versionDate,
        valid_to: null,
      };
      await AdminService.versionGlobalConfig(payload);
      configService.clearCache();
      await loadConfigs();
      setEditing(null);
    } catch (err) {
      setSaveError((err as Error).message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h4 font-bold text-gray-900">Admin - Regras Globais</h1>
          <p className="text-body text-gray-500">Gerencie tabelas globais (IR, PSS, deducoes).</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando dados...</div>
        ) : (
          <ConfigTable kind="global" rows={configs} onEdit={(row) => setEditing(row as GlobalConfig)} />
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg w-full max-w-3xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-h4 font-bold text-gray-900">Editar {editing.config_key}</h2>
                <p className="text-body-xs text-gray-500">Validade: {editing.valid_from}{' -> '}{editing.valid_to || 'Atual'}</p>
              </div>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700">Fechar</button>
            </div>

            <ConfigVersionDateField previous={editing} value={versionDate} onChange={setVersionDate} />
            <JsonEditor value={editValue} onChange={setEditValue} />
            {saveError && <p role="alert" className="mt-3 text-error-600">{saveError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-body text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || Boolean(validateConfigVersionDate(editing, versionDate))}
                className="px-4 py-2 rounded-md text-body text-white bg-secondary-500 hover:bg-secondary-700 disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Criar nova versão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
