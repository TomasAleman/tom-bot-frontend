import { useEffect, useMemo, useState } from 'react';
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

/** Admin del restaurante (migración 014); `restaurante` por compat. */
function puedeCrearReserva(rol) {
  return rol === 'admin_restaurante' || rol === 'restaurante';
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD = hoy + `dias` (en calendario local). */
function addDaysIso(dias) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultFiltrosFechas() {
  return { dia_desde: todayIso(), dia_hasta: addDaysIso(7) };
}

/** Prefijo país + móvil AR (Evolution / n8n suelen usar 549…). */
const AR_TEL_PREFIX = '549';

/** Solo dígitos que el usuario escribe después del 549; si pegan 549… o 54… se normaliza. Máx. 10 dígitos. */
function sanitizeTelefonoSuffix(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('549')) d = d.slice(3);
  else if (d.startsWith('54')) d = d.slice(2);
  return d.slice(0, 10);
}

function telefonoCompleto549(suffix) {
  const s = sanitizeTelefonoSuffix(suffix);
  if (!s) return '';
  return `${AR_TEL_PREFIX}${s}`;
}

export default function Reservas() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState(() => ({
    ...defaultFiltrosFechas(),
    estado: '',
    q: '',
    order: 'dia_asc',
  }));
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
    setFiltros({ ...defaultFiltrosFechas(), estado: '', q: '', order: 'dia_asc' });
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
          {puedeCrearReserva(usuario?.rol) && (
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
                <option value="NoShow">No vino</option>
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
                  {Array.isArray(r.mesas) && r.mesas.length > 1 && (
                    <p className="mt-1 text-xs text-slate-500">Mesas: {r.mesas.join(' + ')}</p>
                  )}
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
                    <th className="px-4 py-3 text-left">Mesas</th>
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
                      <td className="px-4 py-3 text-slate-600">
                        {Array.isArray(r.mesas) && r.mesas.length ? r.mesas.join(' + ') : (r.numero_mesa || '—')}
                      </td>
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
  const [junteSel, setJunteSel] = useState([]);
  const [juntePasoActivo, setJuntePasoActivo] = useState(false);
  const [mesaGrandeElegida, setMesaGrandeElegida] = useState('');
  const [mesaGrandePasoActivo, setMesaGrandePasoActivo] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({ dia: todayIso(), personas: 2, horario: '', telefono: '', nombre: '' });
    setJunteSel([]);
    setJuntePasoActivo(false);
    setMesaGrandeElegida('');
    setMesaGrandePasoActivo(false);
    setError(null);
  }, [open]);

  const esAdmin = puedeCrearReserva(usuario?.rol);
  const telefonoSuffixOk = sanitizeTelefonoSuffix(form.telefono).length === 10;
  const dia = form.dia;
  const personas = Number(form.personas || 0);
  const horarioMin = form.horario !== '' && form.horario != null ? Number(form.horario) : null;
  const canFetch = Boolean(open && dia && personas >= 1);
  const canFetchMesas = Boolean(open && esAdmin && dia && horarioMin != null && Number.isFinite(horarioMin));

  const disp = useQuery({
    queryKey: ['reservas-disponibilidad', dia, personas],
    enabled: canFetch,
    queryFn: async () => (await api.get(`/reservas/disponibilidad?dia=${encodeURIComponent(dia)}&personas=${encodeURIComponent(String(personas))}`)).data,
  });

  const mesasLibres = useQuery({
    queryKey: ['reservas-mesas-libres', dia, horarioMin],
    enabled: canFetchMesas,
    queryFn: async () => (await api.get(`/reservas/disponibilidad/mesas-libres?dia=${encodeURIComponent(dia)}&horario=${encodeURIComponent(String(horarioMin))}`)).data,
  });

  const horarios = disp.data?.horarios || [];
  const libres = mesasLibres.data?.mesas || [];

  const canSingle = useMemo(
    () => libres.some((m) => personas >= m.min_personas && personas <= m.max_personas),
    [libres, personas],
  );
  const sumMaxLibres = useMemo(() => libres.reduce((s, m) => s + m.max_personas, 0), [libres]);
  const minMin = useMemo(
    () => (libres.length ? Math.min(...libres.map((m) => m.min_personas)) : 0),
    [libres],
  );
  const maxMax = useMemo(
    () => (libres.length ? Math.max(...libres.map((m) => m.max_personas)) : 0),
    [libres],
  );
  /** Grupo mayor al máximo de una sola mesa libre: juntar ≥2 mesas si la suma de máximos alcanza. */
  const ofrecerJunte =
    esAdmin &&
    canFetchMesas &&
    mesasLibres.isSuccess &&
    libres.length >= 2 &&
    !canSingle &&
    personas > maxMax &&
    sumMaxLibres >= personas;
  /** Grupo menor al mínimo de las mesas libres: elegir una mesa con cupo max ≥ personas (sin exigir mínimo). */
  const seleccionarMesaGrande =
    esAdmin &&
    canFetchMesas &&
    mesasLibres.isSuccess &&
    libres.length >= 1 &&
    !canSingle &&
    personas < minMin &&
    libres.some((m) => personas <= m.max_personas);

  const selModels = useMemo(
    () => libres.filter((m) => junteSel.includes(m.numero_mesa)),
    [libres, junteSel],
  );
  const sumMinSel = selModels.reduce((s, m) => s + m.min_personas, 0);
  const sumMaxSel = selModels.reduce((s, m) => s + m.max_personas, 0);
  const junteValido = junteSel.length >= 2 && personas >= sumMinSel && personas <= sumMaxSel;

  const resetJunte = () => {
    setJunteSel([]);
    setJuntePasoActivo(false);
  };
  const resetMesaGrande = () => {
    setMesaGrandeElegida('');
    setMesaGrandePasoActivo(false);
  };

  const crearMut = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!esAdmin) throw new Error('No tenés permisos para crear reservas');
      const payload = {
        dia: String(form.dia || ''),
        personas: Number(form.personas),
        horario: Number(form.horario),
        telefono: telefonoCompleto549(form.telefono),
        nombre: String(form.nombre || '').trim(),
      };
      if (juntePasoActivo && junteValido) {
        payload.mesas = [...junteSel].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      } else if (seleccionarMesaGrande && mesaGrandePasoActivo && mesaGrandeElegida) {
        payload.numero_mesa = mesaGrandeElegida;
      }
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
          <Button
            variant="primary"
            onClick={() => crearMut.mutate()}
            disabled={
              crearMut.isPending
              || !form.horario
              || !telefonoSuffixOk
              || (ofrecerJunte && (!juntePasoActivo || !junteValido))
              || (seleccionarMesaGrande && (!mesaGrandePasoActivo || !mesaGrandeElegida))
            }
          >
            {crearMut.isPending ? 'Creando…' : 'Crear'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Día</label>
            <Input
              type="date"
              value={form.dia}
              onChange={(e) => {
                setForm((f) => ({ ...f, dia: e.target.value, horario: '' }));
                resetJunte();
                resetMesaGrande();
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Personas</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.personas}
              onChange={(e) => {
                setForm((f) => ({ ...f, personas: e.target.value, horario: '' }));
                resetJunte();
                resetMesaGrande();
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">Horarios disponibles</label>
          {disp.isLoading ? (
            <p className="text-xs text-slate-500">Cargando disponibilidad…</p>
          ) : disp.isError ? (
            <p className="text-xs text-rose-600">Error: {apiError(disp.error)}</p>
          ) : (
            <Select
              value={form.horario}
              onChange={(e) => {
                setForm((f) => ({ ...f, horario: e.target.value }));
                resetJunte();
                resetMesaGrande();
              }}
            >
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

        {seleccionarMesaGrande && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
            <p className="mb-2">
              Las mesas libres en este horario tienen un mínimo de {minMin} personas; con {personas} podés reservar
              en una mesa más grande (se respeta el máximo de cada mesa).
            </p>
            {!mesaGrandePasoActivo ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMesaGrandePasoActivo(true);
                  setMesaGrandeElegida('');
                  resetJunte();
                }}
              >
                Seleccionar mesa
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium">Elegí una mesa (cupo máximo ≥ {personas} pers.)</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {libres
                    .filter((m) => personas <= m.max_personas)
                    .map((m) => (
                      <li key={m.numero_mesa}>
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="radio"
                            name="mesa-grande"
                            checked={mesaGrandeElegida === m.numero_mesa}
                            onChange={() => setMesaGrandeElegida(m.numero_mesa)}
                          />
                          <span>
                            Mesa <strong>{m.numero_mesa}</strong> ({m.min_personas}–{m.max_personas} pers.)
                          </span>
                        </label>
                      </li>
                    ))}
                </ul>
                <Button type="button" variant="secondary" className="text-xs" onClick={() => { resetMesaGrande(); }}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        {ofrecerJunte && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="mb-2">Tu grupo supera el máximo de la mesa más grande disponible ({maxMax} pers.), pero hay cupo juntando mesas.</p>
            {!juntePasoActivo ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setJuntePasoActivo(true);
                  setJunteSel([]);
                  resetMesaGrande();
                }}
              >
                Juntar mesas
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium">Seleccioná las mesas libres (mínimo 2) hasta cubrir {personas} personas (entre suma de mínimos y máximos).</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {libres.map((m) => (
                    <li key={m.numero_mesa}>
                      <label className="flex cursor-pointer items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={junteSel.includes(m.numero_mesa)}
                          onChange={() => {
                            setJunteSel((prev) => (
                              prev.includes(m.numero_mesa)
                                ? prev.filter((x) => x !== m.numero_mesa)
                                : [...prev, m.numero_mesa]
                            ));
                          }}
                        />
                        <span>
                          Mesa <strong>{m.numero_mesa}</strong> ({m.min_personas}–{m.max_personas} pers.)
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-slate-700">
                  Seleccionadas: {junteSel.length} · cupo {sumMinSel}–{sumMaxSel} pers.
                  {juntePasoActivo && junteSel.length >= 2 && (personas < sumMinSel || personas > sumMaxSel) && (
                    <span className="block text-rose-700">Ajustá la selección: necesitás entre {sumMinSel} y {sumMaxSel} personas con esas mesas.</span>
                  )}
                </p>
                <Button type="button" variant="secondary" className="text-xs" onClick={() => { resetJunte(); }}>
                  Cancelar junte
                </Button>
              </div>
            )}
          </div>
        )}

        {!canSingle && mesasLibres.isSuccess && canFetchMesas && !ofrecerJunte && !seleccionarMesaGrande && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
            No hay combinación válida de mesas para este horario y cantidad de personas.
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600">Teléfono</label>
            <div
              className="flex w-full overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm
                focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900"
            >
              <span
                className="flex shrink-0 select-none items-center border-r border-slate-300 bg-slate-50 px-3 py-3
                  text-base font-medium tabular-nums text-slate-800"
                aria-hidden
              >
                {AR_TEL_PREFIX}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel-national"
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-base outline-none
                  placeholder:text-slate-400"
                value={form.telefono}
                onChange={(e) => {
                  const next = sanitizeTelefonoSuffix(e.target.value);
                  setForm((f) => ({ ...f, telefono: next }));
                }}
                placeholder="1123456789"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Código de área y número: exactamente 10 dígitos (sin el 549). Sin 0 inicial del área si no corresponde.
            </p>
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
