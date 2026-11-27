// Documentación OpenAPI de pagos Yape/Plin y reseñas (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const ref = n => ({ $ref: `#/components/schemas/${n}` });
const exito = schema => json({ type: 'object', properties: { ok: { type: 'boolean', example: true }, data: schema } });
const error = d => ({ description: d, ...json(ref('Error')) });
const seguro = [{ bearer: [] }];
const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };

export default {
  '/api/reservas/{id}/pagos': {
    post: {
      tags: ['Pagos'],
      summary: 'El jugador sube la foto del comprobante de Yape/Plin',
      security: seguro,
      parameters: [idPath],
      requestBody: {
        content: {
          'multipart/form-data': {
            schema: { type: 'object', required: ['metodo', 'numeroOperacion', 'foto'], properties: { metodo: { type: 'string', enum: ['YAPE', 'PLIN'] }, numeroOperacion: { type: 'string', example: '01234567' }, foto: { type: 'string', format: 'binary' } } }
          }
        }
      },
      responses: { 201: { description: 'Comprobante en revisión', ...exito(ref('Pago')) }, 400: error('Falta la foto'), 403: error('No es tu reserva'), 409: error('N.º de operación repetido, reserva expirada o comprobante ya enviado'), 422: error('Datos inválidos') }
    }
  },
  '/api/pagos': {
    get: { tags: ['Pagos'], summary: 'Bandeja de comprobantes del dueño (ADMIN: todos)', security: seguro, parameters: [{ name: 'estado', in: 'query', schema: { type: 'string', enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'] } }], responses: { 200: { description: 'Lista', ...exito({ type: 'array', items: ref('Pago') }) }, 403: error('Rol JUGADOR') } }
  },
  '/api/pagos/{id}/aprobar': {
    post: { tags: ['Pagos'], summary: 'Aprueba el comprobante → reserva CONFIRMADA', security: seguro, parameters: [idPath], responses: { 200: { description: 'Aprobado' }, 403: error('No es tu cancha'), 409: error('Ya revisado o reserva no pendiente') } }
  },
  '/api/pagos/{id}/rechazar': {
    post: { tags: ['Pagos'], summary: 'Rechaza el comprobante (el jugador tiene otros minutos para reenviar)', security: seguro, parameters: [idPath], requestBody: json({ type: 'object', required: ['nota'], properties: { nota: { type: 'string', example: 'El monto no coincide' } } }), responses: { 200: { description: 'Rechazado' }, 403: error('No es tu cancha'), 409: error('Ya revisado') } }
  },
  '/api/reservas/{id}/resena': {
    post: { tags: ['Pagos'], summary: 'Reseña de una reserva jugada (una por reserva)', security: seguro, parameters: [idPath], requestBody: json({ type: 'object', required: ['estrellas'], properties: { estrellas: { type: 'integer', minimum: 1, maximum: 5 }, texto: { type: 'string' } } }), responses: { 201: { description: 'Creada', ...exito(ref('Resena')) }, 403: error('No jugaste esta reserva'), 409: error('Ya la reseñaste'), 422: error('Aún no se juega') } }
  },
  '/api/canchas/{id}/resenas': {
    get: { tags: ['Pagos'], summary: 'Reseñas públicas de una cancha', parameters: [idPath], responses: { 200: { description: 'Lista', ...exito({ type: 'array', items: ref('Resena') }) } } }
  }
};
