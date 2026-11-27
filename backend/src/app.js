// ============================================================================
//  src/app.js — arma la aplicación Express (sin escuchar ningún puerto)
//
//  ¿Por qué separado de server.js?
//   Supertest importa `app` y le hace peticiones en memoria, sin abrir puertos.
//   server.js es quien la pone a escuchar y arranca las tareas periódicas.
//
//  Orden de los middlewares (importa):
//   helmet (cabeceras seguras) → cors (solo el frontend permitido) → JSON →
//   /uploads (fotos en disco, solo en desarrollo) → /docs (Swagger) →
//   rutas de la API → 404 → manejador central de errores.
// ============================================================================

const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const rutas = require('./rutas');
const especificacion = require('./docs');
const { manejarErrores, noEncontrada } = require('./middleware/errores');

const app = express();

// Las imágenes de /uploads se muestran desde el frontend (otro origen), por
// eso relajamos solo esa política de helmet.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origen, cb) {
      // Sin origen = Postman, curl o el mismo servidor: se permite.
      if (!origen || config.origenesFrontend.includes(origen)) return cb(null, true);
      return cb(null, false);
    }
  })
);
app.use(express.json({ limit: '200kb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));

app.get('/docs.json', (req, res) => res.json(especificacion));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(especificacion, { customSiteTitle: 'Canchitas Cusco · API' }));

app.use(rutas);

app.use(noEncontrada);
app.use(manejarErrores);

module.exports = app;
