// Documentación OpenAPI de tarifas, bloqueos y horas libres (ver src/docs/index.js).
const json = schema => ({ content: { 'application/json': { schema } } });
const ref = n => ({ $ref: `#/components/schemas/${n}` });
const exito = schema => json({ type: 'object', properties: { ok: { type: 'boolean', example: true }, data: schema } });
const error = d => ({ description: d, ...json(ref('Error')) });
const seguro = [{ bearer: [] }];
const idPath = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const fechaQ = (name, required = false) => ({ name, in: 'query', required, schema: { type: 'string', format: 'date', example: '2026-11-28' } });

module.exports = {
  '/api/canchas/{id}/tarifas': {
    get: { tags: ['Horarios'], summary: 'Tarifas de la cancha', parameters: [idPath], responses: { 200: { description: 'Lista', ...exito({ type: 'array', items: ref('Tarifa') }) }, 404: error('No existe') } },
    post: {
      tags: ['Horarios'],
      summary: 'Crea una franja de precio para uno o varios días',
      security: seguro,
      parameters: [idPath],
      requestBody: json({ type: 'object', required: ['dias', 'horaInicio', 'horaFin', 'precioHora'], properties: { dias: { type: 'array', items: { type: 'integer' }, example: [1, 2, 3, 4, 5] }, horaInicio: { type: 'integer', example: 18 }, horaFin: { type: 'integer', example: 23 }, precioHora: { type: 'number', example: 70 } } }),
      responses: { 201: { description: 'Tarifas creadas', ...exito({ type: 'array', items: ref('Tarifa') }) }, 403: error('No es tu cancha'), 409: error('Se cruza con otra franja'), 422: error('Datos inválidos') }
    }
  },
  '/api/tarifas/{id}': {
    patch: { tags: ['Horarios'], summary: 'Edita una tarifa', security: seguro, parameters: [idPath], requestBody: json(ref('Tarifa')), responses: { 200: { description: 'Actualizada', ...exito(ref('Tarifa')) }, 403: error('No es tu cancha'), 409: error('Se cruza') } },
    delete: { tags: ['Horarios'], summary: 'Borra una tarifa', security: seguro, parameters: [idPath], responses: { 204: { description: 'Borrada' }, 403: error('No es tu cancha'), 404: error('No existe') } }
  },
  '/api/canchas/{id}/bloqueos': {
    get: { tags: ['Horarios'], summary: 'Bloqueos vigentes (dueño)', security: seguro, parameters: [idPath, fechaQ('desde'), fechaQ('hasta')], responses: { 200: { description: 'Lista', ...exito({ type: 'array', items: ref('Bloqueo') }) }, 403: error('No es tu cancha') } },
    post: {
      tags: ['Horarios'],
      summary: 'Bloquea un rango (lluvia, mantenimiento…)',
      security: seguro,
      parameters: [idPath],
      requestBody: json({ type: 'object', required: ['fecha'], properties: { fecha: { type: 'string', format: 'date' }, horaInicio: { type: 'integer', default: 0 }, horaFin: { type: 'integer', default: 24 }, motivo: { type: 'string', enum: ['LLUVIA', 'MANTENIMIENTO', 'EVENTO', 'OTRO'] }, nota: { type: 'string' } } }),
      responses: { 201: { description: 'Creado', ...exito(ref('Bloqueo')) }, 409: error('Hay reservas activas o ya está bloqueado'), 422: error('Horario pasado') }
    }
  },
  '/api/bloqueos/{id}': {
    delete: { tags: ['Horarios'], summary: 'Quita un bloqueo', security: seguro, parameters: [idPath], responses: { 204: { description: 'Quitado' }, 403: error('No es tu cancha'), 404: error('No existe') } }
  },
  '/api/canchas/{id}/disponibilidad': {
    get: {
      tags: ['Horarios'],
      summary: 'Horas del día con su estado (libre, ocupada, bloqueada, pasada) y precio',
      parameters: [idPath, fechaQ('fecha', true)],
      responses: {
        200: {
          description: 'Horas del día',
          ...exito({ type: 'object', properties: { fecha: { type: 'string' }, abierta: { type: 'boolean' }, horas: { type: 'array', items: { type: 'object', properties: { hora: { type: 'integer' }, etiqueta: { type: 'string', example: '20:00–21:00' }, precio: { type: 'number' }, estado: { type: 'string', enum: ['libre', 'ocupada', 'bloqueada', 'pasada'] } } } } } })
        },
        404: error('No existe'),
        422: error('Fecha inválida')
      }
    }
  }
};
