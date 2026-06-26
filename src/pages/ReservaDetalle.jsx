import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import EstadoBadge from '../components/EstadoBadge.jsx';
import Modal from '../components/Modal.jsx';
import { Button, Input, Label, Select, ErrorText } from '../components/Field.jsx';
import { fmtFecha, fmtHora, fmtTimestamp, fmtMesasReserva } from '../lib/format.js';
import { labelHorarioOption, mesasGrandesParaPersonas, analizarJuntePorSector, mesasElegiblesJunte, junteMismoSector } from '../lib/horarioDisponibilidad.jsx';
import { Icon } from '../components/Icon.jsx';
import { useAuth } from '../lib/auth.jsx';

/** Admin del restaurante; `restaurante` por compat. */
function puedeCrearReserva(rol) {
  return rol === 'admin_restaurante' || rol === 'restaurante';
}

export default function ReservaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { usuario } = useAuth();

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

  const marcarAsistenciaMut = useMutation({
    mutationFn: () => api.post(`/reservas/${id}/asistencia`),
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

  const isRecepcionista = usuario?.rol === 'recepcionista' || usuario?.rol === 'staff';
  const esEditable = ['Reservado', 'Confirmada'].includes(reserva.estado);
  const puedeEditarCancelar = esEditable && !isRecepcionista;
  const puedeMarcarAsistencia = esEditable;

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
          <Row label="Horario"  value={fmtHora(reserva.horario_hora)} />
          <Row label="Turno"    value={reserva.turno || '—'} />
          <Row label="Personas" value={reserva.personas} />
          <Row label="Mesas" value={fmtMesasReserva(reserva)} />
          <Row label="Sector" value={reserva.sector_nombre || '—'} />
          <Row label="Creada"   value={fmtTimestamp(reserva.created_at)} />
          <Row label="Actualizada" value={fmtTimestamp(reserva.updated_at)} />
        </dl>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        {!isRecepcionista && (
          <>
            <Button
              variant="primary"
              disabled={!puedeEditarCancelar}
              onClick={() => setEditOpen(true)}
            >
              <Icon name="edit" className="h-4 w-4" /> Editar
            </Button>
            <Button
              variant="warning"
              disabled={!puedeEditarCancelar}
              onClick={() => setConfirmOpen('asistencia')}
            >
              <Icon name="check" className="h-4 w-4" /> Marcar asistencia
            </Button>
            <Button
              variant="danger"
              disabled={!puedeEditarCancelar}
              onClick={() => setConfirmOpen('cancelar')}
            >
              <Icon name="x-circle" className="h-4 w-4" /> Cancelar
            </Button>
          </>
        )}
        {isRecepcionista && (
          <Button
            variant="warning"
            disabled={!puedeMarcarAsistencia}
            onClick={() => setConfirmOpen('asistencia')}
          >
            <Icon name="check" className="h-4 w-4" /> Marcar asistencia
          </Button>
        )}
      </div>

      {(isRecepcionista ? !puedeMarcarAsistencia : !puedeEditarCancelar) && (
        <p className="text-xs text-slate-500">
          {isRecepcionista
            ? 'Solo podés marcar asistencia cuando la reserva está Reservada o Confirmada.'
            : 'Esta reserva ya no está Reservada/Confirmada, no se puede editar ni cancelar.'}
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
        open={confirmOpen === 'asistencia'}
        title="Marcar asistencia"
        message="Esto marca que el cliente llegó al local. ¿Continuar?"
        confirmLabel="Sí, marcar asistencia"
        confirmVariant="warning"
        loading={marcarAsistenciaMut.isPending}
        error={marcarAsistenciaMut.error}
        onConfirm={() => marcarAsistenciaMut.mutate()}
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
  const { usuario } = useAuth();
  const [form, setForm] = useState({});
  const [junteSel, setJunteSel] = useState([]);
  const [juntePasoActivo, setJuntePasoActivo] = useState(false);
  const [mesaGrandeElegida, setMesaGrandeElegida] = useState('');
  const [mesaGrandePasoActivo, setMesaGrandePasoActivo] = useState(false);
  const [error, setError] = useState(null);

  const esAdmin = puedeCrearReserva(usuario?.rol);

  useEffect(() => {
    if (open) {
      setForm({
        nombre: reserva.nombre,
        personas: reserva.personas,
        dia: reserva.dia ? String(reserva.dia).slice(0, 10) : '',
        horario: String(reserva.horario_hora ?? ''),
      });
      setJunteSel([]);
      setJuntePasoActivo(false);
      setMesaGrandeElegida('');
      setMesaGrandePasoActivo(false);
      setError(null);
    }
  }, [open, reserva]);

  const dia = form.dia;
  const personas = Number(form.personas || 0);
  const horarioMin = form.horario !== '' && form.horario != null ? Number(form.horario) : null;

  const canFetch = Boolean(open && dia && personas >= 1);
  const canFetchMesas = Boolean(open && esAdmin && dia && horarioMin != null && Number.isFinite(horarioMin));

  const disp = useQuery({
    queryKey: ['reservas-disponibilidad', dia, personas, reserva.id],
    enabled: canFetch,
    queryFn: async () =>
      (await api.get(
        `/reservas/disponibilidad?dia=${encodeURIComponent(dia)}&personas=${encodeURIComponent(String(personas))}&exclude_reserva_id=${encodeURIComponent(String(reserva.id))}`
      )).data,
  });

  const mesasLibres = useQuery({
    queryKey: ['reservas-mesas-libres', dia, horarioMin, personas, reserva.id],
    enabled: canFetchMesas,
    queryFn: async () =>
      (await api.get(
        `/reservas/disponibilidad/mesas-libres?dia=${encodeURIComponent(dia)}&horario=${encodeURIComponent(String(horarioMin))}&personas=${encodeURIComponent(String(personas))}&exclude_reserva_id=${encodeURIComponent(String(reserva.id))}`
      )).data,
  });

  /** Igual que creación: slots del GET; si el turno actual no viene (ex.: borde), lo agregamos para que el Select sea coherente. */
  const horariosOptions = useMemo(() => {
    const list = [...(disp.data?.horarios || [])];
    const cur = Number(reserva.horario_hora);
    if (Number.isFinite(cur) && cur >= 0 && cur <= 1439 && !list.some((h) => Number(h.valor) === cur)) {
      list.push({ valor: cur, esActual: true });
    }
    return list.sort((a, b) => Number(a.valor) - Number(b.valor));
  }, [disp.data?.horarios, reserva.horario_hora]);

  const libres = mesasLibres.data?.mesas || [];

  const canSingle = useMemo(
    () => libres.some((m) => personas >= m.min_personas && personas <= m.max_personas),
    [libres, personas],
  );
  const maxMax = useMemo(
    () => (libres.length ? Math.max(...libres.map((m) => m.max_personas)) : 0),
    [libres],
  );
  const junteAnalisis = useMemo(() => analizarJuntePorSector(libres, personas), [libres, personas]);
  const libresJunte = useMemo(() => mesasElegiblesJunte(libres), [libres]);
  const mesasGrandesOpciones = useMemo(
    () => mesasGrandesParaPersonas(libres, personas),
    [libres, personas],
  );
  const minMinMesaGrande = useMemo(
    () => (mesasGrandesOpciones.length
      ? Math.min(...mesasGrandesOpciones.map((m) => m.min_personas))
      : 0),
    [mesasGrandesOpciones],
  );
  const ofrecerJunte =
    esAdmin &&
    canFetchMesas &&
    mesasLibres.isSuccess &&
    !canSingle &&
    junteAnalisis.ofrecerJunte;
  const seleccionarMesaGrande =
    esAdmin &&
    canFetchMesas &&
    mesasLibres.isSuccess &&
    !canSingle &&
    mesasGrandesOpciones.length >= 1;

  const selModels = useMemo(
    () => libres.filter((m) => junteSel.includes(m.numero_mesa)),
    [libres, junteSel],
  );
  const sumMinSel = selModels.reduce((s, m) => s + m.min_personas, 0);
  const sumMaxSel = selModels.reduce((s, m) => s + m.max_personas, 0);
  const sectorJunte = selModels.length > 0 ? selModels[0].sector_id : null;
  const sectorJunteNombre = selModels.length > 0 ? selModels[0].sector_nombre : '';
  const junteValido = junteSel.length >= 2
    && personas >= sumMinSel
    && personas <= sumMaxSel
    && junteMismoSector(selModels);

  const resetJunte = () => {
    setJunteSel([]);
    setJuntePasoActivo(false);
  };
  const resetMesaGrande = () => {
    setMesaGrandeElegida('');
    setMesaGrandePasoActivo(false);
  };

  const diaOrig = reserva.dia ? String(reserva.dia).slice(0, 10) : '';

  const needsMesaRecompute =
    (form.dia && form.dia !== diaOrig)
    || (Number.isFinite(horarioMin) && horarioMin !== Number(reserva.horario_hora))
    || (Number.isFinite(personas) && personas !== Number(reserva.personas));

  const bloqueadoJunte =
    needsMesaRecompute &&
    esAdmin &&
    ofrecerJunte &&
    !canSingle &&
    (!juntePasoActivo || !junteValido);

  const bloqueadoMesaGrande =
    needsMesaRecompute &&
    esAdmin &&
    seleccionarMesaGrande &&
    (!mesaGrandePasoActivo || !mesaGrandeElegida);

  /** Evita guardar mientras no está lista la disponibilidad o (admin) las mesas libres del slot. */
  const esperandoDatosMesa =
    needsMesaRecompute && (
      disp.isLoading || disp.isFetching
      || (esAdmin && Number.isFinite(horarioMin) && (mesasLibres.isLoading || mesasLibres.isFetching))
    );

  const mut = useMutation({
    mutationFn: async () => {
      const nombreTrim = String(form.nombre || '').trim();
      const personasNum = Number(form.personas);
      const diaIso = String(form.dia || '');
      const horarioNum = form.horario !== '' && form.horario != null ? Number(form.horario) : NaN;

      const nombreChanged = nombreTrim !== reserva.nombre;
      const personasChanged = personasNum !== Number(reserva.personas);
      const diaChanged = diaIso !== diaOrig;
      const horarioChanged = Number.isFinite(horarioNum) && horarioNum !== Number(reserva.horario_hora);

      const needsRecompute = diaChanged || horarioChanged || personasChanged;

      if (!Number.isFinite(horarioNum)) {
        throw new Error('Elegí un horario de ingreso de la lista.');
      }

      if (needsRecompute && (disp.isLoading || disp.isFetching)) {
        throw new Error('Esperá a que cargue la disponibilidad.');
      }
      if (needsRecompute && esAdmin && Number.isFinite(horarioMin) && (mesasLibres.isLoading || mesasLibres.isFetching)) {
        throw new Error('Esperá a que carguen las mesas libres para este horario.');
      }

      if (needsRecompute && esAdmin && ofrecerJunte && !canSingle) {
        if (!juntePasoActivo || !junteValido) {
          throw new Error('Tu grupo supera el máximo de la mesa más grande disponible; usá “Juntar mesas” y elegí al menos dos mesas.');
        }
        const payload = {
          dia: diaIso,
          personas: personasNum,
          horario: fmtHora(horarioNum),
          mesas: [...junteSel].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })),
        };
        if (nombreChanged) payload.nombre = nombreTrim;
        const { data } = await api.patch(`/reservas/${reserva.id}`, payload);
        return data;
      }

      if (needsRecompute && esAdmin && seleccionarMesaGrande) {
        if (!mesaGrandePasoActivo || !mesaGrandeElegida) {
          throw new Error('Las mesas libres tienen un mínimo mayor a tu grupo; usá “Seleccionar mesa” y elegí una mesa con cupo suficiente.');
        }
        const payload = {
          dia: diaIso,
          personas: personasNum,
          horario: fmtHora(horarioNum),
          numero_mesa: mesaGrandeElegida,
        };
        if (nombreChanged) payload.nombre = nombreTrim;
        const { data } = await api.patch(`/reservas/${reserva.id}`, payload);
        return data;
      }

      const cambios = {};
      if (nombreChanged) cambios.nombre = nombreTrim;
      if (personasChanged) cambios.personas = personasNum;
      if (diaChanged) cambios.dia = diaIso;
      if (horarioChanged) cambios.horario = fmtHora(horarioNum);

      if (Object.keys(cambios).length === 0) {
        throw new Error('No hay cambios para guardar');
      }
      const { data } = await api.patch(`/reservas/${reserva.id}`, cambios);
      return data;
    },
    onSuccess: () => { onSaved?.(); onClose(); },
    onError: (err) => {
      if (err?.message && !err?.response) {
        setError(err.message);
        return;
      }
      const code = err?.response?.data?.error;
      if (code === 'sin_disponibilidad') {
        setError(
          needsMesaRecompute && seleccionarMesaGrande
            ? 'No se pudo guardar: la mesa elegida no está libre o no admite esa cantidad de personas.'
            : 'No hay mesa disponible para esa combinación de día/horario/personas.',
        );
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
          <Button
            onClick={() => { setError(null); mut.mutate(); }}
            disabled={
              mut.isPending
              || !form.horario
              || bloqueadoJunte
              || bloqueadoMesaGrande
              || esperandoDatosMesa
            }
          >
            {mut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="ed-dia">Día</label>
            <Input
              id="ed-dia"
              type="date"
              className="mt-1"
              value={form.dia || ''}
              onChange={(e) => {
                setForm({ ...form, dia: e.target.value, horario: '' });
                resetJunte();
                resetMesaGrande();
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="ed-personas">Personas</label>
            <Input
              id="ed-personas"
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              className="mt-1"
              value={form.personas ?? ''}
              onChange={(e) => {
                setForm({ ...form, personas: e.target.value });
                resetJunte();
                resetMesaGrande();
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600" htmlFor="ed-horario">Horario de ingreso</label>
          {disp.isLoading ? (
            <p className="mt-1 text-xs text-slate-500">Cargando disponibilidad…</p>
          ) : disp.isError ? (
            <p className="mt-1 text-xs text-rose-600">Error: {apiError(disp.error)}</p>
          ) : (
            <Select
              id="ed-horario"
              className="mt-1"
              value={form.horario}
              onChange={(e) => {
                setForm({ ...form, horario: e.target.value });
                resetJunte();
                resetMesaGrande();
              }}
            >
              <option value="">Elegí horario de ingreso…</option>
              {horariosOptions.map((h) => (
                <option key={h.valor} value={h.valor}>
                  {labelHorarioOption(h)}
                </option>
              ))}
            </Select>
          )} 
          {!disp.isLoading && !disp.isError && canFetch && horariosOptions.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No hay turnos con mesa libre para esa fecha y cantidad de personas.</p>
          )}
        </div>

        {seleccionarMesaGrande && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
            <p className="mb-2">
              {mesasGrandesOpciones.length === 1
                ? `La mesa disponible tiene un mínimo de ${minMinMesaGrande} personas; con ${personas} podés guardar en esa mesa más grande (se respeta el máximo de cada mesa).`
                : `Hay mesas libres con mínimo desde ${minMinMesaGrande} personas; con ${personas} podés elegir una mesa más grande (se respeta el máximo de cada mesa).`}
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
                  {mesasGrandesOpciones.map((m) => (
                      <li key={m.numero_mesa}>
                        <label className="flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="radio"
                            name="mesa-grande-ed"
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
            <p className="mb-2">El grupo supera el máximo de la mesa más grande disponible ({maxMax} pers.), pero hay cupo juntando mesas.</p>
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
                <p className="text-xs font-medium">
                  Seleccioná mesas del mismo sector (mínimo 2) hasta cubrir {personas} personas.
                  {sectorJunteNombre ? ` Sector: ${sectorJunteNombre}.` : ''}
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {libresJunte.map((m) => {
                    const bloqueadoSector = sectorJunte != null && m.sector_id !== sectorJunte;
                    return (
                    <li key={m.numero_mesa}>
                      <label
                        className={`flex items-center gap-2 text-xs ${bloqueadoSector ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        title={bloqueadoSector ? 'Solo se pueden juntar mesas del mismo sector' : undefined}
                      >
                        <input
                          type="checkbox"
                          disabled={bloqueadoSector}
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
                          {m.sector_nombre ? ` · ${m.sector_nombre}` : ''}
                        </span>
                      </label>
                    </li>
                    );
                  })}
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

        <div>
          <Label htmlFor="ed-nombre">Nombre</Label>
          <Input id="ed-nombre" value={form.nombre || ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>

        <p className="text-xs text-slate-500">
          Elegí el horario de ingreso del turno (no cualquier minuto del rango). Si el grupo es muy chico para el mínimo de las mesas libres, elegí una mesa más grande; si es muy grande para una sola mesa, juntá mesas.
        </p>
        <ErrorText>{error}</ErrorText>
      </div>
    </Modal>
  );
}
