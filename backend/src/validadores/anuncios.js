// ============================================================================
//  src/validadores/anuncios.js — esquemas Zod de anuncios
//
//  Los textos son cortos a propósito (título ≤ 60, texto ≤ 140 caracteres):
//  un anuncio discreto se lee de un vistazo y no tapa las canchas.
//  Las fechas de vigencia llegan como 'AAAA-MM-DD' en hora de Cusco.
// ============================================================================

const { z } = require('zod');
const { fecha } = require('./comunes');

const campos = {
  anunciante: z.string().trim().min(2, 'Mínimo 2 letras').max(80),
  titulo: z.string().trim().min(3, 'Mínimo 3 letras').max(60, 'Máximo 60 caracteres'),
  texto: z.string().trim().min(5, 'Mínimo 5 letras').max(140, 'Máximo 140 caracteres: que sea corto'),
  enlace: z.string().trim().url('Enlace no válido').nullable().optional(),
  imagenUrl: z.string().trim().url('URL no válida').nullable().optional(),
  zona: z.string().trim().max(60).nullable().optional(),
  activo: z.boolean().optional(),
  desde: fecha,
  hasta: fecha
};

const fechasEnOrden = d => !d.desde || !d.hasta || d.hasta >= d.desde;
const mensajeFechas = { message: '"hasta" debe ser igual o posterior a "desde"', path: ['hasta'] };

const crear = z.object(campos).refine(fechasEnOrden, mensajeFechas);

const actualizar = z
  .object(Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v.optional()])))
  .refine(d => Object.keys(d).length > 0, 'Envía al menos un campo')
  .refine(fechasEnOrden, mensajeFechas);

const consulta = z.object({
  zona: z.string().trim().max(60).optional(),
  cantidad: z.coerce.number().int().min(1).max(2).default(1)
});

module.exports = { crear, actualizar, consulta };
