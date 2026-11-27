// ============================================================================
//  src/controladores/salud.js — GET /salud
//
//  ¿Para qué?
//   Render (y cualquier monitor) consulta esta URL para saber si la API está
//   viva. También confirma qué motor de datos se está usando (memoria o
//   postgresql) y, con PostgreSQL, que la conexión responde.
// ============================================================================

const db = require('../db');
const { ok } = require('../lib/respuesta');

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

module.exports = { revisar };
