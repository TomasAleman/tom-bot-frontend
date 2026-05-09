import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Button, Input, Select, Label, ErrorText } from '../components/Field.jsx';

function valorInicialDeForm(parametro, valor, schema) {
  const def = schema?.[parametro];
  if (!def) return valor ?? '';
  if (def.tipo === 'bool') {
    if (valor === 'true' || valor === true) return 'true';
    if (valor === 'false' || valor === false) return 'false';
    return '';
  }
  return valor ?? '';
}

function validarParaEnvio(parametro, valorForm, schema) {
  const def = schema?.[parametro];
  if (!def) {
    return { ok: false, error: 'parámetro fuera de catálogo' };
  }
  if (def.tipo === 'bool') {
    if (valorForm !== 'true' && valorForm !== 'false') {
      return { ok: false, error: 'Elegí Sí o No.' };
    }
    return { ok: true, valor: valorForm };
  }
  if (def.tipo === 'int') {
    const trimmed = String(valorForm ?? '').trim();
    if (trimmed === '') return { ok: false, error: 'Ingresá un número.' };
    if (!/^-?\d+$/.test(trimmed)) return { ok: false, error: 'Solo números enteros.' };
    const n = Number(trimmed);
    if (typeof def.min === 'number' && n < def.min) return { ok: false, error: `Mínimo ${def.min}.` };
    if (typeof def.max === 'number' && n > def.max) return { ok: false, error: `Máximo ${def.max}.` };
    return { ok: true, valor: String(n) };
  }
  if (def.tipo === 'string') {
    const s = String(valorForm ?? '').trim();
    if (s.length === 0) return { ok: false, error: 'No puede quedar vacío.' };
    if (typeof def.maxLength === 'number' && s.length > def.maxLength) {
      return { ok: false, error: `Máximo ${def.maxLength} caracteres.` };
    }
    return { ok: true, valor: s };
  }
  return { ok: false, error: 'tipo desconocido' };
}

export default function Configuracion() {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const puedeEditarMenu =
    (usuario?.rol === 'admin_restaurante' || usuario?.rol === 'superadmin') &&
    Boolean(usuario?.restaurante?.id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['config'],
    queryFn: async () => (await api.get('/config')).data,
  });

  const menuQuery = useQuery({
    queryKey: ['restaurante-menu'],
    queryFn: async () => (await api.get('/restaurante/menu')).data,
    enabled: puedeEditarMenu,
  });

  const [menuLink, setMenuLink] = useState('');
  const [menuMostrar, setMenuMostrar] = useState('true');
  const [menuErr, setMenuErr] = useState(null);
  const [menuSavedAt, setMenuSavedAt] = useState(null);

  useEffect(() => {
    if (!menuQuery.data) return;
    setMenuLink(menuQuery.data.link_menu ?? '');
    setMenuMostrar(menuQuery.data.mostrar_menu === false ? 'false' : 'true');
  }, [menuQuery.data]);

  const menuGuardarMut = useMutation({
    mutationFn: (payload) => api.patch('/restaurante/menu', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurante-menu'] });
      setMenuSavedAt(new Date());
      setMenuErr(null);
    },
    onError: (err) => setMenuErr(apiError(err, 'No se pudo guardar el menú')),
  });

  const schema = data?.schema || {};
  const config = data?.config || {};

  const [form, setForm] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [errMsg, setErrMsg] = useState(null);
  const [errPorClave, setErrPorClave] = useState({});

  useEffect(() => {
    if (!data) return;
    const next = {};
    for (const k of Object.keys(schema)) {
      next[k] = valorInicialDeForm(k, config[k]?.valor, schema);
    }
    setForm(next);
  }, [data]);

  const guardarMut = useMutation({
    mutationFn: (payload) => api.patch('/config', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] });
      setSavedAt(new Date());
      setErrPorClave({});
    },
    onError: (err) => setErrMsg(apiError(err, 'No se pudo guardar')),
  });

  const claves = useMemo(() => Object.keys(schema).sort(), [schema]);
  const legacyClaves = useMemo(
    () => Object.keys(config).filter((k) => !schema[k]).sort(),
    [config, schema]
  );

  if (isLoading) return <p className="text-sm text-slate-500">Cargando configuración…</p>;
  if (isError) return <p className="text-sm text-rose-600">Error: {apiError(error)}</p>;

  const onGuardarMenu = (e) => {
    e?.preventDefault?.();
    setMenuErr(null);
    const trimmed = String(menuLink ?? '').trim();
    const origLink = String(menuQuery.data?.link_menu ?? '').trim();
    const origMostrar = menuQuery.data?.mostrar_menu === false ? 'false' : 'true';
    if (trimmed === origLink && menuMostrar === origMostrar) {
      setMenuErr('No hay cambios en el menú para guardar.');
      return;
    }
    if (trimmed !== '' && !/^https?:\/\//i.test(trimmed)) {
      setMenuErr('El enlace debe empezar con http:// o https://');
      return;
    }
    menuGuardarMut.mutate({
      link_menu: trimmed === '' ? null : trimmed,
      mostrar_menu: menuMostrar === 'true',
    });
  };

  const onGuardar = (e) => {
    e?.preventDefault?.();
    setErrMsg(null);
    const payload = {};
    const errs = {};

    for (const k of claves) {
      const original = valorInicialDeForm(k, config[k]?.valor, schema);
      const actual = form[k] ?? '';
      if (String(original) === String(actual)) continue;

      const r = validarParaEnvio(k, actual, schema);
      if (!r.ok) {
        errs[k] = r.error;
        continue;
      }
      payload[k] = r.valor;
    }

    if (Object.keys(errs).length > 0) {
      setErrPorClave(errs);
      setErrMsg('Revisá los campos marcados.');
      return;
    }
    setErrPorClave({});

    if (Object.keys(payload).length === 0) {
      setErrMsg('No hay cambios para guardar.');
      return;
    }
    guardarMut.mutate(payload);
  };

  const renderInput = (k) => {
    const def = schema[k];
    const id = `c-${k}`;
    const value = form[k] ?? '';

    if (def.tipo === 'bool') {
      return (
        <Select
          id={id}
          value={value}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        >
          <option value="" disabled>
            (sin valor)
          </option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </Select>
      );
    }

    if (def.tipo === 'int') {
      return (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          step="1"
          min={def.min}
          max={def.max}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '' || /^-?\d*$/.test(raw)) {
              setForm({ ...form, [k]: raw });
            }
          }}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '.', ','].includes(e.key)) e.preventDefault();
          }}
        />
      );
    }

    return (
      <Input
        id={id}
        type="text"
        maxLength={def.maxLength}
        value={value}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {claves.length} parámetros configurables.
        </p>
      </div>

      <form onSubmit={onGuardar} className="space-y-3">
        {claves.length === 0 ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
            El catálogo de parámetros está vacío.
          </p>
        ) : (
          <ul className="space-y-3">
            {claves.map((k) => {
              const def = schema[k];
              return (
                <li key={k} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <Label htmlFor={`c-${k}`}>{def.label || k}</Label>
                  {renderInput(k)}
                  {def.descripcion ? (
                    <p className="mt-1 text-xs text-slate-500">{def.descripcion}</p>
                  ) : null}
                  {errPorClave[k] ? (
                    <p className="mt-1 text-xs text-rose-600">{errPorClave[k]}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {legacyClaves.length > 0 && (
          <details className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
            <summary className="cursor-pointer font-medium text-slate-700">
              Parámetros heredados ({legacyClaves.length})
            </summary>
            <p className="mt-2 text-xs text-slate-500">
              Estos parámetros existen en la base pero no están en el catálogo
              actual. Se muestran como referencia y solo pueden modificarse vía API.
            </p>
            <ul className="mt-2 space-y-1">
              {legacyClaves.map((k) => (
                <li key={k} className="text-xs">
                  <code className="rounded bg-white px-1 py-0.5 ring-1 ring-slate-200">
                    {k}
                  </code>{' '}
                  = <span className="text-slate-700">{String(config[k]?.valor)}</span>
                </li>
              ))}
            </ul>
          </details>
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

      {puedeEditarMenu ? (
        <section className="mt-8 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-sm font-semibold text-slate-800">Menú (WhatsApp)</h2>
          <p className="text-xs text-slate-500">
            Enlace al menú del restaurante y si el bot debe mostrar la opción «Ver el menú» en el mensaje de bienvenida.
          </p>
          {menuQuery.isLoading ? (
            <p className="text-sm text-slate-500">Cargando datos del menú…</p>
          ) : menuQuery.isError ? (
            <p className="text-sm text-rose-600">Error: {apiError(menuQuery.error)}</p>
          ) : (
            <form className="space-y-3" onSubmit={onGuardarMenu}>
              <div>
                <Label htmlFor="menu-link">URL del menú</Label>
                <Input
                  id="menu-link"
                  type="url"
                  placeholder="https://…"
                  value={menuLink}
                  onChange={(e) => setMenuLink(e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-slate-500">Dejalo vacío si todavía no tenés enlace público.</p>
              </div>
              <div>
                <Label htmlFor="menu-mostrar">Mostrar menú en el bot</Label>
                <Select
                  id="menu-mostrar"
                  value={menuMostrar}
                  onChange={(e) => setMenuMostrar(e.target.value)}
                  className="mt-1"
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </Select>
              </div>
              <ErrorText>{menuErr}</ErrorText>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <Button type="submit" disabled={menuGuardarMut.isPending}>
                  {menuGuardarMut.isPending ? 'Guardando…' : 'Guardar menú'}
                </Button>
                {menuSavedAt && !menuGuardarMut.isPending && (
                  <span className="text-xs text-emerald-700">
                    Menú guardado {menuSavedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
