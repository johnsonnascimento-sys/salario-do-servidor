import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import ComingSoon from './pages/ComingSoon';
import Home from './pages/Home';
import Calculator from './pages/Calculator';
import Login from './pages/Login';
import AdminHub from './pages/AdminHub';
import AdminGlobal from './pages/AdminGlobal';
import AdminPower from './pages/AdminPower';
import AdminOrg from './pages/AdminOrg';
import AdminUsers from './pages/AdminUsers';
import AdminRoute from './components/AdminRoute';
import UserRoute from './components/UserRoute';
import Donate from './pages/Donate';
import About from './pages/About';
import Privacy from './pages/Privacy';
import UserAccess from './pages/UserAccess';
import UserDashboard from './pages/UserDashboard';
import UserPayslipsPage from './pages/UserPayslipsPage';
import UserPayslipDetailPage from './pages/UserPayslipDetailPage';

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
          <Route path="/acesso" element={<UserAccess />} />
          <Route path="/admin" element={
            <AdminRoute>
              <Navigate to="/admin/hub" replace />
            </AdminRoute>
          } />
          <Route path="/admin/hub" element={
            <AdminRoute>
              <AdminHub />
            </AdminRoute>
          } />
          <Route path="/admin/global" element={
            <AdminRoute>
              <AdminGlobal />
            </AdminRoute>
          } />
          <Route path="/admin/power" element={
            <AdminRoute>
              <AdminPower />
            </AdminRoute>
          } />
          <Route path="/admin/org" element={
            <AdminRoute>
              <AdminOrg />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } />

          {/* Rotas que USAM o MainLayout */}
          <Route element={<MainLayout />}>
            <Route path="/beta-access" element={<Home />} />
            <Route path="/simulador/:slug" element={<Calculator />} />
            <Route path="/apoiar" element={<Donate />} />
            <Route path="/quem-somos" element={<About />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/minha-area" element={
              <UserRoute>
                <UserDashboard />
              </UserRoute>
            } />
            <Route path="/minha-area/holerites" element={
              <UserRoute>
                <UserPayslipsPage />
              </UserRoute>
            } />
            <Route path="/minha-area/holerites/:id" element={
              <UserRoute>
                <UserPayslipDetailPage />
              </UserRoute>
            } />
          </Route>

          {/* Rota padrão para não encontrados */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
