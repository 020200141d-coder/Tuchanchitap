// ============================================================================
//  src/db/index.js — punto único de acceso a los datos
//
//  ¿Por qué un punto único?
//   Los servicios hacen `const db = require('../db')` y usan la API de Prisma
//   (db.cancha.findMany…). Aquí se decide QUÉ cliente reciben:
//    • Con DATABASE_URL (PostgreSQL local o Supabase) → PrismaClient real.
//    • Sin DATABASE_URL o en pruebas (NODE_ENV=test) → base en memoria que
//      imita a Prisma (src/db/memoria.js). Ver ese archivo para el porqué.
//
//  Flujo: server.js → si db.motor === 'memoria' carga la semilla al arrancar.
// ============================================================================

const config = require('../config');

let db;
if (config.usarMemoria) {
  const { crearMemoria } = require('./memoria');
  db = crearMemoria();
} else {
  const { PrismaClient } = require('@prisma/client');
  db = new PrismaClient();
  db.motor = 'postgresql';
}

module.exports = db;
