const PALETA = ['#0f172a', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#14b8a6', '#ec4899'];

/** Convierte un slice {label, value} en el path SVG de su porción de torta. */
function wedgePath(cx, cy, radius, anguloIni, anguloFin) {
  const x1 = cx + radius * Math.cos(anguloIni);
  const y1 = cy + radius * Math.sin(anguloIni);
  const x2 = cx + radius * Math.cos(anguloFin);
  const y2 = cy + radius * Math.sin(anguloFin);
  const largeArc = anguloFin - anguloIni > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/**
 * Gráfico de torta/dona hecho a mano (sin librería), con números y etiquetas.
 * `slices`: [{ label, value, color? }]. Si no hay datos (todos los value en 0), muestra un estado vacío.
 */
function pct(value, total) {
  if (!total) return 0;
  return Math.round((Number(value) / total) * 1000) / 10;
}

export default function DonutChart({ title, slices = [], size = 140 }) {
  const total = slices.reduce((s, x) => s + (Number(x.value) || 0), 0);
  const radius = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;

  let anguloIni = -Math.PI / 2;
  const wedges = total > 0
    ? slices
        .filter((s) => Number(s.value) > 0)
        .map((s, i) => {
          const anguloFin = anguloIni + (Number(s.value) / total) * Math.PI * 2;
          const path = wedgePath(cx, cy, radius, anguloIni, anguloFin);
          anguloIni = anguloFin;
          return { ...s, path, color: s.color || PALETA[i % PALETA.length] };
        })
    : [];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {title && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>}
      <div className="flex items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
          {total > 0 ? (
            wedges.map((w) => (
              <path key={w.label} d={w.path} fill={w.color}>
                <title>{`${w.label}: ${w.value} (${pct(w.value, total)}%)`}</title>
              </path>
            ))
          ) : (
            <>
              <circle cx={cx} cy={cy} r={radius} fill="#e2e8f0" />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#64748b">
                Sin datos
              </text>
            </>
          )}
        </svg>
        <ul className="min-w-0 flex-1 space-y-1">
          {(total > 0 ? slices.filter((s) => Number(s.value) > 0) : slices).map((s, i) => (
            <li
              key={s.label}
              className="flex items-center gap-2 text-xs"
              title={total > 0 ? `${s.label}: ${s.value} (${pct(s.value, total)}%)` : undefined}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color || PALETA[i % PALETA.length] }}
              />
              <span className="truncate text-slate-700">{s.label}</span>
              <span className="ml-auto font-semibold text-slate-900">
                {s.value}{total > 0 ? ` (${pct(s.value, total)}%)` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
