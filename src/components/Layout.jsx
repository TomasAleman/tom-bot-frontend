import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import InstallPwaTip from './InstallPwaTip.jsx';
import { useAuth } from '../lib/auth.jsx';

const TITULOS = {
  '/dashboard': 'Dashboard',
  '/reservas': 'Reservas',
  '/mesas': 'Mesas',
  '/sesiones': 'Sesiones activas',
  '/configuracion': 'Configuración',
};

function tituloPorRuta(pathname) {
  if (pathname.startsWith('/reservas/')) return 'Detalle de reserva';
  return TITULOS[pathname] || 'Panel';
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { usuario } = useAuth();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const titulo = tituloPorRuta(location.pathname);

  return (
    <div className="flex h-full bg-slate-50">
      <div className="hidden lg:block">
        <Sidebar restauranteNombre={usuario?.restaurante?.nombre} />
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 lg:hidden
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar
          onNavigate={() => setMenuOpen(false)}
          restauranteNombre={usuario?.restaurante?.nombre}
        />
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} title={titulo} />
        <main className="flex-1 overflow-y-auto safe-bottom">
          <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
            <Outlet />
          </div>
        </main>
        <InstallPwaTip />
      </div>
    </div>
  );
}
