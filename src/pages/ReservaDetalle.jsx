import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import EstadoBadge from '../components/EstadoBadge.jsx';
import Modal from '../components/Modal.jsx';
import { Button, Input, Label, Select, ErrorText } from '../components/Field.jsx';
import { fmtFecha, fmtHora, fmtTimestamp } from '../lib/format.js';
import { Icon } from '../components/Icon.jsx';

export default function ReservaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: reserva, isLoading, isError, error } = useQuery({
    queryKey: ['reserva', id],
    queryFn: async () => (await api.get(`/reservas/${id}`)).data,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(null);

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['reserva', id] });
    qc.invalidateQueries({ queryKey: ['reservas'] });
    qc.invalidateQueries({ queryKey: ['metricas'] });
  };

  const cancelarMut = useMutation({
    mutationFn: () => api.post(`/reservas/${id}/cancelar`),
    onSuccess: () => { invalidar(); setConfirmOpen(null); },
  });

  const noShowMut = useMutation({
    mutationFn: () => api.post(`/reservas/${id}/no-show`),
    onSuccess: () => { invalidar(); setConfirmOpen(null); },
  });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando…</p>;
  if (isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-rose-600">Error: {apiError(error)}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }
  if (!reserva) return null;

  const editable = reserva.estado === 'Confirmada';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/reservas" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100">
          <Icon name="arrow-left" className="h-5 w-5" />
        </Link>
        <h2 className="text-lg font-semibold text-slate-900">Reserva #{reserva.id}</h2>
        <EstadoBadge estado={reserva.estado} />
      </div>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <dl className="divide-y divide-slate-200">
          <Row label="Nombre"   value={reserva.nombre} />
          <Row label="Teléfono" value={reserva.telefono} />
          <Row label="Día"      value={fmtFecha(reserva.dia)} />
          <Row label="Horario"  value={`${fmtHora(reserva.horario_hora)} (${reserva.horario_label})`} />
          <Row label="Turno"    value={reserva.turno || '—'} />
          <Row label="Personas" value={reserva.personas} />
          <Row label="Creada"   value={fmtTimestamp(reserva.created_at)} />
          <Row label="Actualizada" value={fmtTimestamp(reserva.updated_at)} />
        </dl>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="primary"
          disabled={!editable}
          onClick={() => setEditOpen(true)}
        >
          <Icon name="edit" className="h-4 w-4" /> Editar
        </Button>
        <Button
          variant="warning"
          disabled={!editable}
          onClick={() => setConfirmOpen('noshow')}
        >
          <Icon name="alert" className="h-4 w-4" /> Marcar no-show
        </Button>
        <Button
          variant="danger"
          disabled={!editable}
          onClick={() => setConfirmOpen('cancelar')}
        >
          <Icon name="x-circle" className="h-4 w-4" /> Cancelar
        </Button>
      </div>

      {!editable && (
        <p className="text-xs text-slate-500">
          Esta reserva ya no está Confirmada, no se puede editar ni cancelar.
        </p>
      )}

      <EditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        reserva={reserva}
        onSaved={invalidar}
      />

      <ConfirmActionModal
        open={confirmOpen === 'cancelar'}
        title="Cancelar reserva"
        message="Esto marca la reserva como Cancelada y libera su mesa. ¿Continuar?"
        confirmLabel="Sí, cancelar"
        confirmVariant="danger"
        loading={cancelarMut.isPending}
        error={cancelarMut.error}
        onConfirm={() => cancelarMut.mutate()}
        onClose={() => setConfirmOpen(null)}
      />

      <ConfirmActionModal
        open={confirmOpen === 'noshow'}
        title="Marcar como no-show"
        message="Esto marca la reserva como No-show y libera su mesa. ¿Continuar?"
        confirmLabel="Sí, marcar"
        confirmVariant="warning"
        loading={noShowMut.isPending}
        error={noShowMut.error}
        onConfirm={() => noShowMut.mutate()}
        onClose={() => setConfirmOpen(null)}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ConfirmActionModal({ open, onClose, onConfirm, title, message, confirmLabel, confirmVariant = 'primary', loading, error }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-700">{message}</p>
      <ErrorText>{error ? apiError(error) : null}</ErrorText>
    </Modal>
  );
}

function EditModal({ open, onClose, reserva, onSaved }) {
  const [form, setForm] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        nombre: reserva.nombre,
        personas: reserva.personas,
        dia: reserva.dia ? String(reserva.dia).slice(0, 10) : '',
        horario: reserva.horario_hora,
      });
      setError(null);
    }
  }, [open, reserva]);

  const mut = useMutation({
    mutationFn: async () => {
      const cambios = {};
      if (form.nombre !== reserva.nombre) cambios.nombre = String(form.nombre || '').trim();
      if (Number(form.personas) !== Number(reserva.personas)) cambios.personas = Number(form.personas);
      if (form.dia && form.dia !== String(reserva.dia).slice(0, 10)) cambios.dia = form.dia;
      if (Number(form.horario) !== Number(reserva.horario_hora)) cambios.horario = Number(form.horario);
      if (Object.keys(cambios).length === 0) {
        throw new Error('No hay cambios para guardar');
      }
      const { data } = await api.patch(`/reservas/${reserva.id}`, cambios);
      return data;
    },
    onSuccess: () => { onSaved?.(); onClose(); },
    onError: (err) => {
      const code = err?.response?.data?.error;
      if (code === 'sin_disponibilidad') {
        setError('No hay mesa disponible para esa combinación de día/horario/personas.');
      } else {
        setError(apiError(err, 'No se pudo guardar'));
      }
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar reserva"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mut.isPending}>Cancelar</Button>
          <Button onClick={() => { setError(null); mut.mutate(); }} disabled={mut.isPending}>
            {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="ed-nombre">Nombre</Label>
          <Input id="ed-nombre" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ed-personas">Personas</Label>
            <Input id="ed-personas" type="number" min={1} max={50} inputMode="numeric"
              value={form.personas ?? ''}
              onChange={(e) => setForm({ ...form, personas: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="ed-horario">Hora (0–23)</Label>
            <Input id="ed-horario" type="number" min={0} max={23} inputMode="numeric"
              value={form.horario ?? ''}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ed-dia">Día</Label>
          <Input id="ed-dia" type="date" value={form.dia || ''} onChange={(e) => setForm({ ...form, dia: e.target.value })} />
        </div>
        <p className="text-xs text-slate-500">
          Los cambios se aplican uno por uno; si para alguno no hay mesa disponible, se aborta.
        </p>
        <ErrorText>{error}</ErrorText>
      </div>
    </Modal>
  );
}
