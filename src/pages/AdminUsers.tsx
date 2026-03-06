import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, RefreshCcw, Save, Trash2, UserPlus } from 'lucide-react';
import { UserAdminService, type AdminAllowlistPayload, type AdminUpdateUserPayload, type AdminUserRow } from '../services/admin/UserAdminService';

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

interface FormState {
  fullName: string;
  cpf: string;
  email: string;
  isBetaEnabled: boolean;
  allowlistEnabled: boolean;
}

const toFormState = (row: AdminUserRow): FormState => ({
  fullName: row.full_name || '',
  cpf: maskCpf(row.cpf || ''),
  email: row.email || '',
  isBetaEnabled: Boolean(row.is_beta_enabled),
  allowlistEnabled: Boolean(row.allowlist_enabled),
});

export default function AdminUsers() {
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [forms, setForms] = useState<Record<string, FormState>>({});

  const [allowlistForm, setAllowlistForm] = useState<AdminAllowlistPayload>({
    fullName: '',
    cpf: '',
    email: '',
    enabled: true,
    notes: '',
  });

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await UserAdminService.listUsers();
      setUsers(data);
      const nextForms = data.reduce<Record<string, FormState>>((acc, row) => {
        acc[row.user_id] = toFormState(row);
        return acc;
      }, {});
      setForms(nextForms);
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '') * -1),
    [users],
  );

  const updateForm = (userId: string, patch: Partial<FormState>) => {
    setForms((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...patch,
      },
    }));
  };

  const handleSaveUser = async (userId: string) => {
    const form = forms[userId];
    if (!form) return;
    setActionLoadingId(userId);
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
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || 'Erro ao salvar usuário.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    setActionLoadingId(email);
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
    const confirmed = window.confirm('Confirma excluir este usuário? Esta ação remove a conta de autenticação.');
    if (!confirmed) return;

    setActionLoadingId(userId);
    setError(null);
    setSuccess(null);
    try {
      await UserAdminService.deleteUser(userId, email);
      setSuccess('Usuário excluído com sucesso.');
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || 'Erro ao excluir usuário.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAllowlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoadingId('allowlist');
    setError(null);
    setSuccess(null);
    try {
      await UserAdminService.upsertAllowlistUser(allowlistForm);
      setSuccess('Usuário cadastrado/atualizado na allowlist.');
      setAllowlistForm({
        fullName: '',
        cpf: '',
        email: '',
        enabled: true,
        notes: '',
      });
      await loadUsers();
    } catch (err) {
      setError((err as Error).message || 'Erro ao salvar allowlist.');
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
            <h1 className="text-h4 font-bold text-gray-900 mt-3">Usuários</h1>
            <p className="text-body text-gray-500">
              CRUD de usuários, controle de allowlist e envio de redefinição de senha.
            </p>
          </div>
          <button
            onClick={() => void loadUsers()}
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

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-body-xl font-bold text-gray-900 mb-4 inline-flex items-center gap-2">
            <UserPlus size={18} />
            Cadastrar na allowlist (beta fechado)
          </h2>
          <form onSubmit={handleAllowlistSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              required
              placeholder="Nome completo"
              value={allowlistForm.fullName}
              onChange={(e) => setAllowlistForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              required
              placeholder="CPF"
              value={allowlistForm.cpf}
              onChange={(e) => setAllowlistForm((prev) => ({ ...prev, cpf: maskCpf(e.target.value) }))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={allowlistForm.email}
              onChange={(e) => setAllowlistForm((prev) => ({ ...prev, email: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <input
              placeholder="Notas (opcional)"
              value={allowlistForm.notes || ''}
              onChange={(e) => setAllowlistForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={actionLoadingId === 'allowlist'}
              className="rounded-lg bg-secondary-600 hover:bg-secondary-500 text-white px-3 py-2 disabled:opacity-60"
            >
              {actionLoadingId === 'allowlist' ? 'Salvando...' : 'Salvar allowlist'}
            </button>
          </form>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-body-xl font-bold text-gray-900 mb-4">Contas cadastradas</h2>
          {loading ? (
            <div className="text-body text-gray-500">Carregando...</div>
          ) : (
            <div className="space-y-4">
              {sortedUsers.map((user) => {
                const form = forms[user.user_id];
                if (!form) return null;

                return (
                  <div key={user.user_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={form.fullName}
                        onChange={(e) => updateForm(user.user_id, { fullName: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="Nome"
                      />
                      <input
                        value={form.email}
                        onChange={(e) => updateForm(user.user_id, { email: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="Email"
                      />
                      <input
                        value={form.cpf}
                        onChange={(e) => updateForm(user.user_id, { cpf: maskCpf(e.target.value) })}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                        placeholder="CPF"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-gray-600">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.isBetaEnabled}
                          onChange={(e) => updateForm(user.user_id, { isBetaEnabled: e.target.checked })}
                        />
                        Beta habilitado
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.allowlistEnabled}
                          onChange={(e) => updateForm(user.user_id, { allowlistEnabled: e.target.checked })}
                        />
                        Allowlist habilitada
                      </label>
                      <span>Criado em: {formatDateTime(user.created_at)}</span>
                      <span>Último login: {formatDateTime(user.last_sign_in_at)}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => void handleSaveUser(user.user_id)}
                        disabled={actionLoadingId === user.user_id}
                        className="px-3 py-2 rounded-md bg-secondary-600 hover:bg-secondary-500 text-white inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        <Save size={16} />
                        Salvar
                      </button>
                      <button
                        onClick={() => void handleResetPassword(form.email)}
                        disabled={actionLoadingId === form.email}
                        className="px-3 py-2 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-700 inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        <KeyRound size={16} />
                        Resetar senha
                      </button>
                      <button
                        onClick={() => void handleDeleteUser(user.user_id, form.email)}
                        disabled={actionLoadingId === user.user_id}
                        className="px-3 py-2 rounded-md border border-error-300 text-error-700 hover:bg-error-50 inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
