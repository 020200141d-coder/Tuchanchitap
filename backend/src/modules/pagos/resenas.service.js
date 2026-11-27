// ============================================================================
//  src/modules/pagos/resenas.service.js — reseñas de canchas
//
//  Regla 7: solo puede reseñar quien JUGÓ esa reserva (estado JUGADA, que
//  mantenimiento() pone cuando pasa la hora de fin de una confirmada), y una
//  sola reseña por reserva (409; la base también lo asegura con @unique).
//  Así las estrellas vienen de gente que de verdad usó la cancha.
// ============================================================================

import db from '../../config/database.js';
import { noEncontrado, prohibido, conflicto, invalido } from '../../utils/errores.js';
import { mantenimiento } from '../reservas/mantenimiento.service.js';

async function crear(usuario, reservaId, { estrellas, texto }, ahora = new Date()) {
  await mantenimiento(ahora);
  const reserva = await db.reserva.findUnique({ where: { id: reservaId }, include: { resena: true } });
  if (!reserva) throw noEncontrado('La reserva');
  if (reserva.jugadorId !== usuario.id) throw prohibido('Solo quien jugó esta reserva puede reseñarla');
  if (reserva.estado !== 'JUGADA') throw invalido('Podrás reseñar cuando hayas jugado esta reserva');
  if (reserva.resena) throw conflicto('Ya reseñaste esta reserva');
  return db.resena.create({ data: { reservaId, estrellas, texto: texto || null } });
}

async function listarDeCancha(canchaId) {
  const resenas = await db.resena.findMany({ where: { reserva: { canchaId } }, include: { reserva: { include: { jugador: true } } }, orderBy: { creadoEn: 'desc' } });
  return resenas.map(r => ({ id: r.id, estrellas: r.estrellas, texto: r.texto, creadoEn: r.creadoEn, jugador: r.reserva.jugador.nombre }));
}

export { crear, listarDeCancha };
export default { crear, listarDeCancha };
