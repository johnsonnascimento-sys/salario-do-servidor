import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../hooks/user/useUserAuth';

interface UserRouteProps {
  children: React.ReactNode;
}

export default function UserRoute({ children }: UserRouteProps) {
  const { user, loading } = useUserAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-600"></div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/acesso?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
