import { fmtHora } from './format.js';

/** Etiqueta de opción en el select de horarios de ingreso. */
export function labelHorarioOption(h) {
  const hora = fmtHora(Number(h.valor));
  const base = h.esActual ? `${hora} (actual)` : hora;
  if (h.tipo === 'mesa_grande') return `${base} · mesa más grande`;
  if (h.tipo === 'junte') return `${base} · juntar mesas`;
  return base;
}

export function horariosTienenTipo(horarios, tipo) {
  return (horarios || []).some((h) => h.tipo === tipo);
}

