// ============================================================================
//  src/rutas/pagos.js — comprobantes, aprobación y reseñas (montado en /api)
//
//  El comprobante es multipart/form-data: primero multer lee la foto (campo
//  "foto") y los campos de texto; luego Zod valida esos campos.
// ============================================================================

const { Router } = require('express');
const c = require('../controladores/pagos');
const esquemas = require('../validadores/pagos');
const { idParam } = require('../validadores/comunes');
const { validar } = require('../middleware/validar');
const { autenticar, permitir } = require('../middleware/auth');
const { subirImagen } = require('../middleware/subida');

const router = Router();
const soloDuenos = [autenticar, permitir('DUENO', 'ADMIN')];

router.post('/reservas/:id/pagos', autenticar, subirImagen('foto'), validar({ params: idParam, body: esquemas.enviarComprobante }), c.enviar);
router.get('/pagos', ...soloDuenos, validar({ query: esquemas.filtroPagos }), c.listar);
router.post('/pagos/:id/aprobar', ...soloDuenos, validar({ params: idParam }), c.aprobar);
router.post('/pagos/:id/rechazar', ...soloDuenos, validar({ params: idParam, body: esquemas.rechazar }), c.rechazar);

router.post('/reservas/:id/resena', autenticar, validar({ params: idParam, body: esquemas.crearResena }), c.crearResena);
router.get('/canchas/:id/resenas', validar({ params: idParam }), c.resenasDeCancha);

module.exports = router;
