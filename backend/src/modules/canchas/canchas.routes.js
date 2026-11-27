// ============================================================================
//  src/modules/canchas/canchas.routes.js — /api/canchas
//
//  Públicas: listado con filtros y ficha (con token opcional para que el dueño
//  vea sus borradores). Del dueño/ADMIN: crear, editar, borrar, imágenes.
//  Ojo con el orden: /mias va antes de /:id para que "mias" no se lea como id.
//  Las subrutas de horarios y reservas de una cancha se montan en
//  modules/horarios/horarios.routes.js y modules/reservas/reservas.routes.js.
// ============================================================================

import { Router } from 'express';
import controlador from './canchas.controller.js';
import esquemas from './canchas.schema.js';
import { idParam } from '../../utils/validaciones.js';
import { validar } from '../../middlewares/validar.middleware.js';
import { autenticar, autenticarOpcional, permitir } from '../../middlewares/auth.middleware.js';
import { subirImagen } from '../../middlewares/subida.middleware.js';

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

export default router;
