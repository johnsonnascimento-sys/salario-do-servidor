import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, RefreshCcw, Save, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import {
  UserAdminService,
  type AdminAllowlistPayload,
  type AdminAllowlistRow,
  type AdminUpdateUserPayload,
  type AdminUserRow,
  type SignupAllowlistRow,
} from '../services/admin/UserAdminService';

const maskCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatDateTime = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};

interface UserFormState {
  fullName: string;
  cpf: string;
  email: string;
  isBetaEnabled: boolean;
  allowlistEnabled: boolean;
}

const toUserFormState = (row: AdminUserRow): UserFormState => ({
  fullName: row.full_name || '',
  cpf: maskCpf(row.cpf || ''),
  email: row.email || '',
  isBetaEnabled: Boolean(row.is_beta_enabled),
  allowlistEnabled: Boolean(row.allowlist_enabled),
});

type TabKey = 'users' | 'signup-allowlist' | 'admin-allowlist';

export default function AdminUsers() {
  const [tab, setTab] = useState<TabKey>('users');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userForms, setUserForms] = useState<Record<string, UserFormState>>({});
  const [signupAllowlist, setSignupAllowlist] = useState<SignupAllowlistRow[]>([]);
  const [adminAllowlist, setAdminAllowlist] = useState<AdminAllowlistRow[]>([]);

  const [signupAllowlistForm, setSignupAllowlistForm] = useState<AdminAllowlistPayload>({
    fullName: '',
    cpf: '',
    email: '',
    enabled: true,
    notes: '',
  });
  const [adminAllowlistForm, setAdminAllowlistForm] = useState({
    email: '',
    enabled: true,
    notes: '',
  });

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, signupAllowlistData, adminAllowlistData] = await Promise.all([
        UserAdminService.listUsers(),
        UserAdminService.listSignupAllowlist(),
        UserAdminService.listAdminAllowlist(),
      ]);

      setUsers(usersData);
      setSignupAllowlist(signupAllowlistData);
      setAdminAllowlist(adminAllowlistData);

      const nextUserForms = usersData.reduce<Record<string, UserFormState>>((acc, row) => {
        acc[row.user_id] = toUserFormState(row);
        return acc;
      }, {});
      setUserForms(nextUserForms);
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') * -1),
    [users],
  );

  const updateUserForm = (userId: string, patch: Partial<UserFormState>) => {
    setUserForms((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...patch,
      },
    }));
  };

  const handleSaveUser = async (userId: string) => {
    const form = userForms[userId];
    if (!form) return;
    setActionLoadingId(`save-${userId}`);
    setError(null);
    setSuccess(null);

    const payload: AdminUpdateUserPayload = {
      userId,
      fullName: form.fullName,
      cpf: form.cpf,
      email: form.email,
      isBetaEnabled: form.isBetaEnabled,
      allowlistEnabled: form.allowlistEnabled,
    };

    try {
      await UserAdminService.updateUser(payload);
      setSuccess('Usuário atualizado com sucesso.');
      await loadAll();
    } catch (err) {
      setError((err as Error).message || 'Erro ao salvar usuário.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    setActionLoadingId(`reset-${email}`);
    setError(null);
    setSuccess(null);
    try {
      await UserAdminService.sendPasswordReset(email);
      setSuccess(`Link de redefinição enviado para ${email}.`);
    } catch (err) {
      setError((err as Error).message || 'Erro ao enviar reset de senha.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const confirmed = window.confirm('Confirma excluir este usuário? A conta de autenticação será removida.');
    if (!confirmed) return;

    setActionLoadingId(`delete-${userId}`);
    setError(null);
    setSuccess(null);
    try {
      await UserAdminService.deleteUser(userId, email);
      setSuccess('Usuário excluído com sucesso.');
      await loadAll();
    } catch (err) {
      setError((err as Error).message || 'Erro ao excluir usuário.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSignupAllowlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('signup-allowlist-submit');
    setError(null);
    setSuccess(null);
    try {
      await UserAdminService.upsertAllowlistUser(signupAllowlistForm);
      setSuccess('Allowlist de cadastro atualizada.');
      setSignupAllowlistForm({
        fullName: '',
        cpf: '',
        email: '',
        enabled: true,
        notes: '',
      });
      await loadAll();
    } catch (err) {
      setError((err as Error).message || 'Erro ao atualizar allowlist de cadastro.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAdminAllowlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('admin-allowlist-submit');
    setError(null);
    setSuccess(null);
    try {
      await UserAdminService.upsertAdminAllowlist(
        adminAllowlistForm.email,
        adminAllowlistForm.enabled,
        adminAllowlistForm.notes,
      );
      setSuccess('Allowlist de administradores atualizada.');
      setAdminAllowlistForm({
        email: '',
        enabled: true,
        notes: '',
      });
      await loadAll();
    } catch (err) {
      setError((err as Error).message || 'Erro ao atualizar allowlist de administradores.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAdminAllowlist = async (email: string) => {
    const confirmed = window.confirm(`Remover ${email} da allowlist admin?`);
    if (!confirmed) return;

    setActionLoadingId(`admin-allowlist-delete-${email}`);
    setError(null);
    setSuccess(null);
    try {
      await UserAdminService.deleteAdminAllowlist(email);
      setSuccess('Email removido da allowlist de administradores.');
      await loadAll();
    } catch (err) {
      setError((err as Error).message || 'Erro ao remover da allowlist de administradores.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin/hub" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft size={16} /> Voltar ao Hub
            </Link>
            <h1 className="text-h4 font-bold text-gray-900 mt-3">Ferramentas de usuários</h1>
            <p className="text-body text-gray-500">Gestão completa de contas, allowlist de cadastro e allowlist administrativa.</p>
          </div>
          <button
            onClick={() => void loadAll()}
            className="px-4 py-2 rounded-md text-body text-white bg-secondary-500 hover:bg-secondary-700 inline-flex items-center gap-2"
          >
            <RefreshCcw size={16} />
            Recarregar
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-error-300 bg-error-50 text-error-700 px-4 py-3 text-body">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-success-300 bg-success-50 text-success-700 px-4 py-3 text-body">
            {success}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-2 shadow-sm flex gap-2">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg text-body font-semibold ${tab === 'users' ? 'bg-secondary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Contas do sistema
          </button>
          <button
            onClick={() => setTab('signup-allowlist')}
            className={`px-4 py-2 rounded-lg text-body font-semibold ${tab === 'signup-allowlist' ? 'bg-secondary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Allowlist de cadastro
          </button>
          <button
            onClick={() => setTab('admin-allowlist')}
            className={`px-4 py-2 rounded-lg text-body font-semibold ${tab === 'admin-allowlist' ? 'bg-secondary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Allowlist admin
          </button>
        </div>

        {tab === 'users' && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-body-xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
              <Users size={18} />
              Contas cadastradas
            </h2>
            {loading ? (
              <div className="text-body text-gray-500">Carregando...</div>
            ) : (
              <div className="space-y-4">
                {sortedUsers.map((user) => {
                  const form = userForms[user.user_id];
                  if (!form) return null;

                  return (
                    <div key={user.user_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          value={form.fullName}
                          onChange={(e) => updateUserForm(user.user_id, { fullName: e.target.value })}
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          placeholder="Nome"
                        />
                        <input
                          value={form.email}
                          onChange={(e) => updateUserForm(user.user_id, { email: e.target.value })}
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          placeholder="Email"
                        />
                        <input
                          value={form.cpf}
                          onChange={(e) => updateUserForm(user.user_id, { cpf: maskCpf(e.target.value) })}
                          className="rounded-lg border border-gray-300 px-3 py-2"
                          placeholder="CPF"
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-gray-600">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.isBetaEnabled}
                            onChange={(e) => updateUserForm(user.user_id, { isBetaEnabled: e.target.checked })}
                          />
                          Beta habilitado
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.allowlistEnabled}
                            onChange={(e) => updateUserForm(user.user_id, { allowlistEnabled: e.target.checked })}
                          />
                          Allowlist de cadastro habilitada
                        </label>
                        <span>Criado em: {formatDateTime(user.created_at)}</span>
                        <span>Último login: {formatDateTime(user.last_sign_in_at)}</span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => void handleSaveUser(user.user_id)}
                          disabled={actionLoadingId === `save-${user.user_id}`}
                          className="px-3 py-2 rounded-md bg-secondary-600 hover:bg-secondary-500 text-white inline-flex items-center gap-2 disabled:opacity-60"
                        >
                          <Save size={16} />
                          Salvar
                        </button>
                        <button
                          onClick={() => void handleResetPassword(form.email)}
                          disabled={actionLoadingId === `reset-${form.email}`}
                          className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 inline-flex items-center gap-2 disabled:opacity-60"
                        >
                          <KeyRound size={16} />
                          Resetar senha
                        </button>
                        <button
                          onClick={() => void handleDeleteUser(user.user_id, form.email)}
                          disabled={actionLoadingId === `delete-${user.user_id}`}
                          className="px-3 py-2 rounded-md border border-error-300 text-error-700 hover:bg-error-50 inline-flex items-center gap-2 disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                          Excluir conta
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'signup-allowlist' && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-body-xl font-bold text-gray-900 inline-flex items-center gap-2">
              <UserPlus size={18} />
              Allowlist de cadastro (beta fechado)
            </h2>
            <form onSubmit={handleSignupAllowlistSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                required
                placeholder="Nome completo"
                value={signupAllowlistForm.fullName}
                onChange={(e) => setSignupAllowlistForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                required
                placeholder="CPF"
                value={signupAllowlistForm.cpf}
                onChange={(e) => setSignupAllowlistForm((prev) => ({ ...prev, cpf: maskCpf(e.target.value) }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={signupAllowlistForm.email}
                onChange={(e) => setSignupAllowlistForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Notas (opcional)"
                value={signupAllowlistForm.notes || ''}
                onChange={(e) => setSignupAllowlistForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={actionLoadingId === 'signup-allowlist-submit'}
                className="rounded-lg bg-secondary-600 hover:bg-secondary-500 text-white px-3 py-2 disabled:opacity-60"
              >
                {actionLoadingId === 'signup-allowlist-submit' ? 'Salvando...' : 'Salvar'}
              </button>
            </form>

            <div className="space-y-2">
              {signupAllowlist.map((row) => (
                <div key={`${row.cpf}-${row.email}`} className="border border-gray-200 rounded-lg px-3 py-2 text-body-sm text-gray-700">
                  <div className="font-semibold">{row.full_name}</div>
                  <div>{row.email} | {maskCpf(row.cpf)} | {row.enabled ? 'habilitado' : 'desabilitado'}</div>
                  <div className="text-gray-500">{row.notes || '-'} | atualizado em {formatDateTime(row.updated_at)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'admin-allowlist' && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-body-xl font-bold text-gray-900 inline-flex items-center gap-2">
              <Shield size={18} />
              Allowlist de administradores
            </h2>
            <form onSubmit={handleAdminAllowlistSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                required
                type="email"
                placeholder="Email admin"
                value={adminAllowlistForm.email}
                onChange={(e) => setAdminAllowlistForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <select
                value={adminAllowlistForm.enabled ? 'enabled' : 'disabled'}
                onChange={(e) => setAdminAllowlistForm((prev) => ({ ...prev, enabled: e.target.value === 'enabled' }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="enabled">Habilitado</option>
                <option value="disabled">Desabilitado</option>
              </select>
              <input
                placeholder="Notas (opcional)"
                value={adminAllowlistForm.notes}
                onChange={(e) => setAdminAllowlistForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={actionLoadingId === 'admin-allowlist-submit'}
                className="rounded-lg bg-secondary-600 hover:bg-secondary-500 text-white px-3 py-2 disabled:opacity-60"
              >
                {actionLoadingId === 'admin-allowlist-submit' ? 'Salvando...' : 'Salvar'}
              </button>
            </form>

            <div className="space-y-2">
              {adminAllowlist.map((row) => (
                <div key={row.email} className="border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                  <div className="text-body-sm text-gray-700">
                    <div className="font-semibold">{row.email}</div>
                    <div>{row.enabled ? 'habilitado' : 'desabilitado'} | {row.notes || '-'}</div>
                    <div className="text-gray-500">atualizado em {formatDateTime(row.updated_at)}</div>
                  </div>
                  <button
                    onClick={() => void handleDeleteAdminAllowlist(row.email)}
                    disabled={actionLoadingId === `admin-allowlist-delete-${row.email}`}
                    className="px-3 py-2 rounded-md border border-error-300 text-error-700 hover:bg-error-50 inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

