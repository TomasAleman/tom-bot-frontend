import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api.js';
import { Button, Input, Label, Select, ErrorText } from '../../components/Field.jsx';

export default function SuperadminUsuarios() {
  const [rol, setRol] = useState('admin_restaurante');
  const [restForm, setRestForm] = useState({
    nombre_restaurante: '',
    slug: '',
  });
  const [userForm, setUserForm] = useState({
    restaurante_id: '',
    email: '',
    password: '',
    nombre: '',
  });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const { data: restaurantesData } = useQuery({
    queryKey: ['superadmin', 'restaurantes'],
    queryFn: async () => (await api.get('/superadmin/restaurantes')).data,
    staleTime: 10_000,
  });

  const restaurantes = useMemo(
    () => (restaurantesData?.data || []).map((r) => ({ id: r.id, nombre: r.nombre, slug: r.slug })),
    [restaurantesData]
  );

  useEffect(() => {
    if (rol === 'recepcionista' && !userForm.restaurante_id && restaurantes.length > 0) {
      setUserForm((s) => ({ ...s, restaurante_id: String(restaurantes[0].id) }));
    }
  }, [rol, restaurantes, userForm.restaurante_id]);

  const mut = useMutation({
    mutationFn: async () => {
      if (rol === 'admin_restaurante') {
        const nombreRest = String(restForm.nombre_restaurante || '').trim();
        if (!nombreRest) throw new Error('Falta el nombre del restaurante');
        const email = String(userForm.email || '').trim().toLowerCase();
        const password = String(userForm.password || '');
        if (!email) throw new Error('Falta el email');
        if (!password || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

        // 1) Crear restaurante (incluye crear instancia en Evolution y devuelve qrcode)
        const { data: createdRest } = await api.post('/superadmin/restaurantes', {
          nombre: nombreRest,
          slug: String(restForm.slug || '').trim() || undefined,
        });

        const rid = createdRest?.restaurante?.id;
        if (!rid) throw new Error('No se pudo obtener restaurante_id');

        // 2) Crear usuario admin del restaurante
        const { data: createdUser } = await api.post('/superadmin/usuarios', {
          restaurante_id: Number(rid),
          email,
          password,
          nombre: String(userForm.nombre || '').trim() || undefined,
          rol: 'admin_restaurante',
        });

        return { createdRest, createdUser };
      }

      if (rol === 'recepcionista') {
        const rid = Number(userForm.restaurante_id);
        if (!rid) throw new Error('Falta seleccionar restaurante');
        const payload = {
          restaurante_id: rid,
          email: String(userForm.email || '').trim().toLowerCase(),
          password: String(userForm.password || ''),
          nombre: String(userForm.nombre || '').trim() || undefined,
          rol: 'recepcionista',
        };
        const res = await api.post('/superadmin/usuarios', payload);
        return { createdUser: res.data };
      }

      // superadmin
      const payload = {
        restaurante_id: null,
        email: String(userForm.email || '').trim().toLowerCase(),
        password: String(userForm.password || ''),
        nombre: String(userForm.nombre || '').trim() || undefined,
        rol: 'superadmin',
      };
      const res = await api.post('/superadmin/usuarios', payload);
      return { createdUser: res.data };
    },
    onSuccess: (data) => {
      setResult(data || null);
      setError(null);
    },
    onError: (err) => {
      setResult(null);
      setError(apiError(err, 'No se pudo crear el usuario'));
    },
  });

  function qrSrc(qr) {
    if (!qr) return null;
    const s = String(qr);
    if (s.startsWith('data:image/')) return s;
    if (s.includes(',')) return s; // ya viene como data uri
    return `data:image/png;base64,${s}`;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Superadmin · Usuarios</h2>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Rol</Label>
            <Select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="admin_restaurante">Admin restaurante</option>
              <option value="recepcionista">Recepcionista (solo lectura)</option>
              <option value="superadmin">Superadmin</option>
            </Select>
          </div>

          {rol === 'admin_restaurante' && (
            <>
              <div>
                <Label>Nombre del restaurante</Label>
                <Input value={restForm.nombre_restaurante} onChange={(e) => setRestForm((s) => ({ ...s, nombre_restaurante: e.target.value }))} />
              </div>
              <div>
                <Label>Slug (opcional)</Label>
                <Input value={restForm.slug} onChange={(e) => setRestForm((s) => ({ ...s, slug: e.target.value }))} />
              </div>
            </>
          )}

          {rol === 'recepcionista' && (
            <div className="sm:col-span-2">
              <Label>Restaurante</Label>
              <Select
                value={userForm.restaurante_id}
                onChange={(e) => setUserForm((s) => ({ ...s, restaurante_id: e.target.value }))}
              >
                {(restaurantes || []).map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    #{r.id} · {r.nombre}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <Label>Email</Label>
            <Input value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={userForm.password} onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Label>Nombre (opcional)</Label>
            <Input value={userForm.nombre} onChange={(e) => setUserForm((s) => ({ ...s, nombre: e.target.value }))} />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => { setError(null); mut.mutate(); }} disabled={mut.isPending}>
            {mut.isPending ? 'Creando…' : (rol === 'admin_restaurante' ? 'Crear restaurante + usuario' : 'Crear usuario')}
          </Button>
          <ErrorText>{error}</ErrorText>
        </div>

        {result?.createdUser?.usuario && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Usuario creado: #{result.createdUser.usuario.id} · {result.createdUser.usuario.email} · {result.createdUser.usuario.rol}
            {result.createdUser.usuario.restaurante_id ? ` · restaurante_id=${result.createdUser.usuario.restaurante_id}` : ''}
          </div>
        )}

        {result?.createdRest?.restaurante && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-sm font-semibold text-slate-900">
              Restaurante creado: #{result.createdRest.restaurante.id} · {result.createdRest.restaurante.nombre}
            </div>
            {qrSrc(result.createdRest?.evolution?.qrcode) && (
              <div className="mt-2">
                <p className="text-xs text-slate-500">Escaneá el QR para conectar WhatsApp.</p>
                <img
                  src={qrSrc(result.createdRest.evolution.qrcode)}
                  alt="QR Evolution"
                  className="mt-2 h-64 w-64 rounded-xl border border-slate-200 bg-white object-contain"
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

