import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import { Input, Select, Button } from '../components/Field.jsx';
import { Icon } from '../components/Icon.jsx';
import { fmtTimestamp } from '../lib/format.js';

const PAGE_SIZE = 30;

export default function Sesiones() {
  const [q, setQ] = useState('');
  const [bloqueadas, setBloqueadas] = useState('');
  const [page, setPage] = useState(1);
  const [openTel, setOpenTel] = useState(null);

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
              <li key={s.telefono}>
                <button
                  type="button"
                  onClick={() => setOpenTel(openTel === s.telefono ? null : s.telefono)}
                  className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{s.telefono}</p>
                      <p className="text-xs text-slate-500">
                        Último msg: {fmtTimestamp(s.ultimo_mensaje_at)} · {s.contador_mensajes} mensajes
                      </p>
                    </div>
                    {s.bloqueo_hasta && new Date(s.bloqueo_hasta) > new Date() ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-600/20">
                        Bloqueada
                      </span>
                    ) : null}
                  </div>
                  {openTel === s.telefono && (
                    <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
{JSON.stringify(s.contexto_reserva, null, 2)}
                    </pre>
                  )}
                </button>
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
    </div>
  );
}
