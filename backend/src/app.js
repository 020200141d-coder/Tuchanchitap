// Configuración de Express: middlewares globales, rutas de cada módulo y manejo de errores.
const express = require('express');
const cors = require('cors');
const { frontendUrl } = require('./config/env');
const errores = require('./middlewares/errores');

const app = express();
app.use(cors({ origin: frontendUrl })); // solo el frontend puede llamar a la API
app.use(express.json());

// Ruta de prueba para comprobar que la API responde
app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

// Cada módulo registra sus rutas bajo /api
app.use('/api/usuarios', require('./modules/usuarios/usuarios.routes'));
app.use('/api/locales', require('./modules/locales/locales.routes'));
app.use('/api/reservas', require('./modules/reservas/reservas.routes'));
app.use('/api/pagos', require('./modules/pagos/pagos.routes'));
app.use('/api/reportes', require('./modules/reportes/reportes.routes'));

app.use(errores); // siempre al final
module.exports = app;
