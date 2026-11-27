// ============================================================================
//  src/docs/esquemas.js — esquemas reutilizables para Swagger
//
//  Describen las respuestas comunes (error, paginado) y las entidades, para
//  que cada ruta los referencie con $ref en vez de repetirlos.
// ============================================================================

const ref = nombre => ({ $ref: `#/components/schemas/${nombre}` });

export default {
  Error: {
    type: 'object',
    properties: {
      ok: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Revisa los datos enviados' },
      campos: { type: 'object', additionalProperties: { type: 'string' }, example: { email: 'Correo no válido' } }
    }
  },
  Usuario: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      nombre: { type: 'string' },
      email: { type: 'string' },
      telefono: { type: 'string', nullable: true },
      rol: { type: 'string', enum: ['JUGADOR', 'DUENO', 'ADMIN'] },
      activo: { type: 'boolean' }
    }
  },
  Sesion: {
    type: 'object',
    properties: { token: { type: 'string' }, usuario: ref('Usuario') }
  },
  Cancha: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      duenoId: { type: 'integer' },
      nombre: { type: 'string' },
      descripcion: { type: 'string', nullable: true },
      tipo: { type: 'string', enum: ['SINTETICO', 'LOSA', 'GRASS'] },
      formato: { type: 'integer', enum: [5, 7, 11] },
      techada: { type: 'boolean' },
      conLuz: { type: 'boolean' },
      lat: { type: 'number' },
      lng: { type: 'number' },
      direccion: { type: 'string' },
      zona: { type: 'string', nullable: true },
      telefono: { type: 'string', nullable: true },
      fotos: { type: 'array', items: { type: 'string' } },
      qrPagoUrl: { type: 'string', nullable: true },
      publicada: { type: 'boolean' },
      precioDesde: { type: 'number', nullable: true },
      distanciaKm: { type: 'number', nullable: true },
      promedioEstrellas: { type: 'number', nullable: true }
    }
  },
  Tarifa: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      canchaId: { type: 'integer' },
      diaSemana: { type: 'integer', minimum: 0, maximum: 6, description: '0 = domingo' },
      horaInicio: { type: 'integer', example: 18 },
      horaFin: { type: 'integer', example: 23 },
      precioHora: { type: 'number', example: 70 }
    }
  },
  Bloqueo: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      canchaId: { type: 'integer' },
      inicio: { type: 'string', format: 'date-time' },
      fin: { type: 'string', format: 'date-time' },
      motivo: { type: 'string', enum: ['LLUVIA', 'MANTENIMIENTO', 'EVENTO', 'OTRO'] },
      nota: { type: 'string', nullable: true }
    }
  },
  Reserva: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      canchaId: { type: 'integer' },
      jugadorId: { type: 'integer' },
      inicio: { type: 'string', format: 'date-time' },
      fin: { type: 'string', format: 'date-time' },
      total: { type: 'number' },
      adelanto: { type: 'number' },
      estado: { type: 'string', enum: ['PENDIENTE_PAGO', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA', 'JUGADA'] },
      expiraEn: { type: 'string', format: 'date-time', nullable: true },
      adelantoPerdido: { type: 'boolean' }
    }
  },
  Pago: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      reservaId: { type: 'integer' },
      metodo: { type: 'string', enum: ['YAPE', 'PLIN'] },
      numeroOperacion: { type: 'string' },
      fotoUrl: { type: 'string' },
      monto: { type: 'number' },
      estado: { type: 'string', enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'] },
      nota: { type: 'string', nullable: true }
    }
  },
  Resena: {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      reservaId: { type: 'integer' },
      estrellas: { type: 'integer', minimum: 1, maximum: 5 },
      texto: { type: 'string', nullable: true }
    }
  }
};
