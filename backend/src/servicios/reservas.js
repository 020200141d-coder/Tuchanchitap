// ============================================================================
//  src/servicios/reservas.js — el corazón del sistema
//
//  crear() aplica, en este orden:
//   Regla 8: no se reserva en el pasado, ni más allá de DIAS_ANTICIPACION, ni
//            fuera del horario de la cancha (horas sin tarifa) → 422.
//   Regla 3: el total sale de las tarifas por franja (servicios/precios.js);
//            el adelanto es PORCENTAJE_ADELANTO % del total.
//   Regla 1: si la hora se cruza con otra reserva activa o con un bloqueo
//            → 409. Se revisa DENTRO de una transacción Serializable para que
//            dos jugadores que aprietan "Reservar" a la vez no se lleven la
//            misma hora (PostgreSQL rechaza a uno y respondemos 409).
//   Regla 2: nace PENDIENTE_PAGO con expiraEn = ahora + MINUTOS_SEPARACION.
//            Si no sube comprobante a tiempo, mantenimiento() la expira.
//   Extra:   un jugador no puede tener más de 3 reservas esperando pago a la
//            vez (evita que alguien "acapare" horas sin pagar).
//   Extra:   si quien reserva es el dueño de la cancha o ADMIN (cliente que
//            llegó en persona o llamó), queda CONFIRMADA sin adelanto.
//
//  cancelar() aplica la regla 5: si el JUGADOR cancela una reserva confirmada
//  con menos de HORAS_CANCELACION horas de anticipación, pierde el adelanto.
//  Si cancela el dueño, nunca se pierde (el dueño debe devolverlo).
// ============================================================================

const db = require('../db');
const config = require('../config');
const { noEncontrado, prohibido, conflicto, invalido } = require('../lib/errores');
const { aUtc, diaSemana, hoyLocal, sumarDias, HORA_MS } = require('../lib/horario');
const { asegurarDueno, esAdmin } = require('./canchas');
const { calcularPrecio, calcularAdelanto } = require('./precios');
const { reservasQueCruzan, bloqueosQueCruzan } = require('./disponibilidad');
const { mantenimiento } = require('./mantenimiento');

const MAX_PENDIENTES = 3;
const MINUTO_MS = 60 * 1000;

// Datos de la cancha que el jugador necesita para pagar y llegar.
const INCLUIR_PARA_JUGADOR = { cancha: true, pagos: { orderBy: { creadoEn: 'desc' } }, resena: true };

function vistaCancha(c) {
  if (!c) return c;
  return { id: c.id, nombre: c.nombre, zona: c.zona, direccion: c.direccion, lat: c.lat, lng: c.lng, telefono: c.telefono, qrPagoUrl: c.qrPagoUrl, duenoId: c.duenoId };
}
const vistaReserva = r => ({ ...r, cancha: vistaCancha(r.cancha) });

async function crear(usuario, { canchaId, fecha, horaInicio, horas }, ahora = new Date()) {
  const cancha = await db.cancha.findUnique({ where: { id: canchaId } });
  const esDelLocal = cancha && (esAdmin(usuario) || cancha.duenoId === usuario.id);
  if (!cancha || (!cancha.publicada && !esDelLocal)) throw noEncontrado('La cancha');

  // Regla 8: tiempo válido
  if (horaInicio + horas > 24) throw invalido('La reserva no puede pasar de medianoche', { horas: 'Reduce las horas' });
  const inicio = aUtc(fecha, horaInicio);
  const fin = new Date(inicio.getTime() + horas * HORA_MS);
  if (inicio <= ahora) throw invalido('No se puede reservar una hora que ya pasó', { horaInicio: 'Elige una hora futura' });
  const limite = sumarDias(hoyLocal(ahora), config.reglas.diasAnticipacion);
  if (fecha > limite) throw invalido(`Solo se reserva con hasta ${config.reglas.diasAnticipacion} días de anticipación`, { fecha: 'Muy lejana' });

  // Regla 3 (y 8: fuera de horario → 422)
  const tarifas = await db.tarifa.findMany({ where: { canchaId, diaSemana: diaSemana(fecha) } });
  const { total, detalle } = calcularPrecio(tarifas, diaSemana(fecha), horaInicio, horas);

  await mantenimiento(ahora); // libera las vencidas antes de revisar cruces

  if (!esDelLocal) {
    const pendientes = await db.reserva.count({ where: { jugadorId: usuario.id, estado: 'PENDIENTE_PAGO' } });
    if (pendientes >= MAX_PENDIENTES) throw conflicto(`Tienes ${pendientes} reservas esperando pago. Paga o cancela alguna antes de separar otra.`);
  }

  const reserva = await db.$transaction(
    async tx => {
      // Regla 1
      if ((await reservasQueCruzan(canchaId, inicio, fin, tx)).length > 0) throw conflicto('Esa hora ya está reservada. Elige otra.');
      if ((await bloqueosQueCruzan(canchaId, inicio, fin, tx)).length > 0) throw conflicto('La cancha está cerrada en ese horario (bloqueo del dueño).');
      return tx.reserva.create({
        data: {
          canchaId,
          jugadorId: usuario.id,
          inicio,
          fin,
          total,
          adelanto: esDelLocal ? 0 : calcularAdelanto(total, config.reglas.porcentajeAdelanto),
          estado: esDelLocal ? 'CONFIRMADA' : 'PENDIENTE_PAGO',
          // Regla 2: separa la hora unos minutos
          expiraEn: esDelLocal ? null : new Date(ahora.getTime() + config.reglas.minutosSeparacion * MINUTO_MS)
        },
        include: { cancha: true }
      });
    },
    { isolationLevel: 'Serializable' }
  );

  return { ...vistaReserva(reserva), detallePrecio: detalle, presencial: esDelLocal };
}

async function listarMias(usuario, { estado } = {}, ahora = new Date()) {
  await mantenimiento(ahora);
  const reservas = await db.reserva.findMany({ where: { jugadorId: usuario.id, estado }, include: INCLUIR_PARA_JUGADOR, orderBy: { inicio: 'desc' } });
  return reservas.map(vistaReserva);
}

// El jugador ve la suya; el dueño de la cancha y ADMIN también (regla 4).
async function obtener(usuario, id, ahora = new Date()) {
  await mantenimiento(ahora);
  const reserva = await db.reserva.findUnique({ where: { id }, include: { ...INCLUIR_PARA_JUGADOR, jugador: true } });
  if (!reserva) throw noEncontrado('La reserva');
  const esDuenoCancha = reserva.cancha.duenoId === usuario.id;
  if (reserva.jugadorId !== usuario.id && !esDuenoCancha && !esAdmin(usuario)) throw prohibido('Esta reserva no es tuya');
  const { jugador, ...resto } = reserva;
  return { ...vistaReserva(resto), jugador: { id: jugador.id, nombre: jugador.nombre, telefono: jugador.telefono } };
}

// Calendario del dueño (regla 4): reservas de su cancha en un rango de fechas.
async function listarDeCancha(usuario, canchaId, { desde, hasta } = {}, ahora = new Date()) {
  await asegurarDueno(usuario, canchaId);
  await mantenimiento(ahora);
  const d = desde || hoyLocal(ahora);
  const h = hasta || sumarDias(d, 6);
  const reservas = await db.reserva.findMany({
    where: { canchaId, inicio: { gte: aUtc(d, 0), lt: aUtc(h, 24) } },
    include: { jugador: true, pagos: { orderBy: { creadoEn: 'desc' } } },
    orderBy: { inicio: 'asc' }
  });
  return reservas.map(r => ({ ...r, jugador: { id: r.jugador.id, nombre: r.jugador.nombre, telefono: r.jugador.telefono } }));
}

async function cancelar(usuario, id, ahora = new Date()) {
  await mantenimiento(ahora);
  const reserva = await db.reserva.findUnique({ where: { id }, include: { cancha: true } });
  if (!reserva) throw noEncontrado('La reserva');
  const esJugador = reserva.jugadorId === usuario.id;
  const esDelLocal = reserva.cancha.duenoId === usuario.id || esAdmin(usuario);
  if (!esJugador && !esDelLocal) throw prohibido('Esta reserva no es tuya');
  if (!['PENDIENTE_PAGO', 'CONFIRMADA'].includes(reserva.estado)) throw conflicto(`No se puede cancelar una reserva ${reserva.estado.toLowerCase().replace('_', ' ')}`);
  if (reserva.inicio <= ahora) throw invalido('La reserva ya empezó; no se puede cancelar');

  // Regla 5
  const horasAntes = (reserva.inicio.getTime() - ahora.getTime()) / HORA_MS;
  const canceladaPorJugador = esJugador && !esDelLocal;
  const adelantoPerdido = canceladaPorJugador && reserva.estado === 'CONFIRMADA' && horasAntes < config.reglas.horasCancelacion;

  const actualizada = await db.$transaction(async tx => {
    await tx.pago.updateMany({ where: { reservaId: id, estado: 'PENDIENTE' }, data: { estado: 'RECHAZADO', nota: 'Reserva cancelada', revisadoEn: ahora } });
    return tx.reserva.update({ where: { id }, data: { estado: 'CANCELADA', canceladaEn: ahora, expiraEn: null, adelantoPerdido }, include: { cancha: true } });
  });

  let mensaje = 'Reserva cancelada.';
  if (adelantoPerdido) mensaje = `Cancelaste con menos de ${config.reglas.horasCancelacion} horas de anticipación: el adelanto de S/ ${Number(reserva.adelanto)} no se devuelve.`;
  else if (reserva.estado === 'CONFIRMADA') mensaje = canceladaPorJugador ? 'Reserva cancelada a tiempo: el dueño te devolverá el adelanto.' : 'Reserva cancelada por el local: devuelve el adelanto al jugador.';

  return { reserva: vistaReserva(actualizada), adelantoPerdido, mensaje };
}

module.exports = { crear, listarMias, obtener, listarDeCancha, cancelar, MAX_PENDIENTES };
