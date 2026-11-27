// Documentación OpenAPI de las imágenes del sitio (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const error = d => ({ description: d, ...json({ $ref: '#/components/schemas/Error' }) });
const seguro = [{ bearer: [] }];
const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const lugar = { type: 'string', enum: ['PORTADA', 'INGRESO', 'CANCHA_SIN_FOTO'] };
const campos = { lugar, titulo: { type: 'string' }, credito: { type: 'string', example: 'Foto de Paul Lora en Unsplash' }, enlaceCredito: { type: 'string' }, orden: { type: 'integer' }, activa: { type: 'boolean' } };

export default {
  '/api/imagenes': {
    get: { tags: ['Imágenes'], summary: 'Imágenes activas del sitio (agrupadas por lugar)', parameters: [{ name: 'lugar', in: 'query', schema: lugar }], responses: { 200: { description: 'Imágenes' } } }
  },
  '/api/admin/imagenes': {
    get: { tags: ['Imágenes'], summary: 'Todas las imágenes (ADMIN)', security: seguro, responses: { 200: { description: 'Lista' }, 403: error('No eres ADMIN') } },
    post: {
      tags: ['Imágenes'],
      summary: 'Agrega una imagen subiendo archivo o con URL (ADMIN)',
      security: seguro,
      requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', required: ['lugar'], properties: { ...campos, url: { type: 'string' }, imagen: { type: 'string', format: 'binary' } } } } } },
      responses: { 201: { description: 'Creada' }, 422: error('Falta imagen o URL') }
    }
  },
  '/api/admin/imagenes/{id}': {
    patch: { tags: ['Imágenes'], summary: 'Edita, ordena o pausa (ADMIN)', security: seguro, parameters: [idPath], requestBody: json({ type: 'object', properties: campos }), responses: { 200: { description: 'Actualizada' }, 404: error('No existe'), 409: error('Dejaría el lugar sin imágenes activas') } },
    delete: { tags: ['Imágenes'], summary: 'Borra (ADMIN)', security: seguro, parameters: [idPath], responses: { 204: { description: 'Borrada' }, 409: error('Es la única activa del lugar') } }
  }
};
