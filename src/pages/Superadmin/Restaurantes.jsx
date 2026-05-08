import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiError } from '../../lib/api.js';
import { Button, Input, Label, ErrorText } from '../../components/Field.jsx';

export default function SuperadminRestaurantes() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre: '', slug: '' });
  const [error, setError] = useState(null);

  const { data, isLoading, isError, error: qErr } = useQuery({
    queryKey: ['superadmin', 'restaurantes'],
    queryFn: async () => (await api.get('/superadmin/restaurantes')).data,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: String(form.nombre || '').trim(),
        slug: String(form.slug || '').trim() || undefined,
      };
      const res = await api.post('/superadmin/restaurantes', payload);
      return res.data;
    },
    onSuccess: () => {
      setForm({ nombre: '', slug: '' });
      setError(null);
      qc.invalidateQueries({ queryKey: ['superadmin', 'restaurantes'] });
    },
    onError: (err) => setError(apiError(err, 'No se pudo crear el restaurante')),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Superadmin · Restaurantes</h2>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">Crear restaurante</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Nombre</Label>
            <Input value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} />
          </div>
          <div>
            <Label>Slug (opcional)</Label>
            <Input value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            onClick={() => { setError(null); createMut.mutate(); }}
            disabled={createMut.isPending}
          >
            {createMut.isPending ? 'Creando…' : 'Crear'}
          </Button>
          <ErrorText>{error}</ErrorText>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Listado</h3>
        </div>
        <div className="p-4">
          {isLoading && <p className="text-sm text-slate-500">Cargando…</p>}
          {isError && <p className="text-sm text-rose-600">Error: {apiError(qErr)}</p>}
          {!isLoading && !isError && (
            <div className="space-y-2">
              {(data?.data || []).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{r.nombre}</div>
                    <div className="truncate text-xs text-slate-500">#{r.id} · {r.slug}</div>
                  </div>
                  <div className="text-xs text-slate-500">{r.activo ? 'Activo' : 'Inactivo'}</div>
                </div>
              ))}
              {(data?.data || []).length === 0 && (
                <p className="text-sm text-slate-500">No hay restaurantes.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

