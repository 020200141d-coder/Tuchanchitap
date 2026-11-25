// Rutas del módulo reportes. Aquí se definen los endpoints y los middlewares de cada uno.
// Flujo: ruta → (auth, roles, validar) → controlador → servicio → repositorio → base de datos
const { Router } = require('express');
const router = Router();

// Endpoint temporal para comprobar que el módulo está conectado
router.get('/', (req, res) => res.json({ modulo: 'reportes', estado: 'en construcción' }));

module.exports = router;
