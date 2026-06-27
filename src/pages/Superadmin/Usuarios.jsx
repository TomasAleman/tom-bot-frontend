import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../../lib/api.js';
import { Button, Input, Label, Select, ErrorText } from '../../components/Field.jsx';

export default function SuperadminUsuarios() {
  const [rol, setRol] = useState('admin_restaurante');
  const [restForm, setRestForm] = useState({
    nombre_restaurante: '',
    slug: '',
    instancia_evolution: '',
    evolution_api_key: '',
  });
  const [userForm, setUserForm] = useState({
    restaurante_id: '',
    email: '',
    password: '',
    nombre: '',
  });
  const [jefeRestaurantesIds, setJefeRestaurantesIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: restaurantesData } = useQuery({
    queryKey: ['superadmin', 'restaurantes'],
    queryFn: async () => (await api.get('/superadmin/restaurantes', { timeout: 45_000 })).data,
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

        const evoKey = String(restForm.evolution_api_key || '').trim();
        if (!evoKey || evoKey.length < 10) throw new Error('Falta la API key de la instancia Evolution (creala en Evolution Manager y pegala acá)');

        // Una sola petición: restaurante + admin en la misma transacción en el backend
        const { data } = await api.post(
          '/superadmin/restaurantes',
          {
            nombre: nombreRest,
            slug: String(restForm.slug || '').trim() || undefined,
            instancia_evolution: String(restForm.instancia_evolution || '').trim() || undefined,
            evolution_api_key: evoKey,
            admin_email: email,
            admin_password: password,
            admin_nombre: String(userForm.nombre || '').trim() || undefined,
          },
          { timeout: 120_000 }
        );

        if (!data?.restaurante?.id || !data?.usuario) {
          throw new Error('Respuesta incompleta del servidor');
        }

        return {
          restaurante: data.restaurante,
          usuario: data.usuario,
          evolution: data.evolution,
        };
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
        const res = await api.post('/superadmin/usuarios', payload, { timeout: 90_000 });
        return { usuario: res.data?.usuario };
      }

      if (rol === 'jefe') {
        const email = String(userForm.email || '').trim().toLowerCase();
        const password = String(userForm.password || '');
        if (!email) throw new Error('Falta el email');
        if (!password || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
        const payload = {
          email,
          password,
          nombre: String(userForm.nombre || '').trim() || undefined,
          rol: 'jefe',
          restaurantes_ids: [...jefeRestaurantesIds],
        };
        const res = await api.post('/superadmin/usuarios', payload, { timeout: 90_000 });
        return { usuario: res.data?.usuario };
      }

      throw new Error('Rol no soportado');
    },
    onSuccess: (data) => {
      setResult(data || null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'restaurantes'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'usuarios', 'jefe'] });
    },
    onError: (err) => {
      setResult(null);
      setError(apiError(err, 'No se pudo crear el usuario'));
    },
  });

  const trimmedEmail = String(userForm.email || '').trim().toLowerCase();
  const passLen = String(userForm.password || '').length;
  const restNombreOk = String(restForm.nombre_restaurante || '').trim().length > 0;
  const evoKeyOk = String(restForm.evolution_api_key || '').trim().length >= 10;
  const canSubmit =
    !mut.isPending &&
    (
      (rol === 'admin_restaurante' && restNombreOk && evoKeyOk && trimmedEmail.length > 0 && passLen >= 8) ||
      (rol === 'recepcionista' && Number(userForm.restaurante_id) > 0 && trimmedEmail.length > 0 && passLen >= 8) ||
      (rol === 'jefe' && trimmedEmail.length > 0 && passLen >= 8)
    );

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
              <option value="jefe">Jefe multi-sucursal (solo dashboard)</option>
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
                <p className="mt-1 text-xs text-slate-500">
                  Solo letras minúsculas, números y guiones (sin espacios). Si lo dejás vacío, se genera a partir del nombre.
                </p>
              </div>
              <div>
                <Label>Instancia Evolution (opcional)</Label>
                <Input
                  value={restForm.instancia_evolution}
                  onChange={(e) => setRestForm((s) => ({ ...s, instancia_evolution: e.target.value }))}
                  placeholder="Si vacío, se usa el slug del restaurante"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>API key de la instancia Evolution</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={restForm.evolution_api_key}
                  onChange={(e) => setRestForm((s) => ({ ...s, evolution_api_key: e.target.value }))}
                  placeholder="Creá la instancia en Evolution Manager y pegá la apikey aquí"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Creá la instancia en Evolution Manager y pegá la apikey. El alta de restaurante y del usuario admin se guarda en una sola operación (un solo request).
                </p>
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

          {rol === 'jefe' && (
            <div className="sm:col-span-2">
              <Label>Sucursales que puede ver (opcional, se puede ajustar después)</Label>
              <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {restaurantes.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={jefeRestaurantesIds.has(r.id)}
                        onChange={() => {
                          setJefeRestaurantesIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.id)) next.delete(r.id);
                            else next.add(r.id);
                            return next;
                          });
                        }}
                      />
                      <span>#{r.id} · {r.nombre}</span>
                    </label>
                  </li>
                ))}
                {restaurantes.length === 0 && <li className="text-sm text-slate-500">No hay restaurantes creados todavía.</li>}
              </ul>
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
            <Label>Nombre del usuario (opcional)</Label>
            <Input value={userForm.nombre} onChange={(e) => setUserForm((s) => ({ ...s, nombre: e.target.value }))} />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => { setError(null); mut.mutate(); }} disabled={!canSubmit}>
            {mut.isPending ? 'Creando…' : (rol === 'admin_restaurante' ? 'Crear restaurante + usuario' : 'Crear usuario')}
          </Button>
          <ErrorText>{error}</ErrorText>
        </div>

        {!canSubmit && !mut.isPending && (
          <p className="mt-2 text-xs text-slate-500">
            Completá los campos requeridos. La contraseña debe tener al menos 8 caracteres.
          </p>
        )}

        {result?.usuario && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Usuario creado: #{result.usuario.id} · {result.usuario.email} · {result.usuario.rol}
            {result.usuario.restaurante_id ? ` · restaurante_id=${result.usuario.restaurante_id}` : ''}
          </div>
        )}

        {result?.restaurante && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-sm font-semibold text-slate-900">
              Restaurante creado: #{result.restaurante.id} · {result.restaurante.nombre}
            </div>
            {result?.evolution?.instanceName && (
              <p className="mt-1 text-xs text-slate-600">
                Instancia Evolution enlazada: <code className="rounded bg-slate-100 px-1">{result.evolution.instanceName}</code>
                {' '}— conectá WhatsApp desde Evolution Manager si aún no lo hiciste.
              </p>
            )}
          </div>
        )}
      </section>

      <GestionJefes restaurantes={restaurantes} />
    </div>
  );
}

function GestionJefes({ restaurantes }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['superadmin', 'usuarios', 'jefe'],
    queryFn: async () => (await api.get('/superadmin/usuarios?rol=jefe')).data,
  });

  const jefes = data?.data || [];

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-sm font-semibold text-slate-800">Jefes existentes · sucursales asignadas</h3>
      <p className="mt-1 text-xs text-slate-500">
        Tildá o destildá sucursales y guardá: cubre agregar y quitar en una sola operación.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Cargando…</p>
      ) : isError ? (
        <p className="mt-3 text-sm text-rose-600">Error: {apiError(error)}</p>
      ) : jefes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Todavía no hay usuarios jefe creados.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {jefes.map((j) => (
            <JefeCard
              key={j.id}
              jefe={j}
              restaurantes={restaurantes}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['superadmin', 'usuarios', 'jefe'] })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function JefeCard({ jefe, restaurantes, onSaved }) {
  const [seleccion, setSeleccion] = useState(() => new Set((jefe.restaurantes || []).map((r) => r.id)));
  const [savedAt, setSavedAt] = useState(null);

  const mut = useMutation({
    mutationFn: () => api.put(`/superadmin/usuarios/${jefe.id}/restaurantes`, { restaurantes_ids: [...seleccion] }),
    onSuccess: () => { setSavedAt(new Date()); onSaved?.(); },
  });

  return (
    <li className="rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-900">{jefe.nombre || jefe.email}</p>
      <p className="text-xs text-slate-500">{jefe.email}</p>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
        {restaurantes.map((r) => (
          <li key={r.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={seleccion.has(r.id)}
                onChange={() => {
                  setSeleccion((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.id)) next.delete(r.id);
                    else next.add(r.id);
                    return next;
                  });
                }}
              />
              <span>#{r.id} · {r.nombre}</span>
            </label>
          </li>
        ))}
        {restaurantes.length === 0 && <li className="text-sm text-slate-500">No hay restaurantes creados todavía.</li>}
      </ul>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="secondary" onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? 'Guardando…' : 'Guardar sucursales'}
        </Button>
        {savedAt && !mut.isPending && (
          <span className="text-xs text-emerald-700">Guardado {savedAt.toLocaleTimeString()}</span>
        )}
        <ErrorText>{mut.error ? apiError(mut.error) : null}</ErrorText>
      </div>
    </li>
  );
}
