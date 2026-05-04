import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import { Button, Input, Label, ErrorText } from '../components/Field.jsx';
import Modal from '../components/Modal.jsx';
import { Icon } from '../components/Icon.jsx';

export default function Configuracion() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['config'],
    queryFn: async () => (await api.get('/config')).data,
  });

  const [form, setForm] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [errMsg, setErrMsg] = useState(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next = {};
    for (const [k, v] of Object.entries(data.config || {})) {
      next[k] = v.valor || '';
    }
    setForm(next);
  }, [data]);

  const guardarMut = useMutation({
    mutationFn: (payload) => api.patch('/config', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] });
      setSavedAt(new Date());
    },
    onError: (err) => setErrMsg(apiError(err, 'No se pudo guardar')),
  });

  const eliminarMut = useMutation({
    mutationFn: (parametro) => api.delete(`/config/${encodeURIComponent(parametro)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando configuración…</p>;
  if (isError)  return <p className="text-sm text-rose-600">Error: {apiError(error)}</p>;

  const claves = Object.keys(data?.config || {}).sort();

  const onGuardar = (e) => {
    e?.preventDefault?.();
    setErrMsg(null);
    const payload = {};
    for (const k of claves) {
      const original = data.config[k]?.valor ?? '';
      const actual = form[k] ?? '';
      if (String(original) !== String(actual)) {
        payload[k] = actual;
      }
    }
    if (Object.keys(payload).length === 0) {
      setErrMsg('No hay cambios para guardar.');
      return;
    }
    guardarMut.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{claves.length} parámetros configurados.</p>
        <Button onClick={() => setNuevoOpen(true)}>
          <Icon name="plus" className="h-4 w-4" /> Nuevo parámetro
        </Button>
      </div>

      <form onSubmit={onGuardar} className="space-y-3">
        {claves.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
            Sin parámetros configurados.
          </p>
        ) : (
          <ul className="space-y-3">
            {claves.map((k) => (
              <li key={k} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-2">
                  <Label htmlFor={`c-${k}`}>{k}</Label>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar parámetro "${k}"?`)) eliminarMut.mutate(k);
                    }}
                    className="text-slate-400 hover:text-rose-600"
                    aria-label={`Eliminar ${k}`}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
                <Input
                  id={`c-${k}`}
                  value={form[k] ?? ''}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
                {data.config[k]?.descripcion ? (
                  <p className="mt-1 text-xs text-slate-500">{data.config[k].descripcion}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <ErrorText>{errMsg}</ErrorText>

        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Button type="submit" disabled={guardarMut.isPending}>
            {guardarMut.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
          {savedAt && !guardarMut.isPending && (
            <span className="text-xs text-emerald-700">
              Guardado {savedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      </form>

      <NuevoParametroModal
        open={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        onCreated={(k, v) => {
          guardarMut.mutate({ [k]: v });
          setNuevoOpen(false);
        }}
      />
    </div>
  );
}

function NuevoParametroModal({ open, onClose, onCreated }) {
  const [nombre, setNombre] = useState('');
  const [valor, setValor] = useState('');
  const [err, setErr] = useState(null);

  useEffect(() => { if (open) { setNombre(''); setValor(''); setErr(null); } }, [open]);

  const submit = (e) => {
    e?.preventDefault?.();
    if (!/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(nombre)) {
      setErr('El nombre debe empezar con letra y solo contener letras, números y "_"');
      return;
    }
    if (!valor) {
      setErr('El valor no puede estar vacío');
      return;
    }
    onCreated(nombre, valor);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo parámetro"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>Crear</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="np-nombre">Nombre</Label>
          <Input id="np-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="RateLimitMsgsPorMin" />
        </div>
        <div>
          <Label htmlFor="np-valor">Valor</Label>
          <Input id="np-valor" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="60" />
        </div>
        <ErrorText>{err}</ErrorText>
      </form>
    </Modal>
  );
}
