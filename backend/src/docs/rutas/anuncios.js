// Documentación OpenAPI de anuncios (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const error = d => ({ description: d, ...json({ $ref: '#/components/schemas/Error' }) });
const seguro = [{ bearer: [] }];
const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const cuerpo = {
  type: 'object',
  properties: {
    anunciante: { type: 'string', example: 'Deportes El Crack (ficticio)' },
    titulo: { type: 'string', example: 'Chimpunes con 10 % de descuento' },
    texto: { type: 'string', example: 'A dos cuadras de la cancha. Muestra tu reserva.' },
    enlace: { type: 'string', example: 'https://wa.me/51984000000' },
    imagenUrl: { type: 'string' },
    zona: { type: 'string', example: 'Wanchaq', nullable: true },
    activo: { type: 'boolean' },
    desde: { type: 'string', format: 'date' },
    hasta: { type: 'string', format: 'date' }
  }
};

module.exports = {
  '/api/anuncios': {
    get: {
      tags: ['Anuncios'],
      summary: 'Anuncios vigentes para mostrar (máx. 2), con prioridad a la zona',
      parameters: [{ name: 'zona', in: 'query', schema: { type: 'string' } }, { name: 'cantidad', in: 'query', schema: { type: 'integer', default: 1, maximum: 2 } }],
      responses: { 200: { description: 'Anuncios (cuenta una impresión cada uno)' } }
    }
  },
  '/api/anuncios/{id}/clic': {
    post: { tags: ['Anuncios'], summary: 'Registra un clic y devuelve el enlace', parameters: [idPath], responses: { 200: { description: '{ enlace }' }, 404: error('No existe o no está vigente') } }
  },
  '/api/admin/anuncios': {
    get: { tags: ['Anuncios'], summary: 'Todos los anuncios con impresiones, clics y tasa (ADMIN)', security: seguro, responses: { 200: { description: 'Lista' }, 403: error('No eres ADMIN') } },
    post: { tags: ['Anuncios'], summary: 'Crea un anuncio (ADMIN)', security: seguro, requestBody: json({ ...cuerpo, required: ['anunciante', 'titulo', 'texto', 'desde', 'hasta'] }), responses: { 201: { description: 'Creado' }, 422: error('Datos inválidos') } }
  },
  '/api/admin/anuncios/{id}': {
    patch: { tags: ['Anuncios'], summary: 'Edita o pausa un anuncio (ADMIN)', security: seguro, parameters: [idPath], requestBody: json(cuerpo), responses: { 200: { description: 'Actualizado' }, 404: error('No existe') } },
    delete: { tags: ['Anuncios'], summary: 'Borra un anuncio (ADMIN)', security: seguro, parameters: [idPath], responses: { 204: { description: 'Borrado' }, 404: error('No existe') } }
  }
};
