// ============================================================================
//  src/rutas/auth.js — /api/auth
//
//  Registro y login llevan un límite de intentos (express-rate-limit) para
//  frenar ataques de fuerza bruta: 20 intentos cada 15 minutos por IP.
//  En pruebas el límite se desactiva para no interferir.
// ============================================================================

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const controlador = require('../controladores/auth');
const esquemas = require('../validadores/auth');
const { validar } = require('../middleware/validar');
const { autenticar } = require('../middleware/auth');

const limite = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => config.esPrueba,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Espera unos minutos.' }
});

const router = Router();

router.post('/registro', limite, validar({ body: esquemas.registro }), controlador.registrar);
router.post('/login', limite, validar({ body: esquemas.login }), controlador.ingresar);
router.get('/yo', autenticar, controlador.yo);
router.patch('/yo', autenticar, validar({ body: esquemas.actualizarPerfil }), controlador.actualizarPerfil);

module.exports = router;
