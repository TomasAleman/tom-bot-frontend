import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Icon } from './Icon.jsx';
import AppLogo from './AppLogo.jsx';
import { isRecepcionista, isJefe } from '../lib/roles.js';

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',  icon: 'dashboard' },
  { to: '/reservas',      label: 'Reservas',   icon: 'list' },
  { to: '/walkin',        label: 'Walk-in',    icon: 'users' },
  { to: '/mesas',         label: 'Mesas',      icon: 'tables' },
  { to: '/sesiones',      label: 'Sesiones',   icon: 'chat' },
  { to: '/configuracion', label: 'Config',     icon: 'settings' },
];

const SUPERADMIN_ITEMS = [
  { to: '/superadmin/restaurantes', label: 'Restaurantes', icon: 'tables' },
  { to: '/superadmin/usuarios', label: 'Usuarios', icon: 'chat' },
];

export default function Sidebar({ onNavigate, restauranteNombre, rol, hasTenantContext }) {
  let items = NAV_ITEMS;
  if (rol === 'superadmin' && !hasTenantContext) {
    items = SUPERADMIN_ITEMS;
  } else if (isRecepcionista(rol)) {
    items = NAV_ITEMS.filter((it) => ['/reservas', '/walkin'].includes(it.to));
  } else if (isJefe(rol)) {
    items = NAV_ITEMS.filter((it) => it.to === '/dashboard');
  }

  return (
    <aside className="flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white safe-left">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <AppLogo size={40} className="h-10 w-10 flex-shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">Mesa Llena</p>
          <p className="truncate text-xs text-slate-500">
            {rol === 'superadmin' && !hasTenantContext
              ? 'Superadmin'
              : isJefe(rol)
                ? 'Jefe multi-sucursal'
                : (restauranteNombre || '—')}
          </p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'mb-1 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition',
                'min-h-11',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              )
            }
          >
            <Icon name={it.icon} className="h-5 w-5" />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-400 safe-bottom">
        v0.1 · tom-bot
      </div>
    </aside>
  );
}
