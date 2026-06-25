import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, apiError } from '../../lib/api.js';
import Modal from '../../components/Modal.jsx';
import { Button } from '../../components/Field.jsx';

function BotSwitch({ restaurante, onRequestOff }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (activo) => api.patch(`/superadmin/restaurantes/${restaurante.id}/activo`, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['superadmin', 'restaurantes'] }),
  });
  const activo = restaurante.activo;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={mut.isPending}
      onClick={() => (activo ? onRequestOff(restaurante) : mut.mutate(true))}
      className="flex items-center gap-2 disabled:opacity-50"
    >
      <span className={`text-xs font-medium ${activo ? 'text-emerald-800' : 'text-slate-500'}`}>
        {activo ? 'Bot activo' : 'Bot apagado'}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          activo ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            activo ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function SuperadminRestaurantes() {
  const qc = useQueryClient();
  const [porApagar, setPorApagar] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['superadmin', 'restaurantes'],
    queryFn: async () => (await api.get('/superadmin/restaurantes')).data,
  });

  const apagarMut = useMutation({
    mutationFn: (restaurante) => api.patch(`/superadmin/restaurantes/${restaurante.id}/activo`, { activo: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin', 'restaurantes'] });
      setPorApagar(null);
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Superadmin · Restaurantes</h2>
      <p className="text-sm text-slate-500">
        Activá o desactivá el bot de WhatsApp de un restaurante completo. Mientras está apagado, el bot no responde
        ningún mensaje en esa instancia (el resto del panel sigue funcionando normal).
      </p>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Listado</h3>
        </div>
        <div className="p-4">
          {isLoading && <p className="text-sm text-slate-500">Cargando…</p>}
          {isError && <p className="text-sm text-rose-600">Error: {apiError(error)}</p>}
          {!isLoading && !isError && (
            <div className="space-y-2">
              {(data?.data || []).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{r.nombre}</div>
                    <div className="truncate text-xs text-slate-500">#{r.id} · {r.slug} · instancia: {r.instancia_evolution}</div>
                  </div>
                  <BotSwitch restaurante={r} onRequestOff={setPorApagar} />
                </div>
              ))}
              {(data?.data || []).length === 0 && (
                <p className="text-sm text-slate-500">No hay restaurantes.</p>
              )}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={!!porApagar}
        onClose={() => setPorApagar(null)}
        title="Apagar el bot"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPorApagar(null)}>Cancelar</Button>
            <Button variant="danger" disabled={apagarMut.isPending} onClick={() => apagarMut.mutate(porApagar)}>
              {apagarMut.isPending ? 'Apagando…' : 'Sí, apagar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          ¿Seguro que querés apagar el bot de <strong>{porApagar?.nombre}</strong>? Mientras esté apagado, no va a
          responder ningún mensaje de WhatsApp para este restaurante.
        </p>
      </Modal>
    </div>
  );
}
