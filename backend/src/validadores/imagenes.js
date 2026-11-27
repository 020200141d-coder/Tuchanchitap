// ============================================================================
//  src/validadores/imagenes.js — esquemas Zod de las imágenes del sitio
//
//  Una imagen se crea subiendo un archivo (campo "imagen", multipart) o
//  pegando una URL. Como llega en multipart, los números y booleanos vienen
//  como texto y se convierten aquí.
// ============================================================================

const { z } = require('zod');

const LUGARES = ['PORTADA', 'INGRESO', 'CANCHA_SIN_FOTO'];
const booleano = z.union([z.boolean(), z.enum(['true', 'false']).transform(v => v === 'true')]);
const textoOpcional = max => z.string().trim().max(max).transform(v => v || null).nullable().optional();

const campos = {
  lugar: z.enum(LUGARES, { message: 'Lugar: PORTADA, INGRESO o CANCHA_SIN_FOTO' }),
  url: z.string().trim().url('URL no válida').optional(),
  titulo: textoOpcional(80),
  credito: textoOpcional(120),
  enlaceCredito: z.string().trim().url('Enlace no válido').or(z.literal('')).transform(v => v || null).nullable().optional(),
  orden: z.coerce.number().int().min(0).max(999).optional(),
  activa: booleano.optional()
};

const crear = z.object(campos);

const actualizar = z
  .object(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v.optional()])))
  .refine(d => Object.keys(d).length > 0, 'Envía al menos un campo');

const consulta = z.object({ lugar: z.enum(LUGARES).optional() });

module.exports = { crear, actualizar, consulta, LUGARES };
