// ============================================================================
//  pruebas/apoyo/ayudas.js — atajos para preparar datos en las pruebas
//
//  Cada prueba llama a reiniciar() en beforeEach y crea solo lo que necesita:
//  usuarios con su token, una cancha con tarifas, etc. Así se lee claro qué
//  datos tiene cada caso y ninguno depende del anterior.
// ============================================================================

import db from '../../src/config/database.js';
import { firmarToken, hashear } from '../../src/modules/auth/auth.service.js';
import { sumarDias, hoyLocal } from '../../src/utils/horario.js';

const PASSWORD = 'clave-de-prueba';

function reiniciar() {
  db.reiniciar();
}

let contador = 0;
async function crearUsuario(rol = 'JUGADOR', extra = {}) {
  contador += 1;
  const usuario = await db.usuario.create({
    data: {
      nombre: `${rol.toLowerCase()} ${contador}`,
      email: `${rol.toLowerCase()}${contador}@prueba.test`,
      telefono: '51984000000',
      rol,
      passwordHash: await hashear(PASSWORD),
      ...extra
    }
  });
  return { usuario, token: firmarToken(usuario), auth: { Authorization: `Bearer ${firmarToken(usuario)}` } };
}

// Cancha con tarifas: lun–vie 8–18 a S/ 50, 18–23 a S/ 70; sáb–dom 7–23 a S/ 80.
async function crearCancha(duenoId, extra = {}) {
  const cancha = await db.cancha.create({
    data: {
      duenoId,
      nombre: 'Cancha de prueba',
      tipo: 'SINTETICO',
      formato: 7,
      conLuz: true,
      lat: -13.5262,
      lng: -71.9662,
      direccion: 'Av. de prueba 123',
      zona: 'Wanchaq',
      telefono: '51984000001',
      publicada: true,
      ...extra
    }
  });
  for (let dia = 1; dia <= 5; dia++) {
    await db.tarifa.create({ data: { canchaId: cancha.id, diaSemana: dia, horaInicio: 8, horaFin: 18, precioHora: 50 } });
    await db.tarifa.create({ data: { canchaId: cancha.id, diaSemana: dia, horaInicio: 18, horaFin: 23, precioHora: 70 } });
  }
  for (const dia of [0, 6]) await db.tarifa.create({ data: { canchaId: cancha.id, diaSemana: dia, horaInicio: 7, horaFin: 23, precioHora: 80 } });
  return cancha;
}

// Próxima fecha (desde mañana) que cae en el día de semana pedido.
function proximoDia(diaSemana, desde = hoyLocal()) {
  for (let i = 1; i <= 7; i++) {
    const f = sumarDias(desde, i);
    if (new Date(`${f}T12:00:00Z`).getUTCDay() === diaSemana) return f;
  }
  throw new Error('inalcanzable');
}

export { db, reiniciar, crearUsuario, crearCancha, proximoDia, PASSWORD };
export default { db, reiniciar, crearUsuario, crearCancha, proximoDia, PASSWORD };
