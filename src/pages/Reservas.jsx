import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import EstadoBadge from '../components/EstadoBadge.jsx';
import { Input, Select, Button } from '../components/Field.jsx';
import { Icon } from '../components/Icon.jsx';
import { fmtFechaCorta, fmtHora } from '../lib/format.js';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../lib/auth.jsx';

const PAGE_SIZE = 20;

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function Reservas() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({
    dia_desde: todayIso(),
    dia_hasta: '',
    estado: '',
    q: '',
    order: 'dia_asc',
  });
  const [page, setPage] = useState(1);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [crearOpen, setCrearOpen] = useState(false);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filtros.dia_desde) p.set('dia_desde', filtros.dia_desde);
    if (filtros.dia_hasta) p.set('dia_hasta', filtros.dia_hasta);
    if (filtros.estado)    p.set('estado', filtros.estado);
    if (filtros.q)         p.set('q', filtros.q);
    if (filtros.order)     p.set('order', filtros.order);
    p.set('page', String(page));
    p.set('page_size', String(PAGE_SIZE));
    return p.toString();
  }, [filtros, page]);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['reservas', queryParams],
    queryFn: async () => (await api.get(`/reservas?${queryParams}`)).data,
    placeholderData: keepPreviousData,
  });

  const aplicar = (next) => {
    setFiltros((f) => ({ ...f, ...next }));
    setPage(1);
  };
  const limpiar = () => {
    setFiltros({ dia_desde: '', dia_hasta: '', estado: '', q: '', order: 'dia_asc' });
    setPage(1);
  };

  const items = useMemo(
    () => Array.from(new Map((data?.data || []).map((r) => [r.id, r])).values()),
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
            <Input
              placeholder="Buscar por nombre o teléfono…"
              value={filtros.q}
              onChange={(e) => aplicar({ q: e.target.value })}
              className="pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltrosOpen((s) => !s)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            <Icon name="settings" className="h-4 w-4" />
            Filtros {filtrosOpen ? '▾' : '▸'}
          </button>
          {usuario?.rol === 'restaurante' && (
            <Button variant="primary" onClick={() => setCrearOpen(true)}>
              <Icon name="plus" className="h-4 w-4" /> Crear reserva
            </Button>
          )}
        </div>

        {filtrosOpen && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Desde</label>
              <Input type="date" value={filtros.dia_desde} onChange={(e) => aplicar({ dia_desde: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Hasta</label>
              <Input type="date" value={filtros.dia_hasta} onChange={(e) => aplicar({ dia_hasta: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Estado</label>
              <Select value={filtros.estado} onChange={(e) => aplicar({ estado: e.target.value })}>
                <option value="">Todos</option>
                <option value="Confirmada">Confirmada</option>
                <option value="Cancelada">Cancelada</option>
                <option value="NoShow">No-show</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Orden</label>
              <Select value={filtros.order} onChange={(e) => aplicar({ order: e.target.value })}>
                <option value="dia_asc">Día (más cercano primero)</option>
                <option value="dia_desc">Día (más lejano primero)</option>
                <option value="creada_desc">Recién creadas</option>
              </Select>
            </div>
            <div className="sm:col-span-2 md:col-span-4">
              <Button variant="secondary" onClick={limpiar}>Limpiar filtros</Button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Cargando reservas…</p>
      ) : isError ? (
        <p className="text-sm text-rose-600">Error: {apiError(error)}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Sin resultados con los filtros actuales.
        </p>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {items.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/reservas/${r.id}`}
                  className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{r.nombre}</p>
                      <p className="text-xs text-slate-500">{r.telefono}</p>
                    </div>
                    <EstadoBadge estado={r.estado} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-900">{fmtFechaCorta(r.dia)} · {fmtHora(r.horario_hora)}</span>
                    <span className="text-slate-600">{r.personas} pers.</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Teléfono</th>
                    <th className="px-4 py-3 text-left">Día</th>
                    <th className="px-4 py-3 text-left">Hora</th>
                    <th className="px-4 py-3 text-left">Personas</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.nombre}</td>
                      <td className="px-4 py-3 text-slate-700">{r.telefono}</td>
                      <td className="px-4 py-3 text-slate-700">{fmtFechaCorta(r.dia)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmtHora(r.horario_hora)}</td>
                      <td className="px-4 py-3 text-slate-700">{r.personas}</td>
                      <td className="px-4 py-3"><EstadoBadge estado={r.estado} /></td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/reservas/${r.id}`} className="text-sm font-medium text-slate-700 hover:underline">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <nav className="flex items-center justify-between gap-2 pt-2 text-sm">
            <span className="text-slate-500">
              {isFetching ? 'Actualizando… ' : ''}{total} resultados · página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </nav>
        </>
      )}

      <CrearReservaModal
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
        onCreated={(reserva) => {
          setCrearOpen(false);
          qc.invalidateQueries({ queryKey: ['reservas'] });
          qc.invalidateQueries({ queryKey: ['metricas'] });
          if (reserva?.id) navigate(`/reservas/${reserva.id}`);
        }}
      />
    </div>
  );
}

function CrearReservaModal({ open, onClose, onCreated }) {
  const { usuario } = useAuth();
  const [form, setForm] = useState({ dia: todayIso(), personas: 2, horario: '', telefono: '', nombre: '' });
  const [error, setError] = useState(null);

  const dia = form.dia;
  const personas = Number(form.personas || 0);
  const canFetch = Boolean(open && dia && personas >= 1);

  const disp = useQuery({
    queryKey: ['reservas-disponibilidad', dia, personas],
    enabled: canFetch,
    queryFn: async () => (await api.get(`/reservas/disponibilidad?dia=${encodeURIComponent(dia)}&personas=${encodeURIComponent(String(personas))}`)).data,
  });

  const horarios = disp.data?.horarios || [];

  const crearMut = useMutation({
    mutationFn: async () => {
      setError(null);
      if (usuario?.rol !== 'restaurante') throw new Error('No tenés permisos para crear reservas');
      const payload = {
        dia: String(form.dia || ''),
        personas: Number(form.personas),
        horario: Number(form.horario),
        telefono: String(form.telefono || '').trim(),
        nombre: String(form.nombre || '').trim(),
      };
      const res = await api.post('/reservas', payload);
      return res.data;
    },
    onSuccess: (data) => {
      onCreated?.(data?.reserva);
    },
    onError: (e) => setError(e),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear reserva"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={crearMut.isPending}>Cancelar</Button>
          <Button variant="primary" onClick={() => crearMut.mutate()} disabled={crearMut.isPending || !form.horario}>
            {crearMut.isPending ? 'Creando…' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Día</label>
            <Input type="date" value={form.dia} onChange={(e) => setForm((f) => ({ ...f, dia: e.target.value, horario: '' }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Personas</label>
            <Input type="number" min={1} max={50} value={form.personas} onChange={(e) => setForm((f) => ({ ...f, personas: e.target.value, horario: '' }))} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Horarios disponibles</label>
          {disp.isLoading ? (
            <p className="text-xs text-slate-500">Cargando disponibilidad…</p>
          ) : disp.isError ? (
            <p className="text-xs text-rose-600">Error: {apiError(disp.error)}</p>
          ) : (
            <Select value={form.horario} onChange={(e) => setForm((f) => ({ ...f, horario: e.target.value }))}>
              <option value="">Elegí un horario…</option>
              {horarios.map((h) => (
                <option key={h.valor} value={h.valor}>{h.label}</option>
              ))}
            </Select>
          )}
          {!disp.isLoading && !disp.isError && canFetch && horarios.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No hay horarios disponibles para esa fecha y cantidad de personas.</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Teléfono</label>
            <Input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} placeholder="Ej: 11 2345-6789" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Nombre</label>
            <Input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre y apellido" />
          </div>
        </div>

        {error && <p className="text-xs text-rose-600">Error: {apiError(error)}</p>}
        {disp.data?.turnos?.length ? (
          <p className="text-xs text-slate-500">Turnos: {disp.data.turnos.join(' · ')}</p>
        ) : null}
      </div>
    </Modal>
  );
}
