// ============================================================================
//  src/modules/anuncios/anuncios.routes.js — /api/anuncios (público: ver y registrar clic)
//  El CRUD de anuncios vive en modules/admin/admin.routes.js, detrás del candado de ADMIN.
// ============================================================================

import { Router } from 'express';
import c from './anuncios.controller.js';
import esquemas from './anuncios.schema.js';
import { idParam } from '../../utils/validaciones.js';
import { validar } from '../../middlewares/validar.middleware.js';

const router = Router();

router.get('/', validar({ query: esquemas.consulta }), c.mostrar);
router.post('/:id/clic', validar({ params: idParam }), c.clic);

export default router;
