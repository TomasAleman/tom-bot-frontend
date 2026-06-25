import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reservas from './pages/Reservas.jsx';
import ReservaDetalle from './pages/ReservaDetalle.jsx';
import Mesas from './pages/Mesas.jsx';
import Configuracion from './pages/Configuracion.jsx';
import Sesiones from './pages/Sesiones.jsx';
import SuperadminRestaurantes from './pages/Superadmin/Restaurantes.jsx';
import SuperadminUsuarios from './pages/Superadmin/Usuarios.jsx';
import { homePathForRol, isRecepcionista } from './lib/roles.js';

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-slate-500">
      Cargando…
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, token } = useAuth();
  if (loading || (token && !isAuthenticated)) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireNotRecepcionista({ children }) {
  const { usuario } = useAuth();
  if (isRecepcionista(usuario?.rol)) return <Navigate to="/reservas" replace />;
  return children;
}

function RequireTenantContextForSuperadmin({ children }) {
  const { usuario } = useAuth();
  if (usuario?.rol === 'superadmin' && !usuario?.restaurante?.id) {
    return <Navigate to="/superadmin/restaurantes" replace />;
  }
  return children;
}

function RequireSuperadmin({ children }) {
  const { usuario } = useAuth();
  if (usuario?.rol !== 'superadmin') {
    return <Navigate to={homePathForRol(usuario?.rol, null)} replace />;
  }
  return children;
}

function DefaultHomeRedirect() {
  const { usuario } = useAuth();
  return <Navigate to={homePathForRol(usuario?.rol, null)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultHomeRedirect />} />
        <Route path="dashboard"     element={<RequireTenantContextForSuperadmin><RequireNotRecepcionista><Dashboard /></RequireNotRecepcionista></RequireTenantContextForSuperadmin>} />
        <Route path="reservas"      element={<RequireTenantContextForSuperadmin><Reservas /></RequireTenantContextForSuperadmin>} />
        <Route path="reservas/:id"  element={<RequireTenantContextForSuperadmin><ReservaDetalle /></RequireTenantContextForSuperadmin>} />
        <Route path="mesas"         element={<RequireTenantContextForSuperadmin><RequireNotRecepcionista><Mesas /></RequireNotRecepcionista></RequireTenantContextForSuperadmin>} />
        <Route path="configuracion" element={<RequireTenantContextForSuperadmin><RequireNotRecepcionista><Configuracion /></RequireNotRecepcionista></RequireTenantContextForSuperadmin>} />
        <Route path="sesiones"      element={<RequireTenantContextForSuperadmin><RequireNotRecepcionista><Sesiones /></RequireNotRecepcionista></RequireTenantContextForSuperadmin>} />

        <Route path="superadmin/restaurantes" element={<RequireSuperadmin><SuperadminRestaurantes /></RequireSuperadmin>} />
        <Route path="superadmin/usuarios" element={<RequireSuperadmin><SuperadminUsuarios /></RequireSuperadmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
