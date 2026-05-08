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

function isRecepcionista(rol) {
  return rol === 'recepcionista' || rol === 'staff';
}

function RequireNotRecepcionista({ children }) {
  const { usuario } = useAuth();
  if (isRecepcionista(usuario?.rol)) return <Navigate to="/reservas" replace />;
  return children;
}

function RequireSuperadmin({ children }) {
  const { usuario } = useAuth();
  if (usuario?.rol !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return children;
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="reservas"      element={<Reservas />} />
        <Route path="reservas/:id"  element={<ReservaDetalle />} />
        <Route path="mesas"         element={<RequireNotRecepcionista><Mesas /></RequireNotRecepcionista>} />
        <Route path="configuracion" element={<RequireNotRecepcionista><Configuracion /></RequireNotRecepcionista>} />
        <Route path="sesiones"      element={<RequireNotRecepcionista><Sesiones /></RequireNotRecepcionista>} />

        <Route path="superadmin/restaurantes" element={<RequireSuperadmin><SuperadminRestaurantes /></RequireSuperadmin>} />
        <Route path="superadmin/usuarios" element={<RequireSuperadmin><SuperadminUsuarios /></RequireSuperadmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
