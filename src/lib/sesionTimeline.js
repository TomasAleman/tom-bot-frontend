/**
 * Traduce `contexto_reserva` (el JSONB que persiste el bot de WhatsApp) a
 * un estado visual: tipo de flujo, pasos de un timeline y una alerta si el
 * bot está esperando una confirmación sí/no del cliente.
 *
 * Claves de contexto_reserva relevantes (ver microservice/src/bot/**):
 *   modo: 'modificar' | 'cancelar' (ausente = crear/menú)
 *   paso: paso actual dentro de modificar/cancelar
 *   menu_principal_pendiente, iniciando_reserva
 *   dia, personas, nombre, horario_minutos, numeroMesa
 *   confirmacion_horario_ingreso_pendiente, confirmacion_reserva_pendiente,
 *   nombre_pendiente_post_mesa, sin_disponibilidad_pendiente,
 *   fecha_pendiente_confirmacion, horario_propuesto_minutos
 *   reservas_listadas (array, solo se usa el largo)
 */

function paso(label, estado) {
  return { label, estado };
}

export function derivarEstadoSesion(contexto, bloqueoHasta, modoHumano) {
  const ctx = contexto && typeof contexto === 'object' ? contexto : {};
  const claves = Object.keys(ctx);
  const esVacia = claves.length === 0;
  const bloqueada = !!(bloqueoHasta && new Date(bloqueoHasta) > new Date());

  if (modoHumano) {
    return { tipo: 'modo_humano', colorClase: 'bg-violet-500', pasos: [], alerta: null, esVacia: false, esBloqueada: false, esModoHumano: true };
  }
  if (esVacia && bloqueada) {
    return { tipo: 'bloqueada', colorClase: 'bg-rose-500', pasos: [], alerta: null, esVacia: true, esBloqueada: true };
  }
  if (esVacia) {
    return { tipo: 'vacia', colorClase: 'bg-slate-300', pasos: [], alerta: null, esVacia: true, esBloqueada: false };
  }

  if (ctx.modo === 'modificar') return derivarModificar(ctx);
  if (ctx.modo === 'cancelar') return derivarCancelar(ctx);
  if (ctx.menu_principal_pendiente === true) {
    return {
      tipo: 'menu',
      colorClase: 'bg-sky-500',
      pasos: [paso('Eligiendo una opción del menú principal', 'actual')],
      alerta: null,
      esVacia: false,
      esBloqueada: false,
    };
  }
  return derivarCrear(ctx);
}

function derivarCrear(ctx) {
  const tieneDia = !!ctx.dia;
  const tienePersonas = ctx.personas != null;
  const tieneNombre = !!ctx.nombre;
  const tieneMesa = ctx.numeroMesa != null;

  const pasos = [paso('Inicio: eligió "Hacer una reserva"', 'completado')];

  // Día y hora
  if (ctx.fecha_pendiente_confirmacion) {
    pasos.push(paso('Día y hora', tieneDia ? 'completado' : 'pendiente'));
    pasos.push(paso('Confirmando si la fecha entendida es correcta', 'actual'));
  } else if (ctx.confirmacion_horario_ingreso_pendiente) {
    pasos.push(paso('Día y hora', 'completado'));
    pasos.push(paso('Confirmando horario alternativo propuesto', 'actual'));
  } else {
    pasos.push(paso('Día y hora', tieneDia ? 'completado' : 'actual'));
  }

  // Personas
  if (!ctx.fecha_pendiente_confirmacion && !ctx.confirmacion_horario_ingreso_pendiente) {
    pasos.push(paso('Cantidad de personas', tienePersonas ? 'completado' : (tieneDia ? 'actual' : 'pendiente')));
  }

  if (ctx.sin_disponibilidad_pendiente) {
    pasos.push(paso('Sin disponibilidad: preguntando si quiere otra fecha', 'actual'));
    return cerrar('crear', pasos, '¿El cliente quiere intentar con otra fecha? (sí/no)');
  }

  // Nombre
  if (ctx.nombre_pendiente_post_mesa) {
    pasos.push(paso('Mesa encontrada, pidiendo el nombre', 'actual'));
    return cerrar('crear', pasos, 'Esperando el nombre para la reserva');
  }
  pasos.push(paso('Nombre', tieneNombre ? 'completado' : (tieneMesa ? 'actual' : 'pendiente')));

  // Confirmación final
  if (ctx.confirmacion_reserva_pendiente) {
    pasos.push(paso('Confirmación final de la reserva', 'actual'));
    return cerrar('crear', pasos, '¿Confirma la reserva? (sí/no)');
  }
  pasos.push(paso('Confirmación final', tieneNombre && tieneMesa ? 'actual' : 'pendiente'));

  return cerrar('crear', pasos, null);
}

function derivarModificar(ctx) {
  const cantidad = Array.isArray(ctx.reservas_listadas) ? ctx.reservas_listadas.length : null;
  const pasoActual = ctx.paso;
  const pasos = [];

  if (cantidad != null) {
    pasos.push(paso(`Eligiendo entre ${cantidad} reservas activas`, pasoActual === 'elegir_reserva' ? 'actual' : 'completado'));
  } else {
    pasos.push(paso('Reserva identificada', 'completado'));
  }

  pasos.push(paso('Elegir qué campo cambiar (nombre, horario, día o personas)', pasoActual === 'elegir_campo' ? 'actual' : (pasoActual ? 'completado' : 'pendiente')));
  pasos.push(paso('Indicar el nuevo valor', pasoActual === 'pedir_nuevo_valor' ? 'actual' : (['confirmacion_horario_modificar', 'confirmar_otro'].includes(pasoActual) ? 'completado' : 'pendiente')));

  let alerta = null;
  if (pasoActual === 'confirmacion_horario_modificar') {
    pasos.push(paso('Confirmando horario alternativo propuesto', 'actual'));
    alerta = '¿El cliente acepta el horario alternativo? (sí/no)';
  } else if (pasoActual === 'confirmar_otro') {
    pasos.push(paso('Cambio aplicado — ¿quiere modificar algo más?', 'actual'));
    alerta = '¿El cliente quiere seguir modificando? (sí/no)';
  } else {
    pasos.push(paso('Cambio aplicado', 'pendiente'));
  }

  return { tipo: 'modificar', colorClase: 'bg-amber-500', pasos, alerta, esVacia: false, esBloqueada: false };
}

function derivarCancelar(ctx) {
  const cantidad = Array.isArray(ctx.reservas_listadas) ? ctx.reservas_listadas.length : null;
  const pasoActual = ctx.paso;
  const pasos = [];

  if (cantidad != null) {
    pasos.push(paso(`Eligiendo entre ${cantidad} reservas activas`, pasoActual === 'elegir_reserva' ? 'actual' : 'completado'));
  } else {
    pasos.push(paso('Reserva identificada', 'completado'));
  }

  let alerta = null;
  if (pasoActual === 'confirmar_cancelacion') {
    pasos.push(paso('Confirmando la cancelación', 'actual'));
    alerta = '¿El cliente confirma que quiere cancelar? (sí/no)';
  } else {
    pasos.push(paso('Confirmar la cancelación', 'pendiente'));
  }

  return { tipo: 'cancelar', colorClase: 'bg-rose-500', pasos, alerta, esVacia: false, esBloqueada: false };
}

function cerrar(tipo, pasos, alerta) {
  return { tipo, colorClase: 'bg-emerald-500', pasos, alerta, esVacia: false, esBloqueada: false };
}
