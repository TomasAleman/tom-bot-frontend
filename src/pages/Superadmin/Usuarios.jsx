import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api.js';
import { Button, Input, Label, Select, ErrorText } from '../../components/Field.jsx';

export default function SuperadminUsuarios() {
  const [form, setForm] = useState({
    restaurante_id: '',
    email: '',
    password: '',
    nombre: '',
    rol: 'admin_restaurante',
  });
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        restaurante_id: form.rol === 'superadmin' ? null : Number(form.restaurante_id),
        email: String(form.email || '').trim().toLowerCase(),
        password: String(form.password || ''),
        nombre: String(form.nombre || '').trim() || undefined,
        rol: form.rol,
      };
      const res = await api.post('/superadmin/usuarios', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setCreated(data?.usuario || null);
      setError(null);
    },
    onError: (err) => {
      setCreated(null);
      setError(apiError(err, 'No se pudo crear el usuario'));
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Superadmin · Usuarios</h2>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Rol</Label>
            <Select value={form.rol} onChange={(e) => setForm((s) => ({ ...s, rol: e.target.value }))}>
              <option value="admin_restaurante">Admin restaurante</option>
              <option value="recepcionista">Recepcionista (solo lectura)</option>
              <option value="superadmin">Superadmin</option>
            </Select>
          </div>
          <div>
            <Label>Restaurante ID (requerido salvo superadmin)</Label>
            <Input
              value={form.restaurante_id}
              onChange={(e) => setForm((s) => ({ ...s, restaurante_id: e.target.value }))}
              disabled={form.rol === 'superadmin'}
              placeholder="1"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Nombre (opcional)</Label>
            <Input value={form.nombre} onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))} />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => { setError(null); mut.mutate(); }} disabled={mut.isPending}>
            {mut.isPending ? 'Creando…' : 'Crear usuario'}
          </Button>
          <ErrorText>{error}</ErrorText>
        </div>

        {created && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Creado: #{created.id} · {created.email} · {created.rol}
            {created.restaurante_id ? ` · restaurante_id=${created.restaurante_id}` : ''}
          </div>
        )}
      </section>
    </div>
  );
}

