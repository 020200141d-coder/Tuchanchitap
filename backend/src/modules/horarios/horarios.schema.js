// ============================================================================
//  src/modules/horarios/horarios.schema.js — esquemas Zod de tarifas, bloqueos y horas libres
//
//  Las horas son enteras y en hora local de Cusco (las canchitas se alquilan
//  por hora completa). horaFin es exclusiva: 18–23 significa de 6 p. m. a
//  11 p. m. y 24 es medianoche.
// ============================================================================

import { z } from 'zod';
import { fecha } from '../../utils/validaciones.js';

const dia = z.coerce.number().int().min(0, '0 = domingo').max(6, '6 = sábado');
const horaInicio = z.coerce.number({ invalid_type_error: 'Hora no válida' }).int().min(0).max(23);
const horaFin = z.coerce.number({ invalid_type_error: 'Hora no válida' }).int().min(1).max(24);
const precioHora = z.coerce.number({ invalid_type_error: 'Precio no válido' }).positive('Debe ser mayor que 0').max(1000, 'Máximo S/ 1000 por hora');

const rangoValido = d => d.horaInicio === undefined || d.horaFin === undefined || d.horaFin > d.horaInicio;
const mensajeRango = { message: 'La hora de fin debe ser mayor que la de inicio', path: ['horaFin'] };

// Una franja de precio que se aplica a uno o varios días a la vez
// (por ejemplo lunes a viernes de 18 a 23 a S/ 70).
const crearTarifa = z
  .object({
    dias: z.array(dia).min(1, 'Elige al menos un día').max(7).transform(d => [...new Set(d)]),
    horaInicio,
    horaFin,
    precioHora
  })
  .refine(rangoValido, mensajeRango);

const actualizarTarifa = z
  .object({ diaSemana: dia.optional(), horaInicio: horaInicio.optional(), horaFin: horaFin.optional(), precioHora: precioHora.optional() })
  .refine(d => Object.keys(d).length > 0, 'Envía al menos un campo')
  .refine(rangoValido, mensajeRango);

const crearBloqueo = z
  .object({
    fecha,
    horaInicio: horaInicio.default(0),
    horaFin: horaFin.default(24),
    motivo: z.enum(['LLUVIA', 'MANTENIMIENTO', 'EVENTO', 'OTRO']).default('OTRO'),
    nota: z.string().trim().max(200).nullable().optional()
  })
  .refine(rangoValido, mensajeRango);

const consultaDisponibilidad = z.object({ fecha });

const rangoFechas = z
  .object({ desde: fecha.optional(), hasta: fecha.optional() })
  .refine(d => !d.desde || !d.hasta || d.hasta >= d.desde, { message: '"hasta" debe ser igual o posterior a "desde"', path: ['hasta'] });

export { crearTarifa, actualizarTarifa, crearBloqueo, consultaDisponibilidad, rangoFechas };
export default { crearTarifa, actualizarTarifa, crearBloqueo, consultaDisponibilidad, rangoFechas };
