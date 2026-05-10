/** RBAC panel (014): recepcionista; legacy `staff`. */
export function isRecepcionista(rol) {
  return rol === 'recepcionista' || rol === 'staff';
}

/**
 * Destino tras login o ruta `/`: recepcionista solo ve Reservas (y detalle bajo /reservas/*).
 */
export function homePathForRol(rol, fromState) {
  if (isRecepcionista(rol)) {
    if (fromState && String(fromState).startsWith('/reservas')) return fromState;
    return '/reservas';
  }
  return fromState || '/dashboard';
}
