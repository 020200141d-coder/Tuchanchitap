// ============================================================================
//  src/rutas/admin.js — /api/admin (todo exige rol ADMIN)
//
//  El candado se pone una sola vez con router.use, así ninguna ruta nueva del
//  panel puede quedar abierta por olvido.
// ============================================================================

const { Router } = require('express');
const c = require('../controladores/admin');
const esquemas = require('../validadores/admin');
const anuncios = require('../controladores/anuncios');
const esquemasAnuncios = require('../validadores/anuncios');
const imagenes = require('../controladores/imagenes');
const esquemasImagenes = require('../validadores/imagenes');
const { subirImagen } = require('../middleware/subida');
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

// Imágenes del sitio (fondos de portada, ingreso, cancha sin foto).
router.get('/imagenes', imagenes.listar);
router.post('/imagenes', subirImagen('imagen'), validar({ body: esquemasImagenes.crear }), imagenes.crear);
router.patch('/imagenes/:id', validar({ params: idParam, body: esquemasImagenes.actualizar }), imagenes.actualizar);
router.delete('/imagenes/:id', validar({ params: idParam }), imagenes.eliminar);

// Anuncios: CRUD con impresiones, clics y tasa de clics para cobrar al anunciante.
router.get('/anuncios', anuncios.listar);
router.post('/anuncios', validar({ body: esquemasAnuncios.crear }), anuncios.crear);
router.patch('/anuncios/:id', validar({ params: idParam, body: esquemasAnuncios.actualizar }), anuncios.actualizar);
router.delete('/anuncios/:id', validar({ params: idParam }), anuncios.eliminar);

module.exports = router;
