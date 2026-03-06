import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUserAuth } from '../hooks/user/useUserAuth';
import {
  getBetaClosedMessage,
  isValidCpf,
  requestPasswordReset,
  signInUser,
  signUpUser,
  updateUserPassword,
} from '../services/auth/userAuthService';

const maskCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

type AccessMode = 'login' | 'signup' | 'forgot' | 'reset';

export default function UserAccess() {
  const { session, loading: authLoading } = useUserAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => searchParams.get('redirect') || '/minha-area', [searchParams]);
  const isInitialResetMode = searchParams.get('mode') === 'reset';

  const [mode, setMode] = useState<AccessMode>(isInitialResetMode ? 'reset' : 'login');
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(isInitialResetMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');

  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  React.useEffect(() => {
    if (session && !authLoading && !isRecoveryFlow) {
      navigate(redirectTo, { replace: true });
    }
  }, [session, authLoading, navigate, redirectTo, isRecoveryFlow]);

  React.useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    if (hashParams.get('type') === 'recovery') {
      setIsRecoveryFlow(true);
      setMode('reset');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
        setMode('reset');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await signInUser(loginEmail, loginPassword);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = (err as Error).message;
      if (message.includes('Invalid login credentials')) {
        setError('Email ou senha inválidos.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError('Informe seu nome completo.');
      return;
    }

    if (!isValidCpf(cpf)) {
      setError('CPF inválido.');
      return;
    }

    if (signupPassword.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres.');
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);

    try {
      await signUpUser({
        fullName: fullName.trim(),
        cpf,
        email: signupEmail,
        password: signupPassword,
      });

      setSuccess('Conta criada. Confirme seu email para entrar.');
      setMode('login');
      setLoginEmail(signupEmail.trim().toLowerCase());
      setLoginPassword('');
    } catch (err) {
      const message = (err as Error).message;
      if (message.toLowerCase().includes('beta fechado') || message.toLowerCase().includes('nao autorizado')) {
        setError(getBetaClosedMessage());
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await requestPasswordReset(forgotEmail);
      setSuccess('Enviamos um link para redefinição de senha no seu email.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('A senha deve ter ao menos 8 caracteres.');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      await updateUserPassword(newPassword);
      setSuccess('Senha redefinida com sucesso. Faça login com a nova senha.');
      setIsRecoveryFlow(false);
      setMode('login');
      setLoginPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      window.history.replaceState(null, '', '/acesso');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white">
      <header className="p-6">
        <Link to="/beta-access" className="inline-flex items-center gap-2 text-neutral-300 hover:text-white">
          <ArrowLeft size={16} /> Voltar
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8">
          <h1 className="text-h3 font-bold mb-2">Minha Área</h1>
          <p className="text-neutral-300 text-body mb-6">Acesse seus holerites salvos e exporte quando quiser.</p>

          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-800/70 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded-lg py-2 text-body font-semibold ${mode === 'login' || mode === 'forgot' || mode === 'reset' ? 'bg-white text-neutral-900' : 'text-neutral-300'}`}
            >
              <span className="inline-flex items-center gap-2"><LogIn size={16} /> Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-lg py-2 text-body font-semibold ${mode === 'signup' ? 'bg-white text-neutral-900' : 'text-neutral-300'}`}
            >
              <span className="inline-flex items-center gap-2"><UserPlus size={16} /> Cadastrar</span>
            </button>
          </div>

          {mode === 'signup' && (
            <div className="mb-4 rounded-xl border border-warning-400/40 bg-warning-500/10 p-3 text-warning-100 text-body-xs">
              Cadastro em desenvolvimento: acesso liberado somente para beta fechado no momento.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-error-400/40 bg-error-500/10 p-3 text-error-200 text-body-xs inline-flex gap-2 items-start">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-success-400/40 bg-success-500/10 p-3 text-success-200 text-body-xs">
              {success}
            </div>
          )}

          {(mode === 'login' || mode === 'forgot' || mode === 'reset') ? (
            mode === 'forgot' ? (
              <form className="space-y-4" onSubmit={handleForgotPassword}>
                <div>
                  <label className="text-body-xs text-neutral-300">Email da conta</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-secondary-600 hover:bg-secondary-500 p-3 font-semibold disabled:opacity-60"
                >
                  {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full rounded-xl border border-neutral-600 p-3 font-semibold text-neutral-200 hover:bg-neutral-800"
                >
                  Voltar para login
                </button>
              </form>
            ) : mode === 'reset' ? (
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div>
                  <label className="text-body-xs text-neutral-300">Nova senha</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                  />
                </div>
                <div>
                  <label className="text-body-xs text-neutral-300">Confirmar nova senha</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-secondary-600 hover:bg-secondary-500 p-3 font-semibold disabled:opacity-60"
                >
                  {loading ? 'Redefinindo...' : 'Definir nova senha'}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="text-body-xs text-neutral-300">Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                  />
                </div>
                <div>
                  <label className="text-body-xs text-neutral-300">Senha</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-secondary-600 hover:bg-secondary-500 p-3 font-semibold disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setForgotEmail(loginEmail);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="w-full text-body-xs text-neutral-300 hover:text-white underline"
                >
                  Esqueci minha senha
                </button>
              </form>
            )
          ) : (
            <form className="space-y-4" onSubmit={handleSignup}>
              <div>
                <label className="text-body-xs text-neutral-300">Nome completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                />
              </div>
              <div>
                <label className="text-body-xs text-neutral-300">CPF</label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="text-body-xs text-neutral-300">Email</label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                />
              </div>
              <div>
                <label className="text-body-xs text-neutral-300">Senha</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                />
              </div>
              <div>
                <label className="text-body-xs text-neutral-300">Confirmar senha</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupPasswordConfirm}
                  onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-900/70 p-3"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-secondary-600 hover:bg-secondary-500 p-3 font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <KeyRound size={16} />
                {loading ? 'Criando conta...' : 'Cadastrar'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
