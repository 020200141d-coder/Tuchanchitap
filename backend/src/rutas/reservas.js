// ============================================================================
//  src/rutas/reservas.js — reservas (montado en /api)
//
//  Cualquier usuario con sesión puede reservar. El calendario de una cancha
//  (/canchas/:id/reservas) es solo para su dueño o ADMIN (regla 4, en el
//  servicio). /reservas/mias va antes de /reservas/:id.
// ============================================================================

const { Router } = require('express');
const c = require('../controladores/reservas');
const esquemas = require('../validadores/reservas');
const { rangoFechas } = require('../validadores/horarios');
const { idParam } = require('../validadores/comunes');
const { validar } = require('../middleware/validar');
const { autenticar, permitir } = require('../middleware/auth');

const router = Router();

router.post('/reservas', autenticar, validar({ body: esquemas.crear }), c.crear);
router.get('/reservas/mias', autenticar, validar({ query: esquemas.filtroMias }), c.mias);
router.get('/reservas/:id', autenticar, validar({ params: idParam }), c.obtener);
router.post('/reservas/:id/cancelar', autenticar, validar({ params: idParam, body: esquemas.cancelar }), c.cancelar);
router.get('/canchas/:id/reservas', autenticar, permitir('DUENO', 'ADMIN'), validar({ params: idParam, query: rangoFechas }), c.deCancha);

module.exports = router;
