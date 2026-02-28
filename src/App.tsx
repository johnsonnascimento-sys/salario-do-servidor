import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import ComingSoon from './pages/ComingSoon';
import Home from './pages/Home';
import Calculator from './pages/Calculator';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminHub from './pages/AdminHub';
import AdminGlobal from './pages/AdminGlobal';
import AdminPower from './pages/AdminPower';
import AdminOrg from './pages/AdminOrg';
import AdminControlPanel from './pages/AdminControlPanel';
import AdminWiki from './pages/AdminWiki';
import ProtectedRoute from './components/ProtectedRoute';
import Donate from './pages/Donate';
import About from './pages/About';
import Privacy from './pages/Privacy';
import WikiArticlePage from './pages/WikiArticlePage';
import WikiHome from './pages/WikiHome';

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
              <AdminControlPanel />
            </ProtectedRoute>
          } />
          <Route path="/admin/hub" element={
            <ProtectedRoute>
              <AdminHub />
            </ProtectedRoute>
          } />
          <Route path="/admin/legacy" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/global" element={
            <ProtectedRoute>
              <AdminGlobal />
            </ProtectedRoute>
          } />
          <Route path="/admin/power" element={
            <ProtectedRoute>
              <AdminPower />
            </ProtectedRoute>
          } />
          <Route path="/admin/org" element={
            <ProtectedRoute>
              <AdminOrg />
            </ProtectedRoute>
          } />
          <Route path="/admin/wiki" element={
            <ProtectedRoute>
              <AdminWiki />
            </ProtectedRoute>
          } />

          {/* Rotas que USAM o MainLayout */}
          <Route element={<MainLayout />}>
            <Route path="/beta-access" element={<Home />} />
            <Route path="/simulador/:slug" element={<Calculator />} />
            <Route path="/apoiar" element={<Donate />} />
            <Route path="/quem-somos" element={<About />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/wiki" element={<WikiHome />} />
            <Route path="/wiki/:scope/:articleSlug" element={<WikiArticlePage />} />
          </Route>

          {/* Rota padrão para não encontrados */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
