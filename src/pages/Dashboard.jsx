import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import KpiCard from '../components/KpiCard.jsx';
import EstadoBadge from '../components/EstadoBadge.jsx';
import { Select, Button } from '../components/Field.jsx';
import { fmtFechaCorta, fmtHora } from '../lib/format.js';
import { Icon } from '../components/Icon.jsx';
import DonutChart from '../components/DonutChart.jsx';
import BarChartCategorias, { BarChartHorizontal } from '../components/BarChartCategorias.jsx';
import SeccionDesplegable from '../components/SeccionDesplegable.jsx';

/** Altura máxima de una barra (el contenedor es h-32 = 128px; se deja margen arriba para que no toque las etiquetas). */
const BAR_MAX_PX = 104;

function barHeightPx(confirmadas, maxCount) {
  const count = confirmadas ?? 0;
  if (maxCount === 0 || count === 0) return 2;
  return Math.max(4, Math.round((count / maxCount) * BAR_MAX_PX));
}

async function descargarPdf(queryString) {
  const res = await api.get(`/metricas/pdf${queryString}`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const esJefe = usuario?.rol === 'jefe';
  const restaurantesAsignados = usuario?.restaurantes_asignados || [];

  const [restauranteSel, setRestauranteSel] = useState('todas');
  const [descargando, setDescargando] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const queryString = esJefe && restauranteSel !== 'todas' ? `?restaurante_id=${restauranteSel}` : '';

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['metricas', esJefe ? restauranteSel : null],
    queryFn: async () => (await api.get(`/metricas${queryString}`)).data,
  });

  const onDescargarPdf = async () => {
    setPdfError(null);
    setDescargando(true);
    try {
      await descargarPdf(queryString);
    } catch (err) {
      setPdfError(apiError(err, 'No se pudo generar el PDF'));
    } finally {
      setDescargando(false);
    }
  };

  if (esJefe && restaurantesAsignados.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-200">
        No tenés sucursales asignadas. Pedile a un superadmin que te asigne alguna.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Cargando métricas…</p>;
  }
  if (isError) {
    return <p className="text-sm text-rose-600">Error: {apiError(error)}</p>;
  }

  const { hoy, semana_pasada: semanaPasada, semana, mes, por_dia, proximas, restaurantes_incluidos, tendencia_semanal: tendenciaSemanal } = data;
  const vistaCruzada = esJefe && restauranteSel === 'todas' && restaurantes_incluidos.length > 1;
  const mostrarRanking = vistaCruzada && (data.ranking_sucursales?.length || 0) > 1;
  const maxPorDia = por_dia.length
    ? Math.max(...por_dia.map((d) => Math.max(d.confirmadas ?? 0, d.walkins ?? 0)))
    : 0;

  return (
    <div className="space-y-6">
      {esJefe && (
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="sm:w-64">
              <label className="block text-xs font-medium text-slate-600">Sucursal</label>
              <Select value={restauranteSel} onChange={(e) => setRestauranteSel(e.target.value)}>
                <option value="todas">Todas (vista cruzada)</option>
                {restaurantesAsignados.map((r) => (
                  <option key={r.id} value={String(r.id)}>{r.nombre}</option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" onClick={onDescargarPdf} disabled={descargando}>
              <Icon name="download" className="h-4 w-4" />
              {descargando ? 'Generando…' : 'Descargar PDF'}
            </Button>
          </div>
          {vistaCruzada && (
            <p className="mt-2 text-xs text-slate-500">
              Agregando: {restaurantes_incluidos.map((r) => r.nombre).join(', ')}
            </p>
          )}
          {pdfError && <p className="mt-2 text-xs text-rose-600">{pdfError}</p>}
        </div>
      )}

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

      <SeccionDesplegable title="Última semana">
        <BloquePeriodo p={semanaPasada} />
      </SeccionDesplegable>

      <SeccionDesplegable title="Mes en curso">
        <BloquePeriodo p={mes} />
      </SeccionDesplegable>

      <SeccionDesplegable title="Próximos 7 días">
        <BloquePeriodo p={semana} />
      </SeccionDesplegable>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Tendencia (últimas 8 semanas)</h2>
        <BarChartCategorias
          items={tendenciaSemanal.map((s) => ({ label: fmtFechaCorta(s.semana_inicio), value: s.confirmadas, serieLabel: 'Confirmadas' }))}
          items2={tendenciaSemanal.map((s) => ({ value: s.no_show }))}
          label2="No-show"
        />
      </section>

      {mostrarRanking && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Ranking de sucursales (ocupación del mes)</h2>
          <BarChartHorizontal
            items={[...data.ranking_sucursales]
              .sort((a, b) => b.ocupacion_pct_mes - a.ocupacion_pct_mes)
              .map((r) => ({ label: r.nombre, value: r.ocupacion_pct_mes }))}
            formatValue={(v) => `${v}%`}
          />
        </section>
      )}

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
          {!esJefe && (
            <Link to="/reservas" className="text-sm font-medium text-slate-700 hover:underline">
              Ver todas
            </Link>
          )}
        </div>
        {proximas.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500 sm:px-5">Sin reservas confirmadas próximas.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {proximas.map((r) => (
              <li key={r.id} className="px-4 py-3 sm:px-5">
                {esJefe ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{r.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {r.telefono}
                        {vistaCruzada && r.restaurante_nombre ? ` · ${r.restaurante_nombre}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">{fmtFechaCorta(r.dia)} · {fmtHora(r.horario_hora)}</p>
                      <p className="text-xs text-slate-500">{r.personas} personas</p>
                    </div>
                    <EstadoBadge estado={r.estado} />
                  </div>
                ) : (
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
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Mismos colores que EstadoBadge (lib/format.js: clsBadge) para que el gráfico sea consistente con el resto del panel. */
const COLOR_ESTADO = {
  Reservado: '#0ea5e9',
  Confirmada: '#10b981',
  Asistencia: '#047857',
  Cancelada: '#f43f5e',
  'No-show': '#f59e0b',
};

/** Contenido completo de un período desplegable: KPIs, ocupación/anticipación y gráficos. */
function BloquePeriodo({ p }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Confirmadas" value={p.confirmadas} sub={`${p.personas} personas`} />
        <KpiCard title="Canceladas"  value={p.canceladas} />
        <KpiCard title="No vino"     value={p.no_show} />
        <KpiCard title="Personas por reserva" value={p.personas} />
        <KpiCard title="Walk-in"     value={p.walkins} sub={`${p.walkins_personas} personas`} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard title="Ocupación" value={`${p.ocupacion_pct}%`} sub={`${p.ocupacion_personas} / ${p.ocupacion_capacidad} personas`} />
        <KpiCard title="Anticipación promedio" value={`${p.anticipacion_promedio_dias} días`} />
      </div>
      <GraficosPeriodo p={p} />
    </>
  );
}

/** Gráficos de un período (semana o mes): canal, composición, sector, turno, día de semana, tamaño de grupo. */
function GraficosPeriodo({ p }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <DonutChart
        title="Reservas por canal"
        slices={[
          { label: 'WhatsApp', value: p.reservas_bot, color: '#10b981' },
          { label: 'Panel', value: p.reservas_panel, color: '#3b82f6' },
        ]}
      />
      <DonutChart
        title="Composición del período"
        slices={p.por_estado.map((s) => ({ ...s, color: COLOR_ESTADO[s.label] }))}
      />
      <DonutChart title="Por sector" slices={p.por_sector} />
      <DonutChart title="Por turno" slices={p.por_turno} />
      <BarChartCategorias title="Día de la semana" items={p.por_dia_semana} />
      <BarChartCategorias
        title="Personas por reserva, por turno"
        items={p.por_turno.map((t) => ({ label: t.label, value: t.personas_promedio }))}
      />
    </div>
  );
}
