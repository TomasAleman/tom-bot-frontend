const BAR_MAX_PX = 104;

function barHeightPx(value, maxValue) {
  const v = value ?? 0;
  if (maxValue === 0 || v === 0) return 2;
  return Math.max(4, Math.round((v / maxValue) * BAR_MAX_PX));
}

function pct(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / total) * 1000) / 10;
}

/**
 * Barras verticales por categoría (sin librería). `items`: [{ label, value }].
 * `items2` opcional agrega una segunda serie por categoría (mismo `label`), con su propio color/leyenda.
 */
export default function BarChartCategorias({ title, items = [], items2 = null, color = 'bg-slate-900/80', color2 = 'bg-emerald-500', label2 }) {
  const max = items.length
    ? Math.max(...items.map((d, i) => Math.max(d.value ?? 0, items2?.[i]?.value ?? 0)))
    : 0;
  const sinDatos = max === 0;
  const totalItems = items.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const totalItems2 = items2 ? items2.reduce((s, d) => s + (Number(d.value) || 0), 0) : 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between">
        {title && <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>}
        {items2 && (
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${color}`} /> {items[0]?.serieLabel || 'Serie 1'}</span>
            <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-sm ${color2}`} /> {label2 || 'Serie 2'}</span>
          </div>
        )}
      </div>
      {sinDatos ? (
        <p className="flex h-32 items-center justify-center text-xs text-slate-400">Sin datos</p>
      ) : (
        <div className="flex h-32 items-end gap-1">
          {items.map((d, i) => (
            <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div
                  className={`w-full rounded-t ${color}`}
                  style={{ height: barHeightPx(d.value, max), width: items2 ? '50%' : '100%' }}
                  title={`${d.label}: ${d.value} (${pct(d.value, totalItems)}%)`}
                />
                {items2 && (
                  <div
                    className={`w-1/2 rounded-t ${color2}`}
                    style={{ height: barHeightPx(items2[i]?.value, max) }}
                    title={`${d.label}: ${items2[i]?.value ?? 0} (${pct(items2[i]?.value, totalItems2)}%)`}
                  />
                )}
              </div>
              <span className="whitespace-nowrap text-[9px] text-slate-500">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Barras horizontales (para rankings con nombre largo a la izquierda). `items`: [{ label, value }]. */
export function BarChartHorizontal({ title, items = [], color = 'bg-slate-900/80', formatValue = (v) => v }) {
  const max = items.length ? Math.max(...items.map((d) => d.value ?? 0)) : 0;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {title && <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>}
      {items.length === 0 ? (
        <p className="flex h-16 items-center justify-center text-xs text-slate-400">Sin datos</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.label} className="text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="truncate text-slate-700">{d.label}</span>
                <span className="font-semibold text-slate-900">{formatValue(d.value)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100" title={`${d.label}: ${formatValue(d.value)}`}>
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: max > 0 ? `${Math.max(2, ((d.value ?? 0) / max) * 100)}%` : '0%' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
