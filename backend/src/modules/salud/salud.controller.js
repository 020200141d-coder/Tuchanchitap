// ============================================================================
//  src/modules/salud/salud.controller.js — GET /salud
//
//  ¿Para qué?
//   Render (y cualquier monitor) consulta esta URL para saber si la API está
//   viva. También confirma qué motor de datos se está usando (memoria o
//   postgresql) y, con PostgreSQL, que la conexión responde.
// ============================================================================

import db from '../../config/database.js';
import { ok } from '../../utils/respuesta.js';

async function revisar(req, res) {
  let baseDatos = 'ok';
  if (db.motor === 'postgresql') {
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      baseDatos = 'sin conexión';
    }
  }
  ok(res, { estado: 'ok', motor: db.motor, baseDatos, hora: new Date().toISOString() }, baseDatos === 'ok' ? 200 : 503);
}

// GET /api/reglas — valores configurables que el frontend muestra al jugador
// ("tienes 15 minutos para pagar", "cancela con 6 h de anticipación"…).
import config from '../../config/env.js';
const reglas = (req, res) => ok(res, config.reglas);

// GET / — ruta principal (guía de la sesión 3): confirma que la API responde
// en JSON y dice dónde está la documentación.
const inicio = (req, res) => ok(res, { mensaje: 'API de tukanchitape (Canchitas Cusco) funcionando', documentacion: '/docs', salud: '/salud' });

export { inicio, revisar, reglas };
export default { inicio, revisar, reglas };
