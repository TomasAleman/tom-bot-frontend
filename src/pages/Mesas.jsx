import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import Modal from '../components/Modal.jsx';
import { Button, Input, Label, ErrorText } from '../components/Field.jsx';
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

export default function Mesas() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

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
        <Button onClick={() => setEditing({ ...EMPTY_MESA })}>
          <Icon name="plus" className="h-4 w-4" /> Nueva mesa
        </Button>
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
                <li><b>Mañana:</b> {m.horario_manana || '—'}</li>
                <li><b>Mediodía:</b> {m.horario_mediodia || '—'}</li>
                <li><b>Tarde:</b> {m.horario_tarde || '—'}</li>
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
    </div>
  );
}

function MesaModal({ mesa, onClose, onSaved }) {
  const [form, setForm] = useState(mesa || {});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mesa) {
      setForm({ ...mesa });
      setError(null);
    }
  }, [mesa]);

  if (!mesa) return null;
  const isNew = !mesa.id;

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        numero_mesa: String(form.numero_mesa).trim(),
        min_personas: Number(form.min_personas),
        max_personas: Number(form.max_personas),
        horario_manana:   form.horario_manana   || null,
        horario_mediodia: form.horario_mediodia || null,
        horario_tarde:    form.horario_tarde    || null,
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
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Formato horarios: <code>desde-hasta</code> en hora 24h. Ej: <code>12-15</code>. Dejá vacío si no aplica.</p>
          <div>
            <Label htmlFor="m-mn">Mañana</Label>
            <Input id="m-mn" placeholder="ej: 8-11" value={form.horario_manana || ''}
              onChange={(e) => setForm({ ...form, horario_manana: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="m-md">Mediodía</Label>
            <Input id="m-md" placeholder="ej: 12-15" value={form.horario_mediodia || ''}
              onChange={(e) => setForm({ ...form, horario_mediodia: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="m-tr">Tarde / noche</Label>
            <Input id="m-tr" placeholder="ej: 20-23" value={form.horario_tarde || ''}
              onChange={(e) => setForm({ ...form, horario_tarde: e.target.value })} />
          </div>
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
