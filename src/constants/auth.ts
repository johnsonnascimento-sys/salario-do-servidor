export const DEFAULT_AUTH_REDIRECT_URL = 'https://www.salariodoservidor.com.br';

export const getAuthRedirectUrl = () => {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL;
  const origin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_AUTH_REDIRECT_URL;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const baseUrl = hostname === 'localhost'
    ? (configured || origin)
    : (configured || DEFAULT_AUTH_REDIRECT_URL);

  return baseUrl.replace(/\/$/, '');
};
