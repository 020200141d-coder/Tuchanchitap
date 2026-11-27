// ============================================================================
//  prisma/semilla.js — carga los datos de ejemplo en PostgreSQL / Supabase
//
//  Uso:  npm run semilla   (después de `npm run migrar`)
//
//  Flujo: borra todas las tablas en orden (hijos primero, por las claves
//  foráneas) y vuelve a cargar la semilla de prisma/datos-semilla.js.
//  ⚠ Borra los datos existentes: úsalo solo en desarrollo.
// ============================================================================

import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import { PrismaClient } from '@prisma/client';
import { cargarSemilla } from './datos-semilla.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La semilla borra datos: no la corras en producción.');
  }
  const db = new PrismaClient();
  try {
    await db.imagenSitio.deleteMany();
    await db.anuncio.deleteMany();
    await db.resena.deleteMany();
    await db.pago.deleteMany();
    await db.reserva.deleteMany();
    await db.bloqueo.deleteMany();
    await db.tarifa.deleteMany();
    await db.cancha.deleteMany();
    await db.usuario.deleteMany();
    const { usuarios, canchas } = await cargarSemilla(db);
    console.log(`Semilla cargada: ${Object.keys(usuarios).length} usuarios y ${canchas.length} canchas.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
