// ============================================================================
//  src/rutas/index.js — mapa de todas las URL de la API
//
//  Regla de la arquitectura: las rutas SOLO dicen "qué URL + qué middleware +
//  qué controlador". Nada de lógica aquí. Cada recurso tiene su archivo.
// ============================================================================

const { Router } = require('express');
const salud = require('../controladores/salud');

const router = Router();

router.get('/salud', salud.revisar);
router.get('/api/reglas', salud.reglas);
router.use('/api/auth', require('./auth'));
router.use('/api/canchas', require('./canchas'));
router.use('/api', require('./horarios'));
router.use('/api', require('./reservas'));
router.use('/api', require('./pagos'));
router.use('/api/admin', require('./admin'));

module.exports = router;
