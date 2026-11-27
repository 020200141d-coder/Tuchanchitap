// ============================================================================
//  src/modules/canchas/canchas.schema.js — esquemas Zod de canchas
//
//  • crear / actualizar: lo que manda el formulario del dueño. Las
//    coordenadas se limitan a la región Cusco para atrapar errores comunes
//    (lat y lng invertidas, o el signo olvidado).
//  • filtros: la query del listado público (todo llega como texto y se
//    convierte con coerce).
// ============================================================================

import { z } from 'zod';
import { telefono } from '../auth/auth.schema.js';
import { booleanoQuery, paginacion, id } from '../../utils/validaciones.js';

const TIPOS = ['SINTETICO', 'LOSA', 'GRASS'];
const FORMATOS = [5, 7, 11];

// Región Cusco aproximada: evita canchas "en el mar" por un signo mal puesto.
const lat = z.coerce.number({ invalid_type_error: 'Latitud no válida' }).min(-15.5, 'Fuera de la región Cusco').max(-11, 'Fuera de la región Cusco');
const lng = z.coerce.number({ invalid_type_error: 'Longitud no válida' }).min(-74, 'Fuera de la región Cusco').max(-70, 'Fuera de la región Cusco');

const campos = {
  nombre: z.string({ required_error: 'El nombre es obligatorio' }).trim().min(3, 'Mínimo 3 letras').max(100),
  descripcion: z.string().trim().max(500).nullable().optional(),
  tipo: z.enum(TIPOS, { message: 'Tipo: SINTETICO, LOSA o GRASS' }),
  formato: z.coerce.number().refine(v => FORMATOS.includes(v), 'Formato: 5, 7 u 11'),
  techada: z.boolean().default(false),
  conLuz: z.boolean().default(false),
  lat,
  lng,
  direccion: z.string({ required_error: 'La dirección es obligatoria' }).trim().min(5, 'Escribe una referencia más completa').max(200),
  zona: z.string().trim().max(60).nullable().optional(),
  telefono: telefono.nullable().optional(),
  publicada: z.boolean().default(false),
  // Solo lo usa ADMIN para crear o reasignar una cancha a un dueño.
  duenoId: id.optional()
};

const crear = z.object(campos);

// En la edición todo es opcional, pero sin los .default() (si no, un PATCH
// con solo { nombre } apagaría "techada" o "publicada").
const actualizar = z
  .object({
    ...campos,
    nombre: campos.nombre.optional(),
    tipo: campos.tipo.optional(),
    formato: campos.formato.optional(),
    techada: z.boolean().optional(),
    conLuz: z.boolean().optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    direccion: campos.direccion.optional(),
    publicada: z.boolean().optional()
  })
  .refine(d => Object.keys(d).length > 0, 'Envía al menos un campo');

const filtros = z
  .object({
    q: z.string().trim().max(60).optional(),
    tipo: z.enum(TIPOS).optional(),
    formato: z.coerce.number().refine(v => FORMATOS.includes(v), 'Formato: 5, 7 u 11').optional(),
    techada: booleanoQuery.optional(),
    conLuz: booleanoQuery.optional(),
    precioMax: z.coerce.number().positive().optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    radioKm: z.coerce.number().positive().max(50).optional(),
    ...paginacion
  })
  .refine(d => (d.lat === undefined) === (d.lng === undefined), { message: 'Envía lat y lng juntas', path: ['lat'] });

const tipoImagen = z.object({ tipo: z.enum(['foto', 'qr']).default('foto') });
const quitarFoto = z.object({ url: z.string().url('URL no válida') });

export { crear, actualizar, filtros, tipoImagen, quitarFoto, TIPOS, FORMATOS };
export default { crear, actualizar, filtros, tipoImagen, quitarFoto, TIPOS, FORMATOS };
