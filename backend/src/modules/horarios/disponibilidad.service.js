// ============================================================================
//  src/modules/horarios/disponibilidad.service.js — horas libres de una cancha en un día
//
//  Flujo de GET /api/canchas/:id/disponibilidad?fecha=2026-11-28:
//   1. mantenimiento(): expira reservas sin comprobante (regla 2) para que su
//      hora aparezca libre al instante.
//   2. Lee las tarifas de ese día de la semana → horas en que la cancha abre.
//   3. Lee reservas activas y bloqueos que tocan ese día.
//   4. Marca cada hora: libre | ocupada | bloqueada | pasada, con su precio.
//
//  También exporta las funciones de "cruce" que usa el servicio de reservas
//  (regla 1) para que el calendario y la validación digan siempre lo mismo.
// ============================================================================

import db from '../../config/database.js';
import { noEncontrado } from '../../utils/errores.js';
import { aUtc, diaSemana as diaDeSemana, HORA_MS } from '../../utils/horario.js';
import { mantenimiento } from '../reservas/mantenimiento.service.js';

// Estados que ocupan la cancha. PENDIENTE_PAGO solo mientras no expire (el
// mantenimiento ya pasó a EXPIRADA las vencidas).
const ESTADOS_ACTIVOS = ['PENDIENTE_PAGO', 'CONFIRMADA', 'JUGADA'];

// Condición Prisma "se cruza con [inicio, fin)": empieza antes de que termine
// el rango y termina después de que empiece.
const cruceCon = (inicio, fin) => ({ inicio: { lt: fin }, fin: { gt: inicio } });

const reservasQueCruzan = (canchaId, inicio, fin, cliente = db) =>
  cliente.reserva.findMany({ where: { canchaId, estado: { in: ESTADOS_ACTIVOS }, ...cruceCon(inicio, fin) } });

const bloqueosQueCruzan = (canchaId, inicio, fin, cliente = db) =>
  cliente.bloqueo.findMany({ where: { canchaId, ...cruceCon(inicio, fin) } });

const choca = (lista, inicio, fin) => lista.find(x => x.inicio < fin && x.fin > inicio);

async function horasDelDia(canchaId, fecha, { usuario = null, ahora = new Date() } = {}) {
  const cancha = await db.cancha.findUnique({ where: { id: canchaId } });
  const puedeVer = cancha && (cancha.publicada || usuario?.rol === 'ADMIN' || cancha.duenoId === usuario?.id);
  if (!puedeVer) throw noEncontrado('La cancha');

  await mantenimiento(ahora);

  const dia = diaDeSemana(fecha);
  const tarifas = await db.tarifa.findMany({ where: { canchaId, diaSemana: dia }, orderBy: { horaInicio: 'asc' } });
  const inicioDia = aUtc(fecha, 0);
  const finDia = aUtc(fecha, 24);
  const [reservas, bloqueos] = await Promise.all([reservasQueCruzan(canchaId, inicioDia, finDia), bloqueosQueCruzan(canchaId, inicioDia, finDia)]);

  const horas = [];
  for (const t of tarifas) {
    for (let h = t.horaInicio; h < t.horaFin; h++) {
      const inicio = aUtc(fecha, h);
      const fin = new Date(inicio.getTime() + HORA_MS);
      let estado = 'libre';
      if (inicio <= ahora) estado = 'pasada';
      else if (choca(bloqueos, inicio, fin)) estado = 'bloqueada';
      else if (choca(reservas, inicio, fin)) estado = 'ocupada';
      const bloqueo = estado === 'bloqueada' ? choca(bloqueos, inicio, fin) : null;
      horas.push({
        hora: h,
        etiqueta: `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`,
        inicio,
        fin,
        precio: Number(t.precioHora),
        estado,
        motivo: bloqueo ? bloqueo.motivo : null
      });
    }
  }

  return { canchaId, fecha, diaSemana: dia, abierta: horas.length > 0, horas };
}

export { horasDelDia, reservasQueCruzan, bloqueosQueCruzan, cruceCon, ESTADOS_ACTIVOS };
export default { horasDelDia, reservasQueCruzan, bloqueosQueCruzan, cruceCon, ESTADOS_ACTIVOS };
