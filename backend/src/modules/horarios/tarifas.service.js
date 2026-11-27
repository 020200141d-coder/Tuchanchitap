// ============================================================================
//  src/modules/horarios/tarifas.service.js — franjas de precio por día y hora
//
//  Las tarifas definen DOS cosas a la vez:
//   • el horario de atención: fuera de toda franja la cancha está cerrada;
//   • el precio por hora de cada franja (día/noche, fin de semana).
//  Por eso no se permiten franjas que se crucen el mismo día (409): una misma
//  hora tendría dos precios.
//
//  Regla 4: solo el dueño de la cancha o ADMIN crea/edita/borra tarifas.
// ============================================================================

import db from '../../config/database.js';
import { noEncontrado, conflicto, invalido } from '../../utils/errores.js';
import { NOMBRES_DIAS } from '../../utils/horario.js';
import { asegurarDueno } from '../canchas/canchas.service.js';
import { seCruzan } from './precios.service.js';

const ORDEN = [{ diaSemana: 'asc' }, { horaInicio: 'asc' }];

const describir = t => `${NOMBRES_DIAS[t.diaSemana]} ${t.horaInicio}:00–${t.horaFin}:00`;

async function listar(canchaId) {
  const cancha = await db.cancha.findUnique({ where: { id: canchaId } });
  if (!cancha) throw noEncontrado('La cancha');
  return db.tarifa.findMany({ where: { canchaId }, orderBy: ORDEN });
}

function revisarCruces(existentes, nuevas) {
  for (const n of nuevas) {
    const choque = existentes.find(e => e.id !== n.id && seCruzan(e, n));
    if (choque) throw conflicto(`La franja ${describir(n)} se cruza con ${describir(choque)}`);
  }
}

// Crea la misma franja para varios días (por ejemplo lunes a viernes).
async function crear(usuario, canchaId, { dias, horaInicio, horaFin, precioHora }) {
  await asegurarDueno(usuario, canchaId);
  const existentes = await db.tarifa.findMany({ where: { canchaId } });
  const nuevas = dias.map(diaSemana => ({ diaSemana, horaInicio, horaFin, precioHora }));
  revisarCruces(existentes, nuevas);
  return db.$transaction(async tx => {
    const creadas = [];
    for (const t of nuevas) creadas.push(await tx.tarifa.create({ data: { canchaId, ...t } }));
    return creadas;
  });
}

async function buscarConPermiso(usuario, tarifaId) {
  const tarifa = await db.tarifa.findUnique({ where: { id: tarifaId } });
  if (!tarifa) throw noEncontrado('La tarifa');
  await asegurarDueno(usuario, tarifa.canchaId);
  return tarifa;
}

async function actualizar(usuario, tarifaId, cambios) {
  const tarifa = await buscarConPermiso(usuario, tarifaId);
  const resultado = { ...tarifa, ...cambios };
  if (resultado.horaFin <= resultado.horaInicio) throw invalido('La hora de fin debe ser mayor que la de inicio', { horaFin: 'Debe ser mayor que la de inicio' });
  const existentes = await db.tarifa.findMany({ where: { canchaId: tarifa.canchaId } });
  revisarCruces(existentes, [resultado]);
  return db.tarifa.update({ where: { id: tarifaId }, data: cambios });
}

async function eliminar(usuario, tarifaId) {
  await buscarConPermiso(usuario, tarifaId);
  await db.tarifa.delete({ where: { id: tarifaId } });
}

export { listar, crear, actualizar, eliminar };
export default { listar, crear, actualizar, eliminar };
