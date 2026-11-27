// ============================================================================
//  src/modules/reservas/reservas.routes.js — reservas (montado en /api)
//
//  Cualquier usuario con sesión puede reservar. El calendario de una cancha
//  (/canchas/:id/reservas) es solo para su dueño o ADMIN (regla 4, en el
//  servicio). /reservas/mias va antes de /reservas/:id.
// ============================================================================

import { Router } from 'express';
import c from './reservas.controller.js';
import esquemas from './reservas.schema.js';
import { rangoFechas } from '../horarios/horarios.schema.js';
import { idParam } from '../../utils/validaciones.js';
import { validar } from '../../middlewares/validar.middleware.js';
import { autenticar, permitir } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/reservas', autenticar, validar({ body: esquemas.crear }), c.crear);
router.get('/reservas/mias', autenticar, validar({ query: esquemas.filtroMias }), c.mias);
router.get('/reservas/:id', autenticar, validar({ params: idParam }), c.obtener);
router.post('/reservas/:id/cancelar', autenticar, validar({ params: idParam, body: esquemas.cancelar }), c.cancelar);
router.get('/canchas/:id/reservas', autenticar, permitir('DUENO', 'ADMIN'), validar({ params: idParam, query: rangoFechas }), c.deCancha);

export default router;
