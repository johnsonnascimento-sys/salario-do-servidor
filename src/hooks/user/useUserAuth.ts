import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminAccessStatus } from '../../services/auth/adminAccessService';

export const useUserAuth = () => {
  const auth = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!auth.user) {
      setIsAdmin(false);
      setAdminLoading(false);
      return () => {
        active = false;
      };
    }

    setAdminLoading(true);
    getAdminAccessStatus()
      .then((value) => {
        if (!active) return;
        setIsAdmin(value);
      })
      .catch(() => {
        if (!active) return;
        setIsAdmin(false);
      })
      .finally(() => {
        if (!active) return;
        setAdminLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth.user]);

  return {
    ...auth,
    isAuthenticated: Boolean(auth.user),
    isAdmin,
    loading: auth.loading || adminLoading,
  };
};
