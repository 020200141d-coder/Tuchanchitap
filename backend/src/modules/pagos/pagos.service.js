// ============================================================================
//  src/modules/pagos/pagos.service.js — adelantos por Yape/Plin (manual, costo cero)
//
//  ¿Por qué manual?
//   Las pasarelas cobran comisión y piden tarjeta; Yape/Plin entre personas es
//   gratis. El flujo es:
//    1. El jugador reserva (PENDIENTE_PAGO, separa la hora 15 min).
//    2. Yapea el adelanto al QR del dueño y sube la FOTO del comprobante con
//       el n.º de operación. La reserva deja de expirar (expiraEn = null)
//       mientras el dueño revisa.
//    3. El dueño compara con su app de Yape/Plin y APRUEBA → CONFIRMADA, o
//       RECHAZA con un motivo → el jugador tiene otros 15 min para reenviar.
//
//  Reglas:
//   Regla 6: un n.º de operación no se acepta dos veces (409). También lo
//            asegura la base con @@unique([metodo, numeroOperacion]).
//   Regla 4: solo el dueño de la cancha (o ADMIN) aprueba o rechaza (403).
//   Solo el jugador de la reserva sube el comprobante, y solo uno a la vez.
// ============================================================================

import db from '../../config/database.js';
import config from '../../config/env.js';
import { ErrorNegocio, noEncontrado, prohibido, conflicto } from '../../utils/errores.js';
import { guardarImagen } from '../../utils/almacen.js';
import { asegurarDueno, esAdmin } from '../canchas/canchas.service.js';
import { mantenimiento } from '../reservas/mantenimiento.service.js';

const MINUTO_MS = 60 * 1000;

async function enviar(usuario, reservaId, { metodo, numeroOperacion }, archivo, ahora = new Date()) {
  await mantenimiento(ahora);
  const reserva = await db.reserva.findUnique({ where: { id: reservaId }, include: { pagos: true } });
  if (!reserva) throw noEncontrado('La reserva');
  if (reserva.jugadorId !== usuario.id) throw prohibido('Solo quien hizo la reserva puede enviar el comprobante');
  if (reserva.estado === 'EXPIRADA') throw conflicto('La reserva expiró porque no llegó el comprobante a tiempo. Vuelve a reservar.');
  if (reserva.estado !== 'PENDIENTE_PAGO') throw conflicto('Esta reserva no está esperando pago');
  if (reserva.pagos.some(p => p.estado === 'PENDIENTE')) throw conflicto('Ya enviaste un comprobante; espera a que el dueño lo revise');

  // Regla 6
  const repetido = await db.pago.findFirst({ where: { metodo, numeroOperacion } });
  if (repetido) throw new ErrorNegocio('Ese número de operación ya fue usado en otro pago', 409, { numeroOperacion: 'Ya registrado' });

  if (!archivo) throw new ErrorNegocio('Adjunta la foto del comprobante en el campo "foto"', 400);
  const fotoUrl = await guardarImagen(archivo, 'comprobantes');

  return db.$transaction(async tx => {
    const pago = await tx.pago.create({ data: { reservaId, metodo, numeroOperacion, fotoUrl, monto: reserva.adelanto } });
    await tx.reserva.update({ where: { id: reservaId }, data: { expiraEn: null } });
    return pago;
  });
}

// Busca el pago y verifica que quien revisa sea el dueño de esa cancha.
async function paraRevisar(usuario, pagoId) {
  const pago = await db.pago.findUnique({ where: { id: pagoId }, include: { reserva: true } });
  if (!pago) throw noEncontrado('El pago');
  await asegurarDueno(usuario, pago.reserva.canchaId); // regla 4
  if (pago.estado !== 'PENDIENTE') throw conflicto(`Este pago ya fue ${pago.estado === 'APROBADO' ? 'aprobado' : 'rechazado'}`);
  if (pago.reserva.estado !== 'PENDIENTE_PAGO') throw conflicto('La reserva ya no está esperando pago (fue cancelada o expiró)');
  return pago;
}

async function aprobar(usuario, pagoId, ahora = new Date()) {
  await paraRevisar(usuario, pagoId);
  return db.$transaction(async tx => {
    const pago = await tx.pago.update({ where: { id: pagoId }, data: { estado: 'APROBADO', revisadoEn: ahora } });
    const reserva = await tx.reserva.update({ where: { id: pago.reservaId }, data: { estado: 'CONFIRMADA', expiraEn: null } });
    return { pago, reserva };
  });
}

async function rechazar(usuario, pagoId, nota, ahora = new Date()) {
  await paraRevisar(usuario, pagoId);
  return db.$transaction(async tx => {
    const pago = await tx.pago.update({ where: { id: pagoId }, data: { estado: 'RECHAZADO', nota, revisadoEn: ahora } });
    // Nuevo plazo para que el jugador corrija y reenvíe.
    const reserva = await tx.reserva.update({ where: { id: pago.reservaId }, data: { expiraEn: new Date(ahora.getTime() + config.reglas.minutosSeparacion * MINUTO_MS) } });
    return { pago, reserva };
  });
}

// Bandeja del dueño (sus canchas) o del ADMIN (todas).
async function listar(usuario, { estado } = {}) {
  const where = { estado };
  if (!esAdmin(usuario)) where.reserva = { cancha: { duenoId: usuario.id } };
  const pagos = await db.pago.findMany({ where, include: { reserva: { include: { cancha: true, jugador: true } } }, orderBy: { creadoEn: 'desc' } });
  return pagos.map(p => {
    const { cancha, jugador, ...reserva } = p.reserva;
    return {
      ...p,
      reserva: { ...reserva, cancha: { id: cancha.id, nombre: cancha.nombre }, jugador: { id: jugador.id, nombre: jugador.nombre, telefono: jugador.telefono } }
    };
  });
}

export { enviar, aprobar, rechazar, listar };
export default { enviar, aprobar, rechazar, listar };
