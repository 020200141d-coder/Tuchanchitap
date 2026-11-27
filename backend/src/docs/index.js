// ============================================================================
//  src/docs/index.js — especificación OpenAPI 3 (Swagger) de la API
//
//  Se sirve en /docs (interfaz) y /docs.json (archivo). Está escrita a mano y
//  dividida por recurso en src/docs/rutas/*.js para que cada etapa del
//  proyecto agregue su parte sin un archivo gigante. Aquí se juntan.
// ============================================================================

const esquemas = require('./esquemas');

const partes = ['salud', 'auth', 'canchas', 'horarios', 'reservas', 'pagos', 'admin']
  .map(nombre => {
    try {
      return require(`./rutas/${nombre}`);
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') return {};
      throw e;
    }
  });

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Canchitas Cusco · API',
    version: '1.0.0',
    description:
      'API REST para reservar canchitas de fulbito del círculo local de Cusco. ' +
      'Todas las respuestas tienen la forma `{ ok, data }` o `{ ok: false, error, campos }`. ' +
      'Para las rutas con candado, primero haz login y pega el token en **Authorize**.'
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  tags: [
    { name: 'Salud' },
    { name: 'Auth', description: 'Registro, login y perfil' },
    { name: 'Canchas', description: 'Listado público y CRUD del dueño' },
    { name: 'Horarios', description: 'Tarifas, bloqueos y horas libres' },
    { name: 'Reservas' },
    { name: 'Pagos', description: 'Comprobantes Yape/Plin y aprobación del dueño' },
    { name: 'Admin', description: 'Panel de administración (solo ADMIN)' }
  ],
  components: {
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: esquemas
  },
  paths: Object.assign({}, ...partes)
};
