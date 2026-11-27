// ============================================================================
//  src/routes/index.js — registro central de las rutas de todos los módulos
//
//  Como en la guía de la sesión 3: cada módulo (src/modules/<módulo>/) define
//  sus rutas en <módulo>.routes.js y aquí solo se montan bajo su prefijo.
//  Las rutas SOLO dicen "qué URL + qué middleware + qué controlador"; la
//  lógica vive en los controladores y servicios de cada módulo.
// ============================================================================

import { Router } from 'express';
import saludRoutes from '../modules/salud/salud.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import canchasRoutes from '../modules/canchas/canchas.routes.js';
import horariosRoutes from '../modules/horarios/horarios.routes.js';
import reservasRoutes from '../modules/reservas/reservas.routes.js';
import pagosRoutes from '../modules/pagos/pagos.routes.js';
import anunciosRoutes from '../modules/anuncios/anuncios.routes.js';
import imagenesRoutes from '../modules/imagenes/imagenes.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';

const router = Router();

router.use('/', saludRoutes); // GET /, GET /salud, GET /api/reglas
router.use('/api/auth', authRoutes);
router.use('/api/canchas', canchasRoutes);
router.use('/api', horariosRoutes); // tarifas, bloqueos y horas libres
router.use('/api', reservasRoutes);
router.use('/api', pagosRoutes); // comprobantes Yape/Plin y reseñas
router.use('/api/anuncios', anunciosRoutes);
router.use('/api/imagenes', imagenesRoutes);
router.use('/api/admin', adminRoutes);

export default router;
