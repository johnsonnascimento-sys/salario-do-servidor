import { supabase } from '../../lib/supabase';

const BETA_CLOSED_MESSAGE = 'Cadastro de usuários ainda está em desenvolvimento. No momento, acesso restrito ao beta fechado.';
const DEFAULT_AUTH_REDIRECT_URL = 'https://www.salariodoservidor.com.br';
const AUTH_REDIRECT_URL = (
  window.location.hostname === 'localhost'
    ? (import.meta.env.VITE_AUTH_REDIRECT_URL || window.location.origin)
    : DEFAULT_AUTH_REDIRECT_URL
).replace(/\/$/, '');

export interface SignUpPayload {
  fullName: string;
  cpf: string;
  email: string;
  password: string;
}

export const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, '');

export const isValidCpf = (cpfRaw: string) => {
  const cpf = normalizeCpf(cpfRaw);
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const char of base) {
      total += Number(char) * factor;
      factor -= 1;
    }
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
};

export const canSignup = async (email: string, cpf: string) => {
  const { data, error } = await supabase.rpc('can_signup', {
    p_email: email.trim().toLowerCase(),
    p_cpf: normalizeCpf(cpf),
  });

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
};

export const signInUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const requestPasswordReset = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe um email válido.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: `${AUTH_REDIRECT_URL}/acesso?mode=reset`,
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const updateUserPassword = async (password: string) => {
  if (password.length < 8) {
    throw new Error('A senha deve ter ao menos 8 caracteres.');
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(error.message);
  }
};

export const signUpUser = async (payload: SignUpPayload) => {
  if (!isValidCpf(payload.cpf)) {
    throw new Error('CPF inválido. Verifique os números informados.');
  }

  const allowed = await canSignup(payload.email, payload.cpf);
  if (!allowed) {
    throw new Error(BETA_CLOSED_MESSAGE);
  }

  const email = payload.email.trim().toLowerCase();
  const cpf = normalizeCpf(payload.cpf);

  const { data, error } = await supabase.auth.signUp({
    email,
    password: payload.password,
    options: {
      emailRedirectTo: `${AUTH_REDIRECT_URL}/acesso`,
      data: {
        full_name: payload.fullName,
        cpf,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user?.id) {
    const { error: profileError } = await supabase.rpc('upsert_profile_on_signup', {
      p_user_id: data.user.id,
      p_full_name: payload.fullName,
      p_email: email,
      p_cpf: cpf,
    });

    if (profileError) {
      throw new Error(profileError.message);
    }
  }

  return data;
};

export const getBetaClosedMessage = () => BETA_CLOSED_MESSAGE;
