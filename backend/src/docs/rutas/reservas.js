// Documentación OpenAPI de reservas (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const ref = n => ({ $ref: `#/components/schemas/${n}` });
const exito = schema => json({ type: 'object', properties: { ok: { type: 'boolean', example: true }, data: schema } });
const error = d => ({ description: d, ...json(ref('Error')) });
const seguro = [{ bearer: [] }];
const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };

export default {
  '/api/reglas': {
    get: { tags: ['Reservas'], summary: 'Reglas configurables (minutos para pagar, horas para cancelar…)', responses: { 200: { description: 'Reglas', ...exito({ type: 'object' }) } } }
  },
  '/api/reservas': {
    post: {
      tags: ['Reservas'],
      summary: 'Separa una hora (queda PENDIENTE_PAGO unos minutos)',
      description: 'El precio NO se envía: lo calcula el servidor con las tarifas. Si se envía un campo extra, responde 422.',
      security: seguro,
      requestBody: json({ type: 'object', required: ['canchaId', 'fecha', 'horaInicio'], additionalProperties: false, properties: { canchaId: { type: 'integer', example: 1 }, fecha: { type: 'string', format: 'date', example: '2026-11-28' }, horaInicio: { type: 'integer', example: 20 }, horas: { type: 'integer', default: 1, maximum: 3 } } }),
      responses: {
        201: { description: 'Reserva creada', ...exito(ref('Reserva')) },
        401: error('Sin sesión'),
        404: error('Cancha no existe'),
        409: error('Hora ocupada, bloqueada o demasiadas pendientes'),
        422: error('En el pasado, fuera de horario o datos inválidos')
      }
    }
  },
  '/api/reservas/mias': {
    get: { tags: ['Reservas'], summary: 'Mis reservas', security: seguro, parameters: [{ name: 'estado', in: 'query', schema: { type: 'string', enum: ['PENDIENTE_PAGO', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA', 'JUGADA'] } }], responses: { 200: { description: 'Lista', ...exito({ type: 'array', items: ref('Reserva') }) } } }
  },
  '/api/reservas/{id}': {
    get: { tags: ['Reservas'], summary: 'Detalle (jugador, dueño de la cancha o ADMIN)', security: seguro, parameters: [idPath], responses: { 200: { description: 'Reserva', ...exito(ref('Reserva')) }, 403: error('No es tuya'), 404: error('No existe') } }
  },
  '/api/reservas/{id}/cancelar': {
    post: {
      tags: ['Reservas'],
      summary: 'Cancela (regla 5: con menos de HORAS_CANCELACION se pierde el adelanto)',
      security: seguro,
      parameters: [idPath],
      responses: { 200: { description: 'Cancelada', ...exito({ type: 'object', properties: { reserva: ref('Reserva'), adelantoPerdido: { type: 'boolean' }, mensaje: { type: 'string' } } }) }, 403: error('No es tuya'), 409: error('Estado no cancelable'), 422: error('Ya empezó') }
    }
  },
  '/api/canchas/{id}/reservas': {
    get: {
      tags: ['Reservas'],
      summary: 'Calendario del dueño: reservas de su cancha en un rango',
      security: seguro,
      parameters: [idPath, { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' } }, { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' } }],
      responses: { 200: { description: 'Reservas', ...exito({ type: 'array', items: ref('Reserva') }) }, 403: error('No es tu cancha') }
    }
  }
};
