// ============================================================================
//  src/modules/pagos/pagos.routes.js — comprobantes, aprobación y reseñas (montado en /api)
//
//  El comprobante es multipart/form-data: primero multer lee la foto (campo
//  "foto") y los campos de texto; luego Zod valida esos campos.
// ============================================================================

import { Router } from 'express';
import c from './pagos.controller.js';
import esquemas from './pagos.schema.js';
import { idParam } from '../../utils/validaciones.js';
import { validar } from '../../middlewares/validar.middleware.js';
import { autenticar, permitir } from '../../middlewares/auth.middleware.js';
import { subirImagen } from '../../middlewares/subida.middleware.js';

const router = Router();
const soloDuenos = [autenticar, permitir('DUENO', 'ADMIN')];

router.post('/reservas/:id/pagos', autenticar, subirImagen('foto'), validar({ params: idParam, body: esquemas.enviarComprobante }), c.enviar);
router.get('/pagos', ...soloDuenos, validar({ query: esquemas.filtroPagos }), c.listar);
router.post('/pagos/:id/aprobar', ...soloDuenos, validar({ params: idParam }), c.aprobar);
router.post('/pagos/:id/rechazar', ...soloDuenos, validar({ params: idParam, body: esquemas.rechazar }), c.rechazar);

router.post('/reservas/:id/resena', autenticar, validar({ params: idParam, body: esquemas.crearResena }), c.crearResena);
router.get('/canchas/:id/resenas', validar({ params: idParam }), c.resenasDeCancha);

export default router;
