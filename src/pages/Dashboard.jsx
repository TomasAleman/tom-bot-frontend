import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';
import KpiCard from '../components/KpiCard.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import { fmtFechaCorta, fmtHora } from '../lib/format.js';
import { Icon } from '../components/Icon.jsx';

/** Altura máxima de una barra (el contenedor es h-32 = 128px; se deja margen arriba para que no toque las etiquetas). */
const BAR_MAX_PX = 104;

function barHeightPx(confirmadas, maxCount) {
  const count = confirmadas ?? 0;
  if (maxCount === 0 || count === 0) return 2;
  return Math.max(4, Math.round((count / maxCount) * BAR_MAX_PX));
}

export default function Dashboard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['metricas'],
    queryFn: async () => (await api.get('/metricas')).data,
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando métricas…</p>;
  }
  if (isError) {
    return <p className="text-sm text-rose-600">Error: {apiError(error)}</p>;
  }

  const { hoy, semana, mes, por_dia, proximas } = data;
  const maxPorDia = por_dia.length
    ? Math.max(...por_dia.map((d) => Math.max(d.confirmadas ?? 0, d.walkins ?? 0)))
    : 0;

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hoy</h2>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            disabled={isFetching}
          >
            <Icon name="refresh" className="h-4 w-4" />
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard tone="brand"   title="Reservas hoy" value={hoy.confirmadas} sub={`${hoy.personas} personas`} />
          <KpiCard tone="warning" title="Canceladas hoy" value={hoy.canceladas} />
          <KpiCard tone="danger"  title="No vino hoy" value={hoy.no_show} />
          <KpiCard                title="Personas por reserva hoy" value={hoy.personas} />
          <KpiCard tone="success" title="Walk-in hoy" value={hoy.walkins} sub={`${hoy.walkins_personas} personas`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Próximos 7 días</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard title="Confirmadas" value={semana.confirmadas} sub={`${semana.personas} personas`} />
          <KpiCard title="Canceladas"  value={semana.canceladas} />
          <KpiCard title="No vino"     value={semana.no_show} />
          <KpiCard title="Personas por reserva" value={semana.personas} />
          <KpiCard title="Walk-in"     value={semana.walkins} sub={`${semana.walkins_personas} personas`} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Mes en curso</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KpiCard title="Confirmadas" value={mes.confirmadas} />
          <KpiCard title="Canceladas"  value={mes.canceladas} />
          <KpiCard title="No vino"     value={mes.no_show} />
          <KpiCard title="Personas por reserva" value={mes.personas} />
          <KpiCard title="Walk-in"     value={mes.walkins} sub={`${mes.walkins_personas} personas`} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Últimos 14 días</h2>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-slate-900/80" /> Reservas</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Walk-in</span>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex h-32 items-end gap-1 sm:gap-2">
            {por_dia.map((d) => {
              const confirmadas = d.confirmadas ?? 0;
              const walkins = d.walkins ?? 0;
              return (
                <div
                  key={d.dia}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <div className="flex h-full w-full items-end justify-center gap-0.5">
                    <div
                      className="w-1/2 rounded-t bg-slate-900/80"
                      style={{ height: barHeightPx(confirmadas, maxPorDia) }}
                      title={`${fmtFechaCorta(d.dia)}: ${confirmadas} reserva${confirmadas === 1 ? '' : 's'}`}
                      role="img"
                      aria-label={`${fmtFechaCorta(d.dia)}: ${confirmadas} reservas confirmadas`}
                    />
                    <div
                      className="w-1/2 rounded-t bg-emerald-500"
                      style={{ height: barHeightPx(walkins, maxPorDia) }}
                      title={`${fmtFechaCorta(d.dia)}: ${walkins} walk-in${walkins === 1 ? '' : 's'}`}
                      role="img"
                      aria-label={`${fmtFechaCorta(d.dia)}: ${walkins} walk-ins`}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[9px] text-slate-500 sm:text-[10px]">
                    <span className="hidden sm:inline">{fmtFechaCorta(d.dia)}</span>
                    <span className="sm:hidden">{fmtFechaCorta(d.dia).split('/')[0]}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Próximas reservas</h2>
          <Link to="/reservas" className="text-sm font-medium text-slate-700 hover:underline">
            Ver todas
          </Link>
        </div>
        {proximas.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 sm:px-5">Sin reservas confirmadas próximas.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {proximas.map((r) => (
              <li key={r.id} className="px-4 py-3 sm:px-5">
                <Link to={`/reservas/${r.id}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.nombre}</p>
                    <p className="text-xs text-slate-500">{r.telefono}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">{fmtFechaCorta(r.dia)} · {fmtHora(r.horario_hora)}</p>
                    <p className="text-xs text-slate-500">{r.personas} personas</p>
                  </div>
                  <EstadoBadge estado={r.estado} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
