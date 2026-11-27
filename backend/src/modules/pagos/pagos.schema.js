// ============================================================================
//  src/modules/pagos/pagos.schema.js — comprobantes Yape/Plin, reseñas
//
//  El comprobante llega como multipart/form-data (foto + campos de texto), así
//  que todos los campos vienen como texto y se limpian aquí.
//  El n.º de operación de Yape/Plin son dígitos; se quitan espacios y guiones
//  para que "12 345-678" y "12345678" se reconozcan como el mismo (regla 6).
// ============================================================================

import { z } from 'zod';

const enviarComprobante = z.object({
  metodo: z.enum(['YAPE', 'PLIN'], { message: 'Método: YAPE o PLIN' }),
  numeroOperacion: z
    .string({ required_error: 'El número de operación es obligatorio' })
    .transform(s => s.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^\d{4,20}$/, 'Solo números (entre 4 y 20 dígitos)'))
});

const rechazar = z.object({ nota: z.string({ required_error: 'Explica el motivo' }).trim().min(3, 'Explica el motivo').max(200) });

const filtroPagos = z.object({ estado: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO']).optional() });

const crearResena = z.object({
  estrellas: z.coerce.number().int().min(1, 'De 1 a 5 estrellas').max(5, 'De 1 a 5 estrellas'),
  texto: z.string().trim().max(300).optional()
});

export { enviarComprobante, rechazar, filtroPagos, crearResena };
export default { enviarComprobante, rechazar, filtroPagos, crearResena };
