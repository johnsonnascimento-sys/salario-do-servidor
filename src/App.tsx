import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import ComingSoon from './pages/ComingSoon';
import Home from './pages/Home';
import Calculator from './pages/Calculator';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Donate from './pages/Donate';
import About from './pages/About';
import Privacy from './pages/Privacy';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Coming Soon Page (Default Landing) */}
          <Route path="/" element={<ComingSoon />} />

          {/* Redirect /home to /beta-access */}
          <Route path="/home" element={<Navigate to="/beta-access" replace />} />

          {/* Rotas de Login/Admin */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Rotas que USAM o MainLayout */}
          <Route element={<MainLayout />}>
            <Route path="/beta-access" element={<Home />} />
            <Route path="/simulador/:slug" element={<Calculator />} />
            <Route path="/apoiar" element={<Donate />} />
            <Route path="/quem-somos" element={<About />} />
            <Route path="/privacidade" element={<Privacy />} />
          </Route>

          {/* Rota padrão para não encontrados */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
