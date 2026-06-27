import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import { Input, Button, ErrorText } from '../components/Field.jsx';
import { Icon } from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { fmtTimestamp } from '../lib/format.js';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function WalkIn() {
  const qc = useQueryClient();
  const [dia, setDia] = useState(todayIso());
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [borrarId, setBorrarId] = useState(null);

  const walkins = useQuery({
    queryKey: ['walkins', dia],
    queryFn: async () => (await api.get(`/walkins?dia=${encodeURIComponent(dia)}`)).data,
  });

  const mesasQuery = useQuery({
    queryKey: ['mesas'],
    queryFn: async () => (await api.get('/mesas')).data,
  });

  // Reservas de ese día ya marcadas "Asistencia" — solo para el aviso de mesa ocupada, no bloquea nada.
  const asistenciaHoy = useQuery({
    queryKey: ['reservas-asistencia', dia],
    queryFn: async () => (await api.get(`/reservas?dia_desde=${dia}&dia_hasta=${dia}&estado=Asistencia&page_size=200`)).data,
  });

  const mesas = mesasQuery.data?.data?.filter((m) => m.activa) || [];
  const items = walkins.data?.data || [];

  const mesasOcupadas = useMemo(() => {
    const set = new Set();
    for (const w of items) (w.mesas || []).forEach((m) => set.add(m));
    for (const r of asistenciaHoy.data?.data || []) (r.mesas || []).forEach((m) => set.add(m));
    return set;
  }, [items, asistenciaHoy.data]);

  const eliminarMut = useMutation({
    mutationFn: (id) => api.delete(`/walkins/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['walkins'] }); qc.invalidateQueries({ queryKey: ['metricas'] }); setBorrarId(null); },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label className="block text-xs font-medium text-slate-600">Día</label>
            <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="sm:w-48" />
          </div>
          <Button variant="success" onClick={() => { setEditando(null); setModalOpen(true); }}>
            <Icon name="plus" className="h-4 w-4" /> Nuevo walk-in
          </Button>
        </div>
      </div>

      {walkins.isLoading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : walkins.isError ? (
        <p className="text-sm text-rose-600">Error: {apiError(walkins.error)}</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Sin walk-ins para esta fecha.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((w) => (
            <li key={w.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{(w.mesas || []).join(', ')}</p>
                  <p className="text-xs text-slate-500">{w.personas} personas · {fmtTimestamp(w.hora_ingreso)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditando(w); setModalOpen(true); }}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Editar"
                  >
                    <Icon name="edit" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setBorrarId(w.id)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Eliminar"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <WalkInModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mesas={mesas}
        mesasOcupadas={mesasOcupadas}
        walkin={editando}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['walkins'] });
          qc.invalidateQueries({ queryKey: ['metricas'] });
          setModalOpen(false);
        }}
      />

      <Modal
        open={borrarId != null}
        onClose={() => setBorrarId(null)}
        title="Eliminar walk-in"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBorrarId(null)} disabled={eliminarMut.isPending}>Cancelar</Button>
            <Button variant="danger" onClick={() => eliminarMut.mutate(borrarId)} disabled={eliminarMut.isPending}>
              {eliminarMut.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">¿Seguro que querés eliminar este registro de walk-in?</p>
        <ErrorText>{eliminarMut.error ? apiError(eliminarMut.error) : null}</ErrorText>
      </Modal>
    </div>
  );
}

function WalkInModal({ open, onClose, mesas, mesasOcupadas, walkin, onSaved }) {
  const esEdicion = Boolean(walkin);
  const [seleccion, setSeleccion] = useState(() => new Set(walkin?.mesas || []));
  const [personas, setPersonas] = useState(walkin?.personas ?? 2);
  const [error, setError] = useState(null);

  // Reinicia el formulario cada vez que se abre (alta nueva o edición de otro walk-in).
  const keyAbierto = `${open}-${walkin?.id ?? 'nuevo'}`;
  const [ultimaKey, setUltimaKey] = useState(keyAbierto);
  if (keyAbierto !== ultimaKey) {
    setUltimaKey(keyAbierto);
    setSeleccion(new Set(walkin?.mesas || []));
    setPersonas(walkin?.personas ?? 2);
    setError(null);
  }

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { mesas: [...seleccion], personas: Number(personas) };
      if (esEdicion) {
        const { data } = await api.patch(`/walkins/${walkin.id}`, payload);
        return data;
      }
      const { data } = await api.post('/walkins', payload);
      return data;
    },
    onSuccess: () => onSaved?.(),
    onError: (err) => setError(err),
  });

  const sumMin = mesas.filter((m) => seleccion.has(m.numero_mesa)).reduce((s, m) => s + m.min_personas, 0);
  const sumMax = mesas.filter((m) => seleccion.has(m.numero_mesa)).reduce((s, m) => s + m.max_personas, 0);
  const personasNum = Number(personas || 0);
  const avisoCapacidad = seleccion.size > 0 && (personasNum < sumMin || personasNum > sumMax);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar walk-in' : 'Nuevo walk-in'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => { setError(null); mut.mutate(); }}
            disabled={mut.isPending || seleccion.size === 0 || !personasNum}
          >
            {mut.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Personas</label>
          <Input
            type="number"
            min={1}
            max={200}
            value={personas}
            onChange={(e) => setPersonas(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600">
            Mesa(s) — tildá una o varias si se juntaron
          </label>
          <ul className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {mesas.map((m) => {
              const ocupada = mesasOcupadas.has(m.numero_mesa) && !seleccion.has(m.numero_mesa);
              return (
                <li key={m.numero_mesa}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={seleccion.has(m.numero_mesa)}
                      onChange={() => {
                        setSeleccion((prev) => {
                          const next = new Set(prev);
                          if (next.has(m.numero_mesa)) next.delete(m.numero_mesa);
                          else next.add(m.numero_mesa);
                          return next;
                        });
                      }}
                    />
                    <span>
                      Mesa <strong>{m.numero_mesa}</strong>
                      {m.sector_nombre ? ` · ${m.sector_nombre}` : ''}
                      {' '}({m.min_personas}–{m.max_personas} pers.)
                    </span>
                    {ocupada && (
                      <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-600/20">
                        ya ocupada
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
            {mesas.length === 0 && <li className="text-sm text-slate-500">No hay mesas activas configuradas.</li>}
          </ul>
        </div>

        {avisoCapacidad && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            La capacidad combinada de las mesas elegidas es {sumMin}–{sumMax} personas. Podés guardar igual.
          </p>
        )}

        <ErrorText>{error ? apiError(error) : null}</ErrorText>
      </div>
    </Modal>
  );
}
