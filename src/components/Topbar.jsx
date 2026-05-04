import { useAuth } from '../lib/auth.jsx';
import { Icon } from './Icon.jsx';

export default function Topbar({ onOpenMenu, title }) {
  const { usuario, logout } = useAuth();
  const nombre = usuario?.nombre || usuario?.email || '';
  const initials = nombre
    ? nombre.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : '·';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur safe-top">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Icon name="menu" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{title}</h1>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-900">{usuario?.nombre || usuario?.email}</p>
            <p className="text-xs text-slate-500">{usuario?.restaurante?.nombre}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {initials}
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Cerrar sesión"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
        >
          <Icon name="logout" />
        </button>
      </div>
    </header>
  );
}
