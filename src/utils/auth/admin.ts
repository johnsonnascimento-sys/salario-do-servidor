const DEFAULT_ADMIN_EMAILS = [
  'johnson.nascimento@gmail.com',
  'admin@salariodoservidor.com.br',
];

const normalize = (email: string) => email.trim().toLowerCase();

export const getAdminAllowlist = (): Set<string> => {
  const fromEnv = (import.meta.env.VITE_ADMIN_EMAIL_ALLOWLIST || '')
    .split(',')
    .map(normalize)
    .filter(Boolean);

  const merged = new Set<string>([...DEFAULT_ADMIN_EMAILS, ...fromEnv]);
  return merged;
};

export const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  return getAdminAllowlist().has(normalize(email));
};

