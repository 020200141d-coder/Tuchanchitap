// ============================================================================
//  src/rutas/canchas.js — /api/canchas
//
//  Públicas: listado con filtros y ficha (con token opcional para que el dueño
//  vea sus borradores). Del dueño/ADMIN: crear, editar, borrar, imágenes.
//  Ojo con el orden: /mias va antes de /:id para que "mias" no se lea como id.
//  Las subrutas de horarios y reservas de una cancha se montan en
//  rutas/horarios.js y rutas/reservas.js.
// ============================================================================

const { Router } = require('express');
const controlador = require('../controladores/canchas');
const esquemas = require('../validadores/canchas');
const { idParam } = require('../validadores/comunes');
const { validar } = require('../middleware/validar');
const { autenticar, autenticarOpcional, permitir } = require('../middleware/auth');
const { subirImagen } = require('../middleware/subida');

const router = Router();
const soloDuenos = [autenticar, permitir('DUENO', 'ADMIN')];

router.get('/', validar({ query: esquemas.filtros }), controlador.listar);
router.get('/mias', ...soloDuenos, controlador.mias);
router.get('/:id', autenticarOpcional, validar({ params: idParam }), controlador.obtener);
router.post('/', ...soloDuenos, validar({ body: esquemas.crear }), controlador.crear);
router.patch('/:id', ...soloDuenos, validar({ params: idParam, body: esquemas.actualizar }), controlador.actualizar);
router.delete('/:id', ...soloDuenos, validar({ params: idParam }), controlador.eliminar);
router.post('/:id/imagenes', ...soloDuenos, subirImagen('imagen'), validar({ params: idParam, query: esquemas.tipoImagen }), controlador.subirImagen);
router.delete('/:id/fotos', ...soloDuenos, validar({ params: idParam, body: esquemas.quitarFoto }), controlador.quitarFoto);

module.exports = router;
