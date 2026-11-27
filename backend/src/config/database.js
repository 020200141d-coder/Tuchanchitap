// ============================================================================
//  src/config/database.js — punto único de acceso a los datos
//
//  ¿Por qué un punto único?
//   Los servicios hacen `const db = require('../db')` y usan la API de Prisma
//   (db.cancha.findMany…). Aquí se decide QUÉ cliente reciben:
//    • Con DATABASE_URL (PostgreSQL local o Supabase) → PrismaClient real.
//    • Sin DATABASE_URL o en pruebas (NODE_ENV=test) → base en memoria que
//      imita a Prisma (src/config/memoria.js). Ver ese archivo para el porqué.
//
//  Flujo: server.js → si db.motor === 'memoria' carga la semilla al arrancar.
// ============================================================================

import { PrismaClient } from '@prisma/client';
import config from './env.js';
import { crearMemoria } from './memoria.js';

let db;
if (config.usarMemoria) {
  db = crearMemoria();
} else {
  db = new PrismaClient();
  db.motor = 'postgresql';
}

export default db;
