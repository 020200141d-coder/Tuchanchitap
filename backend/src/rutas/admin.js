// ============================================================================
//  src/rutas/admin.js — /api/admin (todo exige rol ADMIN)
//
//  El candado se pone una sola vez con router.use, así ninguna ruta nueva del
//  panel puede quedar abierta por olvido.
// ============================================================================

const { Router } = require('express');
const c = require('../controladores/admin');
const esquemas = require('../validadores/admin');
const { idParam } = require('../validadores/comunes');
const { validar } = require('../middleware/validar');
const { autenticar, permitir } = require('../middleware/auth');

const router = Router();
router.use(autenticar, permitir('ADMIN'));

router.get('/resumen', c.resumen);
router.get('/usuarios', validar({ query: esquemas.filtroUsuarios }), c.listarUsuarios);
router.post('/usuarios', validar({ body: esquemas.crearUsuario }), c.crearUsuario);
router.patch('/usuarios/:id', validar({ params: idParam, body: esquemas.actualizarUsuario }), c.actualizarUsuario);
router.delete('/usuarios/:id', validar({ params: idParam }), c.eliminarUsuario);
router.get('/reservas', validar({ query: esquemas.filtroReservas }), c.listarReservas);
router.get('/resenas', c.listarResenas);
router.delete('/resenas/:id', validar({ params: idParam }), c.eliminarResena);

module.exports = router;
