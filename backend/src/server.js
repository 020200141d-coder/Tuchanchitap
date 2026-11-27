// ============================================================================
//  src/server.js — punto de entrada: `npm run dev` / `npm start`
//
//  Flujo de arranque:
//   1. Si no hay DATABASE_URL (modo demo en memoria), carga la semilla para que
//      haya canchas y usuarios de prueba apenas abras el frontend.
//   2. Pone la app a escuchar en PORT.
//   3. Cada minuto corre el mantenimiento de reservas (regla 2: expira las que
//      no subieron comprobante a tiempo y marca como jugadas las que ya
//      pasaron). Los servicios también lo corren antes de leer horarios, así
//      que el intervalo solo mantiene la base ordenada.
// ============================================================================

import config from './config/env.js';
import db from './config/database.js';
import app from './app.js';
import { mantenimiento } from './modules/reservas/mantenimiento.service.js';
import { cargarSemilla } from '../prisma/datos-semilla.js';

async function arrancar() {
  if (db.motor === 'memoria') {
    await cargarSemilla(db);
    console.log('[db] Sin DATABASE_URL: modo demo en memoria con datos de ejemplo (se pierden al reiniciar).');
  }

  app.listen(config.puerto, () => {
    console.log(`[api] Canchitas Cusco escuchando en ${config.urlPublica}`);
    console.log(`[api] Documentación Swagger en ${config.urlPublica}/docs`);
  });

  setInterval(() => {
    mantenimiento().catch(err => console.error('[mantenimiento]', err.message));
  }, 60 * 1000).unref();
}

arrancar().catch(err => {
  console.error('[api] No se pudo arrancar:', err);
  process.exit(1);
});
