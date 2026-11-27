// ============================================================================
//  src/modules/imagenes/imagenes.routes.js — /api/imagenes (público)
//
//  Devuelve solo las imágenes activas del sitio (portada, ingreso, cancha sin
//  foto). El CRUD completo está en admin.routes.js, detrás del rol ADMIN.
// ============================================================================

import { Router } from 'express';
import imagenes from './imagenes.controller.js';
import { consulta } from './imagenes.schema.js';
import { validar } from '../../middlewares/validar.middleware.js';

const router = Router();

router.get('/', validar({ query: consulta }), imagenes.publicas);

export default router;
