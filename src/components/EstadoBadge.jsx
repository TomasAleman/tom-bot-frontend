import { clsBadge, labelEstado } from '../lib/format.js';

export default function EstadoBadge({ estado }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${clsBadge(estado)}`}>
      {labelEstado(estado)}
    </span>
  );
}
