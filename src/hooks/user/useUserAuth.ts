import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAdminAccessStatus } from '../../services/auth/adminAccessService';

export const useUserAuth = () => {
  const auth = useAuth();
  const { user } = auth;
  const [adminAccess, setAdminAccess] = useState<{ user: NonNullable<typeof user>; allowed: boolean } | null>(null);

  useEffect(() => {
    if (!user) {
      setAdminAccess(null);
      return;
    }

    let active = true;
    getAdminAccessStatus()
      .then((allowed) => {
        if (active) setAdminAccess({ user, allowed });
      })
      .catch(() => {
        if (active) setAdminAccess({ user, allowed: false });
      });

    return () => {
      active = false;
    };
  }, [user]);

  const currentAccess = adminAccess?.user === user ? adminAccess : null;

  return {
    ...auth,
    isAuthenticated: Boolean(user),
    isAdmin: currentAccess?.allowed ?? false,
    loading: auth.loading || (Boolean(user) && !currentAccess),
  };
};
