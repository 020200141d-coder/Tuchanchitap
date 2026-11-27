// ============================================================================
//  src/modules/admin/admin.routes.js — /api/admin (todo exige rol ADMIN)
//
//  El candado se pone una sola vez con router.use, así ninguna ruta nueva del
//  panel puede quedar abierta por olvido.
// ============================================================================

import { Router } from 'express';
import c from './admin.controller.js';
import esquemas from './admin.schema.js';
import anuncios from '../anuncios/anuncios.controller.js';
import esquemasAnuncios from '../anuncios/anuncios.schema.js';
import imagenes from '../imagenes/imagenes.controller.js';
import esquemasImagenes from '../imagenes/imagenes.schema.js';
import { subirImagen } from '../../middlewares/subida.middleware.js';
import { idParam } from '../../utils/validaciones.js';
import { validar } from '../../middlewares/validar.middleware.js';
import { autenticar, permitir } from '../../middlewares/auth.middleware.js';

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

export default router;
