// ============================================================================
//  src/modules/salud/salud.routes.js — rutas de comprobación de la API
//
//  GET /          → ruta principal (la que pide la guía de la sesión 3)
//  GET /salud     → estado del servidor y de la base de datos (lo usa Render)
//  GET /api/reglas → reglas configurables que el frontend muestra al jugador
// ============================================================================

import { Router } from 'express';
import salud from './salud.controller.js';

const router = Router();

router.get('/', salud.inicio);
router.get('/salud', salud.revisar);
router.get('/api/reglas', salud.reglas);

export default router;
