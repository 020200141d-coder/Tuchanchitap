// ============================================================================
//  src/servicios/bloqueos.js — horas que el dueño cierra (lluvia, mantenimiento)
//
//  Un bloqueo impide reservar ese rango (regla 1 los considera igual que a
//  una reserva activa). Reglas propias:
//   • No se bloquea un rango que ya terminó (422).
//   • Si ya hay reservas activas en ese rango → 409: el dueño debe cancelarlas
//     primero (y devolver el adelanto), así nadie llega a una cancha cerrada
//     sin aviso.
//   • Dos bloqueos no se pisan (409), para que el calendario sea claro.
// ============================================================================

const db = require('../db');
const { noEncontrado, conflicto, invalido } = require('../lib/errores');
const { aUtc } = require('../lib/horario');
const { asegurarDueno } = require('./canchas');
const { reservasQueCruzan, bloqueosQueCruzan } = require('./disponibilidad');

async function listar(usuario, canchaId, { desde, hasta } = {}, ahora = new Date()) {
  await asegurarDueno(usuario, canchaId);
  const where = { canchaId, fin: { gt: desde ? aUtc(desde, 0) : ahora } };
  if (hasta) where.inicio = { lt: aUtc(hasta, 24) };
  return db.bloqueo.findMany({ where, orderBy: { inicio: 'asc' } });
}

async function crear(usuario, canchaId, { fecha, horaInicio, horaFin, motivo, nota }, ahora = new Date()) {
  await asegurarDueno(usuario, canchaId);
  const inicio = aUtc(fecha, horaInicio);
  const fin = aUtc(fecha, horaFin);
  if (fin <= ahora) throw invalido('Ese horario ya pasó', { fecha: 'Elige una fecha u hora futura' });

  const reservas = await reservasQueCruzan(canchaId, inicio, fin);
  if (reservas.length > 0) {
    throw conflicto(`Hay ${reservas.length} reserva(s) activa(s) en ese horario. Cancélalas primero para avisar a los jugadores.`);
  }
  const bloqueos = await bloqueosQueCruzan(canchaId, inicio, fin);
  if (bloqueos.length > 0) throw conflicto('Ya hay un bloqueo en ese horario');

  return db.bloqueo.create({ data: { canchaId, inicio, fin, motivo, nota: nota ?? null } });
}

async function eliminar(usuario, bloqueoId) {
  const bloqueo = await db.bloqueo.findUnique({ where: { id: bloqueoId } });
  if (!bloqueo) throw noEncontrado('El bloqueo');
  await asegurarDueno(usuario, bloqueo.canchaId);
  await db.bloqueo.delete({ where: { id: bloqueoId } });
}

module.exports = { listar, crear, eliminar };
