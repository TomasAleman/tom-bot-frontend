/** RBAC panel (014): recepcionista; legacy `staff`. */
export function isRecepcionista(rol) {
  return rol === 'recepcionista' || rol === 'staff';
}

/** RBAC panel (040): jefe multi-sucursal, solo lectura de Dashboard. */
export function isJefe(rol) {
  return rol === 'jefe';
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
