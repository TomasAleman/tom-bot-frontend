import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';
import KpiCard from '../components/KpiCard.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import { fmtFechaCorta, fmtHora } from '../lib/format.js';
import { Icon } from '../components/Icon.jsx';

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
  const maxBar = Math.max(1, ...por_dia.map((d) => (d.confirmadas || 0) + (d.canceladas || 0) + (d.no_show || 0)));

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard tone="brand"   title="Reservas hoy" value={hoy.confirmadas} sub={`${hoy.personas} personas`} />
          <KpiCard tone="warning" title="Canceladas hoy" value={hoy.canceladas} />
          <KpiCard tone="danger"  title="No-show hoy" value={hoy.no_show} />
          <KpiCard                title="Personas hoy" value={hoy.personas} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Próximos 7 días</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Confirmadas" value={semana.confirmadas} sub={`${semana.personas} personas`} />
          <KpiCard title="Canceladas"  value={semana.canceladas} />
          <KpiCard title="No-show"     value={semana.no_show} />
          <KpiCard title="Personas"    value={semana.personas} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Mes en curso</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard title="Confirmadas" value={mes.confirmadas} />
          <KpiCard title="Canceladas"  value={mes.canceladas} />
          <KpiCard title="No-show"     value={mes.no_show} />
          <KpiCard title="Personas"    value={mes.personas} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Últimos 14 días</h2>
        <div className="overflow-x-auto">
          <div className="flex h-32 min-w-full items-end gap-1.5 sm:gap-2">
            {por_dia.map((d) => {
              const total = (d.confirmadas || 0) + (d.canceladas || 0) + (d.no_show || 0);
              const h = Math.round((total / maxBar) * 100);
              return (
                <div key={d.dia} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-slate-900/80"
                    style={{ height: `${h}%`, minHeight: total ? '4px' : '2px' }}
                    title={`${d.dia}: ${total}`}
                  />
                  <span className="text-[10px] text-slate-500">{fmtFechaCorta(d.dia)}</span>
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
