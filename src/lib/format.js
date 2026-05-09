export function fmtFecha(iso) {
  if (!iso) return '';
  const s = String(iso);
  if (s.length >= 10 && s[4] === '-' && s[7] === '-') {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR');
  } catch {
    return s;
  }
}

export function fmtFechaCorta(iso) {
  if (!iso) return '';
  const s = String(iso);
  if (s.length >= 10) {
    const [, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}`;
  }
  return s;
}

/**
 * `horario_hora` en API: minutos desde medianoche (0–1439) tras migración Postgres.
 * Devuelve siempre "HH:MM" en 24 h.
 */
export function fmtHora(horaInt) {
  if (horaInt === null || horaInt === undefined) return '';
  const n = Number(horaInt);
  if (!Number.isFinite(n) || n < 0 || n > 1439) return '';
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Valor para `<input type="time" />` (mismo criterio que fmtHora). */
export function fmtHoraParaInput(horaInt) {
  return fmtHora(horaInt);
}

/** Parsea "H:MM" o "HH:MM" → minutos 0–1439, o null. */
export function minutosDesdeHHMM(s) {
  if (s == null || s === '') return null;
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

export function fmtTimestamp(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export function clsBadge(estado) {
  switch ((estado || '').toLowerCase()) {
    case 'confirmada': return 'bg-emerald-100 text-emerald-800 ring-emerald-600/20';
    case 'cancelada':  return 'bg-rose-100 text-rose-800 ring-rose-600/20';
    case 'noshow':     return 'bg-amber-100 text-amber-800 ring-amber-600/20';
    default:           return 'bg-slate-100 text-slate-700 ring-slate-500/20';
  }
}

export function labelEstado(estado) {
  switch ((estado || '').toLowerCase()) {
    case 'confirmada': return 'Confirmada';
    case 'cancelada':  return 'Cancelada';
    case 'noshow':     return 'No-show';
    default:           return estado || '—';
  }
}
