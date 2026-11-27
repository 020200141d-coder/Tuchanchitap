// ============================================================================
//  src/validadores/reservas.js — esquemas Zod de reservas
//
//  Regla 3 en el validador: `crear` es .strict(), así que si el navegador
//  intenta mandar "total", "precio" o "adelanto" la petición se rechaza (422).
//  El precio lo calcula siempre el servidor con las tarifas.
// ============================================================================

const { z } = require('zod');
const config = require('../config');
const { id, fecha } = require('./comunes');

const ESTADOS = ['PENDIENTE_PAGO', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA', 'JUGADA'];

const crear = z
  .object({
    canchaId: id,
    fecha,
    horaInicio: z.coerce.number({ invalid_type_error: 'Hora no válida' }).int().min(0).max(23),
    horas: z.coerce
      .number()
      .int()
      .min(1, 'Mínimo 1 hora')
      .max(config.reglas.horasMaximasReserva, `Máximo ${config.reglas.horasMaximasReserva} horas seguidas`)
      .default(1)
  })
  .strict('Campo no permitido: el precio lo calcula el servidor');

const filtroMias = z.object({ estado: z.enum(ESTADOS).optional() });

const cancelar = z.object({ motivo: z.string().trim().max(200).optional() }).default({});

module.exports = { crear, filtroMias, cancelar, ESTADOS };
