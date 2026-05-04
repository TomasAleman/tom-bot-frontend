export default function KpiCard({ title, value, sub, tone = 'default' }) {
  const toneCls = {
    default: 'bg-white text-slate-900',
    success: 'bg-emerald-50 text-emerald-900',
    warning: 'bg-amber-50 text-amber-900',
    danger:  'bg-rose-50 text-rose-900',
    brand:   'bg-slate-900 text-white',
  }[tone] || 'bg-white text-slate-900';

  return (
    <div className={`rounded-2xl p-4 shadow-sm ring-1 ring-slate-200 ${toneCls}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{title}</p>
      <p className="mt-1 text-2xl font-semibold sm:text-3xl">{value}</p>
      {sub ? <p className="mt-1 text-xs opacity-70">{sub}</p> : null}
    </div>
  );
}
