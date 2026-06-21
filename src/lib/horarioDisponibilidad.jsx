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

/** Mesas libres donde el grupo cabe en el máximo pero está por debajo del mínimo (mesa más grande). */
export function mesasGrandesParaPersonas(libres, personas) {
  return (libres || []).filter((m) => personas <= m.max_personas && personas < m.min_personas);
}

/** Mesas libres que permiten juntarse con otras del mismo sector. */
export function mesasElegiblesJunte(libres) {
  return (libres || []).filter((m) => m.permite_junte !== false);
}

function groupBySector(mesas) {
  const map = new Map();
  for (const m of mesas || []) {
    const sid = m.sector_id;
    if (sid == null) continue;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid).push(m);
  }
  return map;
}

/**
 * Evalúa si algún sector tiene cupo de junte para N personas.
 * Requiere ≥2 mesas con permite_junte, personas > máximo individual del sector,
 * y suma de máximos del sector ≥ personas.
 */
export function analizarJuntePorSector(libres, personas) {
  const elegibles = mesasElegiblesJunte(libres);
  const porSector = groupBySector(elegibles);
  let sectorElegible = null;

  for (const [, mesas] of porSector) {
    if (mesas.length < 2) continue;
    const maxMax = Math.max(...mesas.map((m) => m.max_personas));
    const sumMax = mesas.reduce((s, m) => s + m.max_personas, 0);
    if (personas > maxMax && sumMax >= personas) {
      sectorElegible = {
        sectorId: mesas[0].sector_id,
        sectorNombre: mesas[0].sector_nombre || '',
        mesas,
        maxMax,
        sumMax,
      };
      break;
    }
  }

  return {
    ofrecerJunte: Boolean(sectorElegible),
    sectorElegible,
  };
}

/** Verifica que todas las mesas seleccionadas pertenezcan al mismo sector. */
export function junteMismoSector(selModels) {
  if (!selModels?.length) return true;
  const sid = selModels[0].sector_id;
  return selModels.every((m) => m.sector_id === sid);
}

