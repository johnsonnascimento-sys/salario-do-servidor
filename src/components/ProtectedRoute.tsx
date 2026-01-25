
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-600"></div>
            </div>
        );
    }

    if (!user) {
        // Redireciona para login se não houver usuário logado
        return <Navigate to="/login" replace />;
    }

    // Renderiza o conteúdo protegido se autenticado
    return <>{children}</>;
}
