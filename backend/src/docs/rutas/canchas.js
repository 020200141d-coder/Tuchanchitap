// Documentación OpenAPI de /api/canchas (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const ref = n => ({ $ref: `#/components/schemas/${n}` });
const exito = schema => json({ type: 'object', properties: { ok: { type: 'boolean', example: true }, data: schema } });
const error = d => ({ description: d, ...json(ref('Error')) });
const seguro = [{ bearer: [] }];
const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const q = (name, schema, description) => ({ name, in: 'query', schema, description });

const cuerpoCancha = {
  type: 'object',
  required: ['nombre', 'tipo', 'formato', 'lat', 'lng', 'direccion'],
  properties: {
    nombre: { type: 'string', example: 'La Bombonera de Wanchaq' },
    descripcion: { type: 'string' },
    tipo: { type: 'string', enum: ['SINTETICO', 'LOSA', 'GRASS'] },
    formato: { type: 'integer', enum: [5, 7, 11] },
    techada: { type: 'boolean' },
    conLuz: { type: 'boolean' },
    lat: { type: 'number', example: -13.5262 },
    lng: { type: 'number', example: -71.9662 },
    direccion: { type: 'string', example: 'Av. Garcilaso 123' },
    zona: { type: 'string', example: 'Wanchaq' },
    telefono: { type: 'string', example: '984123456' },
    publicada: { type: 'boolean' },
    duenoId: { type: 'integer', description: 'Solo ADMIN' }
  }
};

module.exports = {
  '/api/canchas': {
    get: {
      tags: ['Canchas'],
      summary: 'Listado público con filtros, cercanía y paginación',
      parameters: [
        q('q', { type: 'string' }, 'Busca en nombre, zona o dirección'),
        q('tipo', { type: 'string', enum: ['SINTETICO', 'LOSA', 'GRASS'] }),
        q('formato', { type: 'integer', enum: [5, 7, 11] }),
        q('techada', { type: 'boolean' }),
        q('conLuz', { type: 'boolean' }),
        q('precioMax', { type: 'number' }, 'Precio por hora máximo (tarifa más barata)'),
        q('lat', { type: 'number' }, 'Tu ubicación (junto con lng): ordena por cercanía'),
        q('lng', { type: 'number' }),
        q('radioKm', { type: 'number' }, 'Solo canchas a esta distancia o menos'),
        q('pagina', { type: 'integer', default: 1 }),
        q('porPagina', { type: 'integer', default: 12, maximum: 50 })
      ],
      responses: {
        200: { description: 'Página de canchas', ...exito({ type: 'object', properties: { items: { type: 'array', items: ref('Cancha') }, total: { type: 'integer' }, pagina: { type: 'integer' }, porPagina: { type: 'integer' }, paginas: { type: 'integer' } } }) },
        422: error('Filtro inválido')
      }
    },
    post: {
      tags: ['Canchas'],
      summary: 'Crea una cancha (DUENO o ADMIN)',
      security: seguro,
      requestBody: json(cuerpoCancha),
      responses: { 201: { description: 'Creada', ...exito(ref('Cancha')) }, 401: error('Sin sesión'), 403: error('Rol JUGADOR'), 422: error('Datos inválidos') }
    }
  },
  '/api/canchas/mias': {
    get: { tags: ['Canchas'], summary: 'Canchas del dueño (ADMIN: todas)', security: seguro, responses: { 200: { description: 'Lista', ...exito({ type: 'array', items: ref('Cancha') }) }, 403: error('Rol JUGADOR') } }
  },
  '/api/canchas/{id}': {
    get: { tags: ['Canchas'], summary: 'Ficha de la cancha con tarifas y estrellas', parameters: [idPath], responses: { 200: { description: 'Cancha', ...exito(ref('Cancha')) }, 404: error('No existe o no está publicada') } },
    patch: {
      tags: ['Canchas'],
      summary: 'Edita la cancha (solo su dueño o ADMIN)',
      security: seguro,
      parameters: [idPath],
      requestBody: json({ ...cuerpoCancha, required: [] }),
      responses: { 200: { description: 'Actualizada', ...exito(ref('Cancha')) }, 403: error('No es tu cancha'), 404: error('No existe'), 422: error('Datos inválidos') }
    },
    delete: { tags: ['Canchas'], summary: 'Borra la cancha si no tiene reservas', security: seguro, parameters: [idPath], responses: { 204: { description: 'Borrada' }, 403: error('No es tu cancha'), 409: error('Tiene reservas: despublícala') } }
  },
  '/api/canchas/{id}/imagenes': {
    post: {
      tags: ['Canchas'],
      summary: 'Sube una foto de la cancha o el QR de Yape/Plin',
      security: seguro,
      parameters: [idPath, q('tipo', { type: 'string', enum: ['foto', 'qr'], default: 'foto' })],
      requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { imagen: { type: 'string', format: 'binary' } } } } } },
      responses: { 201: { description: 'Cancha con la imagen', ...exito(ref('Cancha')) }, 400: error('Sin imagen o formato no permitido'), 403: error('No es tu cancha'), 409: error('Máximo de fotos') }
    }
  },
  '/api/canchas/{id}/fotos': {
    delete: { tags: ['Canchas'], summary: 'Quita una foto', security: seguro, parameters: [idPath], requestBody: json({ type: 'object', properties: { url: { type: 'string' } } }), responses: { 200: { description: 'Cancha sin esa foto' }, 404: error('La foto no existe') } }
  }
};
