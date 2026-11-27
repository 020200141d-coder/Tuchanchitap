// ============================================================================
//  src/rutas/anuncios.js — /api/anuncios (público: ver y registrar clic)
//  El CRUD de anuncios vive en rutas/admin.js, detrás del candado de ADMIN.
// ============================================================================

const { Router } = require('express');
const c = require('../controladores/anuncios');
const esquemas = require('../validadores/anuncios');
const { idParam } = require('../validadores/comunes');
const { validar } = require('../middleware/validar');

const router = Router();

router.get('/', validar({ query: esquemas.consulta }), c.mostrar);
router.post('/:id/clic', validar({ params: idParam }), c.clic);

module.exports = router;
