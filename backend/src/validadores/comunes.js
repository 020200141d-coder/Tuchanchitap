// ============================================================================
//  src/validadores/comunes.js — piezas de Zod que se repiten en varios recursos
//
//  • idParam: el :id de la URL llega como texto; se convierte a entero > 0.
//  • booleanoQuery: en la query string todo es texto ("true"/"false"/"1").
//  • fecha: 'YYYY-MM-DD' que exista en el calendario.
//  • paginacion: pagina y porPagina con valores por defecto y tope.
// ============================================================================

const { z } = require('zod');
const { esFechaValida } = require('../lib/horario');

const id = z.coerce.number({ invalid_type_error: 'Debe ser un número' }).int('Debe ser entero').positive('Debe ser mayor que 0');
const idParam = z.object({ id });

const booleanoQuery = z
  .enum(['true', 'false', '1', '0'], { message: 'Usa true o false' })
  .transform(v => v === 'true' || v === '1');

const fecha = z.string({ required_error: 'La fecha es obligatoria' }).refine(esFechaValida, 'Fecha no válida (usa AAAA-MM-DD)');

const paginacion = {
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(12)
};

module.exports = { id, idParam, booleanoQuery, fecha, paginacion };
