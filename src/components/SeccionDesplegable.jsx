import { useState } from 'react';

/** Sección con título plegable (mismo patrón ya usado para el panel de Filtros en Reservas.jsx). */
export default function SeccionDesplegable({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <span className="text-slate-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}
