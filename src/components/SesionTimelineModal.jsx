import Modal from './Modal.jsx';
import { Icon } from './Icon.jsx';
import { derivarEstadoSesion } from '../lib/sesionTimeline.js';
import { fmtTimestamp } from '../lib/format.js';

const TITULO_TIPO = {
  crear: 'Haciendo una reserva',
  modificar: 'Modificando una reserva',
  cancelar: 'Cancelando una reserva',
  menu: 'Viendo el menú principal',
  vacia: 'Sin conversación activa',
  bloqueada: 'Número bloqueado',
  modo_humano: 'Modo persona activo',
};

function minutosRestantes(bloqueoHasta) {
  if (!bloqueoHasta) return null;
  const ms = new Date(bloqueoHasta).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : null;
}

function IconoPaso({ estado }) {
  if (estado === 'completado') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/30">
        <Icon name="check" className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (estado === 'actual') {
    return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 ring-4 ring-sky-100" />;
  }
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 ring-1 ring-slate-300" />;
}

export default function SesionTimelineModal({ sesion, onClose }) {
  if (!sesion) return null;

  const estado = derivarEstadoSesion(sesion.contexto_reserva, sesion.bloqueo_hasta, sesion.modo_humano);
  const minRestantes = estado.esBloqueada ? minutosRestantes(sesion.bloqueo_hasta) : null;

  return (
    <Modal open={!!sesion} onClose={onClose} title={sesion.telefono}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${estado.colorClase}`} />
          <span className="text-sm font-semibold text-slate-900">{TITULO_TIPO[estado.tipo] || 'Conversación'}</span>
        </div>

        <p className="text-xs text-slate-500">
          Último mensaje: {fmtTimestamp(sesion.ultimo_mensaje_at)} · {sesion.contador_mensajes ?? 0} mensajes sin completar
        </p>

        {estado.esModoHumano ? (
          <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800 ring-1 ring-violet-600/20">
            🧑 Un humano tomó esta conversación — el bot no está respondiendo a este número.
          </p>
        ) : estado.esBloqueada ? (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-600/20">
            🔒 Este número está pausado{minRestantes ? ` por ${minRestantes} min más` : ''} por demasiados intentos sin completar una reserva.
          </p>
        ) : estado.esVacia ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
            💬 No hay una conversación en curso con este número (sin actividad reciente, o el bot todavía no recibió un primer mensaje).
          </p>
        ) : (
          <>
            {estado.alerta ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800 ring-1 ring-amber-600/20">
                ⏳ {estado.alerta}
              </p>
            ) : null}

            <ol className="space-y-3">
              {estado.pasos.map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <IconoPaso estado={p.estado} />
                  <span className={`pt-0.5 text-sm ${p.estado === 'actual' ? 'font-semibold text-slate-900' : p.estado === 'completado' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {p.label}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </Modal>
  );
}
