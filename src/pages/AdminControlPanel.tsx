import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import JsonEditor from '../components/Admin/JsonEditor';
import { AdminService } from '../services/admin/AdminService';
import { GlobalConfig, JsonObject, OrgConfig, PowerConfig } from '../types/admin';

type Scope = 'global' | 'power' | 'org';
type Mode = 'edit' | 'create' | 'version';

type EditorState = {
  scope: Scope;
  mode: Mode;
  id?: string;
  config_key: string;
  valid_from: string;
  valid_to: string | null;
  config_value: JsonObject;
  power_name: string;
  org_slug: string;
  org_name: string;
  configuration: JsonObject;
};

const today = () => new Date().toISOString().slice(0, 10);
const dayBefore = (date: string) => {
  const dt = new Date(`${date}T12:00:00`);
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().slice(0, 10);
};

const COMMON_POWER_KEYS = [
  'benefits',
  'adjustment_schedule',
  'salary_bases',
  'aq_rules',
  'gratification_percentages',
  'dailies_rules',
  'payroll_rules',
  'career_catalog',
  'cj1_integral_base',
];

export default function AdminControlPanel() {
  const [scope, setScope] = useState<Scope>('power');
  const [globals, setGlobals] = useState<GlobalConfig[]>([]);
  const [powers, setPowers] = useState<PowerConfig[]>([]);
  const [orgs, setOrgs] = useState<OrgConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [powerFilter, setPowerFilter] = useState('PJU');
  const [keyFilter, setKeyFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState>({
    scope: 'power',
    mode: 'create',
    config_key: '',
    valid_from: today(),
    valid_to: null,
    config_value: {},
    power_name: 'PJU',
    org_slug: '',
    org_name: '',
    configuration: {},
  });

  const [benefitType, setBenefitType] = useState<'auxilio_alimentacao' | 'auxilio_preescolar'>('auxilio_alimentacao');
  const [benefitPeriod, setBenefitPeriod] = useState('');
  const [benefitValue, setBenefitValue] = useState('');

  const [adjPeriod, setAdjPeriod] = useState('');
  const [adjDate, setAdjDate] = useState(today());
  const [adjPct, setAdjPct] = useState('');
  const [adjLabel, setAdjLabel] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, p, o] = await Promise.all([
        AdminService.listGlobalConfigs(),
        AdminService.listPowerConfigs(),
        AdminService.listOrgConfigs(),
      ]);
      setGlobals(g);
      setPowers(p);
      setOrgs(o);
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar dados do admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const powerNames = useMemo(
    () => Array.from(new Set(powers.map((p) => p.power_name))).sort(),
    [powers]
  );

  const filteredRows = useMemo(() => {
    if (scope === 'global') {
      return globals
        .filter((row) => row.config_key.toLowerCase().includes(keyFilter.toLowerCase()))
        .sort((a, b) => (a.config_key === b.config_key ? b.valid_from.localeCompare(a.valid_from) : a.config_key.localeCompare(b.config_key)));
    }

    if (scope === 'power') {
      return powers
        .filter((row) => (powerFilter ? row.power_name === powerFilter : true))
        .filter((row) => row.config_key.toLowerCase().includes(keyFilter.toLowerCase()))
        .sort((a, b) => {
          const k = `${a.power_name}/${a.config_key}`.localeCompare(`${b.power_name}/${b.config_key}`);
          return k === 0 ? b.valid_from.localeCompare(a.valid_from) : k;
        });
    }

    return orgs
      .filter((row) => `${row.org_slug} ${row.org_name}`.toLowerCase().includes(orgFilter.toLowerCase()))
      .sort((a, b) => a.org_slug.localeCompare(b.org_slug));
  }, [scope, globals, powers, orgs, keyFilter, powerFilter, orgFilter]);

  const openCreate = () => {
    setEditor({
      scope,
      mode: 'create',
      config_key: '',
      valid_from: today(),
      valid_to: null,
      config_value: {},
      power_name: powerFilter || powerNames[0] || 'PJU',
      org_slug: '',
      org_name: '',
      configuration: {},
    });
    setEditorOpen(true);
  };

  const openEdit = (row: GlobalConfig | PowerConfig | OrgConfig) => {
    if (scope === 'org') {
      const org = row as OrgConfig;
      setEditor({
        scope: 'org',
        mode: 'edit',
        id: org.id,
        config_key: '',
        valid_from: today(),
        valid_to: null,
        config_value: {},
        power_name: org.power_name,
        org_slug: org.org_slug,
        org_name: org.org_name,
        configuration: org.configuration || {},
      });
      setEditorOpen(true);
      return;
    }

    if (scope === 'global') {
      const g = row as GlobalConfig;
      setEditor({
        scope: 'global',
        mode: 'edit',
        id: g.id,
        config_key: g.config_key,
        valid_from: g.valid_from,
        valid_to: g.valid_to,
        config_value: g.config_value || {},
        power_name: '',
        org_slug: '',
        org_name: '',
        configuration: {},
      });
      setEditorOpen(true);
      return;
    }

    const p = row as PowerConfig;
    setEditor({
      scope: 'power',
      mode: 'edit',
      id: p.id,
      config_key: p.config_key,
      valid_from: p.valid_from,
      valid_to: p.valid_to,
      config_value: p.config_value || {},
      power_name: p.power_name,
      org_slug: '',
      org_name: '',
      configuration: {},
    });
    setEditorOpen(true);
  };

  const openVersionFromActive = (row: GlobalConfig | PowerConfig) => {
    const sameConfig = scope === 'global'
      ? globals.find((item) => item.config_key === row.config_key && item.valid_to === null)
      : powers.find((item) => item.power_name === (row as PowerConfig).power_name && item.config_key === row.config_key && item.valid_to === null);

    const src = sameConfig || row;
    if (scope === 'global') {
      const g = src as GlobalConfig;
      setEditor({
        scope: 'global',
        mode: 'version',
        config_key: g.config_key,
        valid_from: today(),
        valid_to: null,
        config_value: g.config_value || {},
        power_name: '',
        org_slug: '',
        org_name: '',
        configuration: {},
      });
    } else {
      const p = src as PowerConfig;
      setEditor({
        scope: 'power',
        mode: 'version',
        config_key: p.config_key,
        valid_from: today(),
        valid_to: null,
        config_value: p.config_value || {},
        power_name: p.power_name,
        org_slug: '',
        org_name: '',
        configuration: {},
      });
    }
    setEditorOpen(true);
  };

  const addBenefitEntry = () => {
    const period = benefitPeriod.trim();
    const value = Number(benefitValue.replace(',', '.'));
    if (!period || !Number.isFinite(value) || value <= 0) return;

    const current = (editor.config_value || {}) as JsonObject;
    const nextType = { ...((current[benefitType] as JsonObject) || {}) };
    nextType[period] = value;
    setEditor((prev) => ({
      ...prev,
      config_value: { ...prev.config_value, [benefitType]: nextType },
    }));
    setBenefitPeriod('');
    setBenefitValue('');
  };

  const addAdjustmentEntry = () => {
    const period = adjPeriod.trim();
    const pct = Number(adjPct.replace(',', '.'));
    if (!period || !adjDate || !Number.isFinite(pct)) return;

    setEditor((prev) => ({
      ...prev,
      config_value: {
        ...prev.config_value,
        [period]: {
          date: adjDate,
          percentage: pct,
          label: adjLabel.trim(),
        },
      },
    }));
    setAdjPeriod('');
    setAdjPct('');
    setAdjLabel('');
  };

  const save = async () => {
    const confirmed = window.confirm('Essa alteracao impacta os calculos imediatamente. Deseja continuar?');
    if (!confirmed) return;

    setSaving(true);
    try {
      if (editor.scope === 'org') {
        await AdminService.upsertOrgConfig({
          id: editor.mode === 'edit' ? editor.id : undefined,
          org_slug: editor.org_slug,
          org_name: editor.org_name,
          power_name: editor.power_name,
          configuration: editor.configuration,
        });
      } else if (editor.scope === 'global') {
        if (editor.mode === 'version') {
          const current = globals.find((g) => g.config_key === editor.config_key && g.valid_to === null);
          if (current) {
            await AdminService.upsertGlobalConfig({
              id: current.id,
              config_key: current.config_key,
              config_value: current.config_value,
              valid_from: current.valid_from,
              valid_to: dayBefore(editor.valid_from),
            });
          }
        }

        await AdminService.upsertGlobalConfig({
          id: editor.mode === 'edit' ? editor.id : undefined,
          config_key: editor.config_key,
          config_value: editor.config_value,
          valid_from: editor.valid_from,
          valid_to: editor.valid_to,
        });
      } else {
        if (editor.mode === 'version') {
          const current = powers.find(
            (p) =>
              p.power_name === editor.power_name &&
              p.config_key === editor.config_key &&
              p.valid_to === null
          );
          if (current) {
            await AdminService.upsertPowerConfig({
              id: current.id,
              power_name: current.power_name,
              config_key: current.config_key,
              config_value: current.config_value,
              valid_from: current.valid_from,
              valid_to: dayBefore(editor.valid_from),
            });
          }
        }

        await AdminService.upsertPowerConfig({
          id: editor.mode === 'edit' ? editor.id : undefined,
          power_name: editor.power_name,
          config_key: editor.config_key,
          config_value: editor.config_value,
          valid_from: editor.valid_from,
          valid_to: editor.valid_to,
        });
      }

      await loadAll();
      setEditorOpen(false);
    } catch (err) {
      alert((err as Error).message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-h4 font-bold text-gray-900">Painel de Controle de Configurações</h1>
              <p className="text-body text-gray-500">
                Atualize regras e valores no banco em tempo real. Não precisa commit/push/deploy para ajustes de tabela.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/hub" className="px-3 py-2 rounded-md border border-gray-300 text-body text-gray-600 hover:bg-gray-50">
                Diagnostico
              </Link>
              <Link to="/admin/wiki" className="px-3 py-2 rounded-md border border-gray-300 text-body text-gray-600 hover:bg-gray-50">
                Wiki
              </Link>
              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-md text-body text-white bg-secondary-500 hover:bg-secondary-700"
              >
                Novo Registro
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="rounded-md border border-gray-300 p-2 text-body"
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              <option value="power">Power Config</option>
              <option value="global">Global Config</option>
              <option value="org">Org Config</option>
            </select>

            {scope === 'power' && (
              <select
                className="rounded-md border border-gray-300 p-2 text-body"
                value={powerFilter}
                onChange={(e) => setPowerFilter(e.target.value)}
              >
                <option value="">Todos os poderes</option>
                {powerNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}

            {(scope === 'power' || scope === 'global') && (
              <input
                className="rounded-md border border-gray-300 p-2 text-body"
                placeholder="Filtrar por chave..."
                value={keyFilter}
                onChange={(e) => setKeyFilter(e.target.value)}
              />
            )}

            {scope === 'org' && (
              <input
                className="rounded-md border border-gray-300 p-2 text-body"
                placeholder="Filtrar órgão..."
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
              />
            )}
          </div>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 rounded-md p-3">{error}</div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-body-xs font-bold text-gray-500 uppercase">Escopo</th>
                  <th className="px-4 py-3 text-left text-body-xs font-bold text-gray-500 uppercase">Entidade</th>
                  <th className="px-4 py-3 text-left text-body-xs font-bold text-gray-500 uppercase">Chave</th>
                  <th className="px-4 py-3 text-left text-body-xs font-bold text-gray-500 uppercase">Validade</th>
                  <th className="px-4 py-3 text-right text-body-xs font-bold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Carregando...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum registro.</td>
                  </tr>
                ) : (
                  filteredRows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-body text-gray-600">{scope.toUpperCase()}</td>
                      <td className="px-4 py-3 text-body font-bold text-gray-900">
                        {scope === 'power' ? row.power_name : scope === 'org' ? row.org_slug : 'GLOBAL'}
                      </td>
                      <td className="px-4 py-3 text-body text-gray-700">{scope === 'org' ? '-' : row.config_key}</td>
                      <td className="px-4 py-3 text-body text-gray-600">
                        {scope === 'org' ? '-' : `${row.valid_from} -> ${row.valid_to || 'Atual'}`}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => openEdit(row)} className="text-secondary-600 hover:text-secondary-800 text-body-xs font-bold">
                          Editar
                        </button>
                        {scope !== 'org' && (
                          <button onClick={() => openVersionFromActive(row)} className="text-success-700 hover:text-success-900 text-body-xs font-bold">
                            Nova versão
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[92vh] overflow-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-h4 font-bold text-gray-900">
                  {editor.mode === 'edit' ? 'Editar Registro' : editor.mode === 'version' ? 'Nova Versão de Configuração' : 'Novo Registro'}
                </h2>
                <p className="text-body text-gray-500">
                  {editor.mode === 'version' ? 'Ao salvar, a versão atual será encerrada automaticamente.' : 'As mudanças passam a valer imediatamente após salvar.'}
                </p>
              </div>
              <button onClick={() => setEditorOpen(false)} className="text-gray-500 hover:text-gray-700">Fechar</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <select
                className="rounded-md border border-gray-300 p-2 text-body"
                value={editor.scope}
                onChange={(e) => setEditor((prev) => ({ ...prev, scope: e.target.value as Scope }))}
                disabled={editor.mode !== 'create'}
              >
                <option value="power">Power</option>
                <option value="global">Global</option>
                <option value="org">Org</option>
              </select>

              {editor.scope === 'power' && (
                <select
                  className="rounded-md border border-gray-300 p-2 text-body"
                  value={editor.power_name}
                  onChange={(e) => setEditor((prev) => ({ ...prev, power_name: e.target.value }))}
                >
                  {powerNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )}

              {editor.scope !== 'org' && (
                <input
                  className="rounded-md border border-gray-300 p-2 text-body"
                  placeholder="config_key"
                  value={editor.config_key}
                  onChange={(e) => setEditor((prev) => ({ ...prev, config_key: e.target.value }))}
                  list={editor.scope === 'power' ? 'power-key-options' : undefined}
                />
              )}
              <datalist id="power-key-options">
                {COMMON_POWER_KEYS.map((key) => (
                  <option key={key} value={key} />
                ))}
              </datalist>

              {editor.scope === 'org' && (
                <>
                  <input
                    className="rounded-md border border-gray-300 p-2 text-body"
                    placeholder="org_slug"
                    value={editor.org_slug}
                    onChange={(e) => setEditor((prev) => ({ ...prev, org_slug: e.target.value }))}
                  />
                  <input
                    className="rounded-md border border-gray-300 p-2 text-body"
                    placeholder="org_name"
                    value={editor.org_name}
                    onChange={(e) => setEditor((prev) => ({ ...prev, org_name: e.target.value }))}
                  />
                  <input
                    className="rounded-md border border-gray-300 p-2 text-body"
                    placeholder="power_name"
                    value={editor.power_name}
                    onChange={(e) => setEditor((prev) => ({ ...prev, power_name: e.target.value }))}
                  />
                </>
              )}

              {editor.scope !== 'org' && (
                <>
                  <input
                    type="date"
                    className="rounded-md border border-gray-300 p-2 text-body"
                    value={editor.valid_from}
                    onChange={(e) => setEditor((prev) => ({ ...prev, valid_from: e.target.value }))}
                  />
                  <input
                    type="date"
                    className="rounded-md border border-gray-300 p-2 text-body"
                    value={editor.valid_to || ''}
                    onChange={(e) => setEditor((prev) => ({ ...prev, valid_to: e.target.value || null }))}
                  />
                </>
              )}
            </div>

            {editor.scope === 'power' && editor.config_key === 'benefits' && (
              <div className="mt-4 p-4 rounded-lg border border-secondary-200 bg-secondary-50">
                <p className="text-body font-bold text-secondary-800 mb-3">Atalho: adicionar benefício sem editar JSON manual</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select className="rounded-md border border-gray-300 p-2 text-body" value={benefitType} onChange={(e) => setBenefitType(e.target.value as any)}>
                    <option value="auxilio_alimentacao">auxilio_alimentacao</option>
                    <option value="auxilio_preescolar">auxilio_preescolar</option>
                  </select>
                  <input
                    className="rounded-md border border-gray-300 p-2 text-body"
                    placeholder="periodo (ex: 2026_02)"
                    value={benefitPeriod}
                    onChange={(e) => setBenefitPeriod(e.target.value)}
                  />
                  <input
                    className="rounded-md border border-gray-300 p-2 text-body"
                    placeholder="valor"
                    value={benefitValue}
                    onChange={(e) => setBenefitValue(e.target.value)}
                  />
                  <button onClick={addBenefitEntry} className="rounded-md bg-secondary-600 text-white px-3 py-2 text-body-xs font-bold hover:bg-secondary-700">
                    Adicionar/Atualizar
                  </button>
                </div>
              </div>
            )}

            {editor.scope === 'power' && editor.config_key === 'adjustment_schedule' && (
              <div className="mt-4 p-4 rounded-lg border border-warning-200 bg-warning-50">
                <p className="text-body font-bold text-warning-900 mb-3">Atalho: adicionar período de referência/reajuste</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <input className="rounded-md border border-gray-300 p-2 text-body" placeholder="period (ex: 5)" value={adjPeriod} onChange={(e) => setAdjPeriod(e.target.value)} />
                  <input type="date" className="rounded-md border border-gray-300 p-2 text-body" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} />
                  <input className="rounded-md border border-gray-300 p-2 text-body" placeholder="percentual (ex: 0.08)" value={adjPct} onChange={(e) => setAdjPct(e.target.value)} />
                  <input className="rounded-md border border-gray-300 p-2 text-body" placeholder="label" value={adjLabel} onChange={(e) => setAdjLabel(e.target.value)} />
                  <button onClick={addAdjustmentEntry} className="rounded-md bg-warning-700 text-white px-3 py-2 text-body-xs font-bold hover:bg-warning-800">
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4">
              <JsonEditor
                value={editor.scope === 'org' ? editor.configuration : editor.config_value}
                onChange={(value) => {
                  if (editor.scope === 'org') {
                    setEditor((prev) => ({ ...prev, configuration: value }));
                  } else {
                    setEditor((prev) => ({ ...prev, config_value: value }));
                  }
                }}
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditorOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-body text-gray-700 bg-white hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={save}
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


