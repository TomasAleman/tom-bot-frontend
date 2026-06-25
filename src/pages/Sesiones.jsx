import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Input, Select, Button } from '../components/Field.jsx';
import { Icon } from '../components/Icon.jsx';
import SesionTimelineModal from '../components/SesionTimelineModal.jsx';
import { fmtTimestamp } from '../lib/format.js';

const PAGE_SIZE = 30;

function esAdminRestaurante(rol) {
  return rol === 'admin_restaurante' || rol === 'restaurante';
}

function ModoHumanoToggle({ sesion }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (activo) => api.patch(`/sesiones/${encodeURIComponent(sesion.telefono)}/modo-humano`, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sesiones'] }),
  });
  const activo = sesion.modo_humano;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={mut.isPending}
      onClick={(e) => { e.stopPropagation(); mut.mutate(!activo); }}
      className="flex items-center gap-2 disabled:opacity-50"
    >
      <span className={`text-xs font-medium ${activo ? 'text-violet-800' : 'text-slate-500'}`}>Modo persona</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          activo ? 'bg-violet-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            activo ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function Sesiones() {
  const { usuario } = useAuth();
  const puedeModoHumano = esAdminRestaurante(usuario?.rol);

  const [q, setQ] = useState('');
  const [bloqueadas, setBloqueadas] = useState('');
  const [page, setPage] = useState(1);
  const [sesionAbierta, setSesionAbierta] = useState(null);

  const queryParams = (() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (bloqueadas) p.set('bloqueadas', bloqueadas);
    p.set('page', String(page));
    p.set('page_size', String(PAGE_SIZE));
    return p.toString();
  })();

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['sesiones', queryParams],
    queryFn: async () => (await api.get(`/sesiones?${queryParams}`)).data,
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
  });

  const items = useMemo(
    () => Array.from(new Map((data?.data || []).map((s) => [s.telefono, s])).values()),
    [data]
  );
  const total = data?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <Input placeholder="Buscar por teléfono…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={bloqueadas} onChange={(e) => { setBloqueadas(e.target.value); setPage(1); }} className="sm:w-48">
            <option value="">Todas</option>
            <option value="si">Solo bloqueadas</option>
            <option value="no">Sin bloqueo</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando sesiones…</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">Error: {apiError(error)}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Sin sesiones activas.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.telefono} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSesionAbierta(s)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">{s.telefono}</p>
                    <p className="text-xs text-slate-500">
                      Último msg: {fmtTimestamp(s.ultimo_mensaje_at)} · {s.contador_mensajes} mensajes
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {s.bloqueo_hasta && new Date(s.bloqueo_hasta) > new Date() ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-600/20">
                        Bloqueada
                      </span>
                    ) : null}
                    {puedeModoHumano ? (
                      <ModoHumanoToggle sesion={s} />
                    ) : s.modo_humano ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-600/20">
                        🧑 Modo persona
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <nav className="flex items-center justify-between gap-2 pt-2 text-sm">
            <span className="text-slate-500">
              {isFetching ? 'Actualizando… ' : ''}{total} sesiones · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
              <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
            </div>
          </nav>
        </>
      )}

      <SesionTimelineModal sesion={sesionAbierta} onClose={() => setSesionAbierta(null)} />
    </div>
  );
}
