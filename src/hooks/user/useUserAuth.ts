import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminEmail } from '../../utils/auth/admin';

export const useUserAuth = () => {
  const auth = useAuth();

  const isAdmin = useMemo(() => isAdminEmail(auth.user?.email), [auth.user?.email]);

  return {
    ...auth,
    isAuthenticated: Boolean(auth.user),
    isAdmin,
  };
};
