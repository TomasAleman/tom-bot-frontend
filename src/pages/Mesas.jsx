import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import { Button, Input, Label, Select, ErrorText } from '../components/Field.jsx';
import { Icon } from '../components/Icon.jsx';

const EMPTY_MESA = {
  numero_mesa: '',
  min_personas: 1,
  max_personas: 4,
  horario_manana: '',
  horario_mediodia: '',
  horario_tarde: '',
  activa: true,
};

// Opciones HH:MM cada 15 minutos para los selects de turnos.
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0');
  const m = String((i % 4) * 15).padStart(2, '0');
  return `${h}:${m}`;
});

const HORARIO_REGEX = /^([01]?\d|2[0-3]):[0-5]\d-([01]?\d|2[0-3]):[0-5]\d$/;
const HORARIO_LEGACY_REGEX = /^\d{1,2}-\d{1,2}$/;

// Convierte un string "HH:MM-HH:MM" (o legacy "8-11") a { inicio, fin } en formato HH:MM.
function parseTurno(s) {
  if (!s) return { inicio: '', fin: '' };
  const trimmed = String(s).trim();
  if (HORARIO_REGEX.test(trimmed)) {
    const [ini, fin] = trimmed.split('-');
    return { inicio: ini, fin };
  }
  if (HORARIO_LEGACY_REGEX.test(trimmed)) {
    const [a, b] = trimmed.split('-');
    return {
      inicio: `${a.padStart(2, '0')}:00`,
      fin: `${b.padStart(2, '0')}:00`,
    };
  }
  return { inicio: '', fin: '' };
}

function toMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/** Mismo día: fin > inicio; cruza medianoche: fin < inicio. Inválido si son iguales. */
function turnoEsValido(iniMin, finMin) {
  return iniMin !== finMin;
}

const HELP_TURNO_TEXT =
  'El inicio es inclusivo y el fin exclusivo (ej: 20:00–23:00 admite reservas hasta las 22:45). Podés dejar turnos vacíos, pero tenés que completar al menos 1.';

function normTurno(t, label) {
  const ini = (t.inicio || '').trim();
  const fin = (t.fin || '').trim();
  if (!ini && !fin) return null;
  if (!ini || !fin) throw new Error(`${label}: completá inicio y fin, o dejá ambos vacíos.`);
  if (!turnoEsValido(toMinutos(ini), toMinutos(fin))) {
    throw new Error(`${label}: el fin del turno debe ser distinto del inicio.`);
  }
  return `${ini}-${fin}`;
}

export default function Mesas() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [bulkTurnosOpen, setBulkTurnosOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mesas'],
    queryFn: async () => (await api.get('/mesas')).data,
  });

  const desactivarMut = useMutation({
    mutationFn: (id) => api.delete(`/mesas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mesas'] }),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando mesas…</p>;
  if (isError)  return <p className="text-sm text-rose-600">Error: {apiError(error)}</p>;

  const mesas = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{mesas.length} mesas configuradas.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => setBulkTurnosOpen(true)} disabled={mesas.length === 0}>
            <Icon name="clock" className="h-4 w-4" /> Aplicar turnos a todas
          </Button>
          <Button onClick={() => setEditing({ ...EMPTY_MESA })}>
            <Icon name="plus" className="h-4 w-4" /> Nueva mesa
          </Button>
        </div>
      </div>

      {mesas.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
          Todavía no cargaste mesas.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mesas.map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${m.activa ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">Mesa</p>
                  <p className="truncate text-lg font-semibold text-slate-900">{m.numero_mesa}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-slate-900">{m.min_personas}–{m.max_personas} pers.</p>
                  <p className="text-xs text-slate-500">{m.activa ? 'Activa' : 'Inactiva'}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                <li><b>Primer turno:</b> {m.horario_manana || '—'}</li>
                <li><b>Segundo turno:</b> {m.horario_mediodia || '—'}</li>
                <li><b>Tercer turno:</b> {m.horario_tarde || '—'}</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => setEditing({ ...m })} className="flex-1">
                  <Icon name="edit" className="h-4 w-4" /> Editar
                </Button>
                {m.activa ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`¿Desactivar mesa ${m.numero_mesa}?`)) desactivarMut.mutate(m.id);
                    }}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <MesaModal
        mesa={editing}
        onClose={() => setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['mesas'] })}
      />

      <BulkTurnosModal
        open={bulkTurnosOpen}
        mesas={mesas}
        onClose={() => setBulkTurnosOpen(false)}
        onApplied={() => qc.invalidateQueries({ queryKey: ['mesas'] })}
      />
    </div>
  );
}

function BulkTurnosModal({ open, mesas, onClose, onApplied }) {
  const [turnos, setTurnos] = useState({
    manana: { inicio: '', fin: '' },
    mediodia: { inicio: '', fin: '' },
    tarde: { inicio: '', fin: '' },
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    // Por defecto: tomar el turno de la primera mesa como base (si existe).
    const base = mesas?.[0] || null;
    setTurnos({
      manana: parseTurno(base?.horario_manana),
      mediodia: parseTurno(base?.horario_mediodia),
      tarde: parseTurno(base?.horario_tarde),
    });
    setError(null);
  }, [open, mesas]);

  const setTurno = (key, parte, value) => {
    setTurnos((t) => ({ ...t, [key]: { ...t[key], [parte]: value } }));
  };

  const mut = useMutation({
    mutationFn: async () => {
      const hmN = normTurno(turnos.manana, 'Primer turno');
      const hmdN = normTurno(turnos.mediodia, 'Segundo turno');
      const htN = normTurno(turnos.tarde, 'Tercer turno');
      if (!hmN && !hmdN && !htN) throw new Error('Tenés que completar al menos 1 turno.');

      const payload = {
        horario_manana: hmN,
        horario_mediodia: hmdN,
        horario_tarde: htN,
      };

      const targets = (mesas || []).filter((m) => m?.id);
      const res = await Promise.allSettled(
        targets.map((m) => api.patch(`/mesas/${m.id}`, payload))
      );

      const failed = res.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        const firstErr = failed[0].reason;
        throw new Error(`No se pudieron actualizar ${failed.length} mesas. ${apiError(firstErr)}`);
      }
      return { ok: true, updated: targets.length };
    },
    onSuccess: () => {
      onApplied?.();
      onClose?.();
    },
    onError: (err) => setError(apiError(err, 'No se pudieron aplicar los turnos')),
  });

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aplicar turnos a todas las mesas"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
          <Button onClick={() => { setError(null); mut.mutate(); }} disabled={mut.isPending}>
            {mut.isPending ? 'Aplicando…' : 'Aplicar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Esto reemplaza los turnos de <b>todas</b> las mesas. {HELP_TURNO_TEXT}
        </p>

        <TurnoRow
          label="Primer turno"
          idPrefix="bulk-mn"
          value={turnos.manana}
          onChange={(parte, v) => setTurno('manana', parte, v)}
        />
        <TurnoRow
          label="Segundo turno"
          idPrefix="bulk-md"
          value={turnos.mediodia}
          onChange={(parte, v) => setTurno('mediodia', parte, v)}
        />
        <TurnoRow
          label="Tercer turno"
          idPrefix="bulk-tr"
          value={turnos.tarde}
          onChange={(parte, v) => setTurno('tarde', parte, v)}
        />

        <ErrorText>{error}</ErrorText>
      </div>
    </Modal>
  );
}

function MesaModal({ mesa, onClose, onSaved }) {
  const [form, setForm] = useState(mesa || {});
  const [turnos, setTurnos] = useState({
    manana:   { inicio: '', fin: '' },
    mediodia: { inicio: '', fin: '' },
    tarde:    { inicio: '', fin: '' },
  });
  const [error, setError] = useState(null);
  const isNew = !mesa?.id;

  useEffect(() => {
    if (mesa) {
      setForm({ ...mesa });
      setTurnos({
        manana:   parseTurno(mesa.horario_manana),
        mediodia: parseTurno(mesa.horario_mediodia),
        tarde:    parseTurno(mesa.horario_tarde),
      });
      setError(null);
    }
  }, [mesa]);

  const setTurno = (key, parte, value) => {
    setTurnos((t) => ({ ...t, [key]: { ...t[key], [parte]: value } }));
  };

  const mut = useMutation({
    mutationFn: async () => {
      const numeroMesa = String(form.numero_mesa ?? '').trim();
      const minPersonas = Number.parseInt(String(form.min_personas ?? ''), 10);
      const maxPersonas = Number.parseInt(String(form.max_personas ?? ''), 10);

      if (!numeroMesa) throw new Error('El número o nombre de la mesa es requerido.');
      if (!Number.isInteger(minPersonas)) throw new Error('Mín. personas debe ser un número entero.');
      if (!Number.isInteger(maxPersonas)) throw new Error('Máx. personas debe ser un número entero.');
      if (minPersonas < 0 || minPersonas > 50) throw new Error('Mín. personas debe estar entre 0 y 50.');
      if (maxPersonas < 1 || maxPersonas > 100) throw new Error('Máx. personas debe estar entre 1 y 100.');
      if (maxPersonas < minPersonas) throw new Error('Máx. personas debe ser mayor o igual a mín. personas.');

      const hmN = normTurno(turnos.manana, 'Primer turno');
      const hmdN = normTurno(turnos.mediodia, 'Segundo turno');
      const htN = normTurno(turnos.tarde, 'Tercer turno');
      if (!hmN && !hmdN && !htN) {
        throw new Error('Tenés que completar al menos 1 turno.');
      }

      const payload = {
        numero_mesa: numeroMesa,
        min_personas: minPersonas,
        max_personas: maxPersonas,
        horario_manana: hmN,
        horario_mediodia: hmdN,
        horario_tarde: htN,
        activa: Boolean(form.activa),
      };
      if (isNew) {
        return (await api.post('/mesas', payload)).data;
      }
      return (await api.patch(`/mesas/${mesa.id}`, payload)).data;
    },
    onSuccess: () => { onSaved?.(); onClose(); },
    onError: (err) => setError(apiError(err, 'No se pudo guardar')),
  });

  if (!mesa) return null;

  return (
    <Modal
      open={Boolean(mesa)}
      onClose={onClose}
      title={isNew ? 'Nueva mesa' : `Editar mesa ${mesa.numero_mesa}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
          <Button onClick={() => { setError(null); mut.mutate(); }} disabled={mut.isPending}>
            {mut.isPending ? 'Guardando…' : (isNew ? 'Crear' : 'Guardar')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="m-numero">Número o nombre</Label>
          <Input id="m-numero" value={form.numero_mesa || ''} onChange={(e) => setForm({ ...form, numero_mesa: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="m-min">Mín. personas</Label>
            <Input id="m-min" type="number" min={0} max={50} inputMode="numeric"
              value={form.min_personas}
              onChange={(e) => setForm({ ...form, min_personas: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="m-max">Máx. personas</Label>
            <Input id="m-max" type="number" min={1} max={100} inputMode="numeric"
              value={form.max_personas}
              onChange={(e) => setForm({ ...form, max_personas: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{HELP_TURNO_TEXT}</p>
          <TurnoRow
            label="Primer turno"
            idPrefix="m-mn"
            value={turnos.manana}
            onChange={(parte, v) => setTurno('manana', parte, v)}
          />
          <TurnoRow
            label="Segundo turno"
            idPrefix="m-md"
            value={turnos.mediodia}
            onChange={(parte, v) => setTurno('mediodia', parte, v)}
          />
          <TurnoRow
            label="Tercer turno"
            idPrefix="m-tr"
            value={turnos.tarde}
            onChange={(parte, v) => setTurno('tarde', parte, v)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(form.activa)}
            onChange={(e) => setForm({ ...form, activa: e.target.checked })}
            className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          Mesa activa
        </label>
        <ErrorText>{error}</ErrorText>
      </div>
    </Modal>
  );
}

function TurnoRow({ label, idPrefix, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="block text-xs text-slate-500">Inicio</span>
          <Select
            id={`${idPrefix}-ini`}
            value={value.inicio}
            onChange={(e) => onChange('inicio', e.target.value)}
          >
            <option value="">—</option>
            {TIME_OPTIONS.map((t) => (
              <option key={`${idPrefix}-ini-${t}`} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <span className="block text-xs text-slate-500">Fin</span>
          <Select
            id={`${idPrefix}-fin`}
            value={value.fin}
            onChange={(e) => onChange('fin', e.target.value)}
          >
            <option value="">—</option>
            {TIME_OPTIONS.map((t) => (
              <option key={`${idPrefix}-fin-${t}`} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
