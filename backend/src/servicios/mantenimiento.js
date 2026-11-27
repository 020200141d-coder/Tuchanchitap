// ============================================================================
//  src/servicios/mantenimiento.js — pone al día el estado de las reservas
//
//  Regla 2: una reserva nace PENDIENTE_PAGO y separa la hora N minutos
//  (MINUTOS_SEPARACION, 15 por defecto) guardando `expiraEn`. Si en ese tiempo
//  el jugador no sube el comprobante, pasa a EXPIRADA y la hora se libera.
//  Cuando sube el comprobante, `expiraEn` se pone en null: la hora queda
//  separada hasta que el dueño lo revise.
//
//  Además, las reservas CONFIRMADA cuya hora de fin ya pasó pasan a JUGADA
//  (lo necesita la regla 7: solo se reseña lo que se jugó).
//
//  ¿Quién lo llama?
//   • server.js, cada minuto.
//   • Los servicios de disponibilidad, reservas, pagos y reseñas, justo antes
//     de leer, para no depender del intervalo (y para que las pruebas sean
//     deterministas: reciben `ahora`).
// ============================================================================

const db = require('../db');

async function mantenimiento(ahora = new Date()) {
  const expiradas = await db.reserva.updateMany({
    where: { estado: 'PENDIENTE_PAGO', expiraEn: { lt: ahora } },
    data: { estado: 'EXPIRADA' }
  });
  const jugadas = await db.reserva.updateMany({
    where: { estado: 'CONFIRMADA', fin: { lte: ahora } },
    data: { estado: 'JUGADA' }
  });
  return { expiradas: expiradas.count, jugadas: jugadas.count };
}

module.exports = { mantenimiento };
