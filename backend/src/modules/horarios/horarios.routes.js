// ============================================================================
//  src/modules/horarios/horarios.routes.js — tarifas, bloqueos y horas libres (montado en /api)
//
//  Públicas: ver tarifas y horas libres de una cancha.
//  Del dueño/ADMIN (regla 4 en el servicio): crear/editar/borrar tarifas y
//  bloqueos.
// ============================================================================

import { Router } from 'express';
import c from './horarios.controller.js';
import esquemas from './horarios.schema.js';
import { idParam } from '../../utils/validaciones.js';
import { validar } from '../../middlewares/validar.middleware.js';
import { autenticar, autenticarOpcional, permitir } from '../../middlewares/auth.middleware.js';

const router = Router();
const soloDuenos = [autenticar, permitir('DUENO', 'ADMIN')];

router.get('/canchas/:id/tarifas', validar({ params: idParam }), c.listarTarifas);
router.post('/canchas/:id/tarifas', ...soloDuenos, validar({ params: idParam, body: esquemas.crearTarifa }), c.crearTarifa);
router.patch('/tarifas/:id', ...soloDuenos, validar({ params: idParam, body: esquemas.actualizarTarifa }), c.actualizarTarifa);
router.delete('/tarifas/:id', ...soloDuenos, validar({ params: idParam }), c.eliminarTarifa);

router.get('/canchas/:id/bloqueos', ...soloDuenos, validar({ params: idParam, query: esquemas.rangoFechas }), c.listarBloqueos);
router.post('/canchas/:id/bloqueos', ...soloDuenos, validar({ params: idParam, body: esquemas.crearBloqueo }), c.crearBloqueo);
router.delete('/bloqueos/:id', ...soloDuenos, validar({ params: idParam }), c.eliminarBloqueo);

router.get('/canchas/:id/disponibilidad', autenticarOpcional, validar({ params: idParam, query: esquemas.consultaDisponibilidad }), c.disponibilidad);

export default router;
