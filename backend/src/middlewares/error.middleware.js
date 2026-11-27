// ============================================================================
//  src/middlewares/error.middleware.js — manejador central de errores
//
//  ¿Por qué uno solo?
//   Así ningún controlador tiene try/catch repetidos y TODAS las respuestas de
//   error tienen la misma forma: { ok: false, error, campos }.
//
//  Tabla de traducción (de dónde viene el error → código HTTP):
//   ErrorNegocio (servicios)              → su propio status (403, 404, 409, 422…)
//   ZodError (validadores)                → 422 con `campos` { campo: mensaje }
//   JSON mal formado en el body           → 400
//   Multer (archivo muy grande / otro)    → 400
//   Prisma P2002 (único repetido)         → 409
//   Prisma P2003 (tiene datos asociados)  → 409
//   Prisma P2025 (no existe)              → 404
//   Prisma P2034 (choque de transacción)  → 409
//   Cualquier otra cosa                   → 500 (sin detalles internos)
// ============================================================================

import { ZodError } from 'zod';
import { ErrorNegocio } from '../utils/errores.js';
import config from '../config/env.js';

// Convierte la lista de problemas de Zod en { "campo.sub": "mensaje" }.
function camposDeZod(error) {
  const campos = {};
  for (const issue of error.issues) {
    const clave = issue.path.join('.') || '_';
    if (!campos[clave]) campos[clave] = issue.message;
  }
  return campos;
}

function noEncontrada(req, res) {
  res.status(404).json({ ok: false, error: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

// Express reconoce el manejador de errores por sus 4 parámetros.
// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  const responder = (status, error, campos = null) => res.status(status).json({ ok: false, error, ...(campos ? { campos } : {}) });

  if (err instanceof ErrorNegocio) return responder(err.status, err.message, err.campos);
  if (err instanceof ZodError) return responder(422, 'Revisa los datos enviados', camposDeZod(err));
  if (err.type === 'entity.parse.failed') return responder(400, 'El cuerpo de la petición no es JSON válido');
  if (err.name === 'MulterError') {
    const mensaje = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen pesa más de 3 MB' : `Archivo no válido: ${err.message}`;
    return responder(400, mensaje);
  }
  switch (err.code) {
    case 'P2002': return responder(409, 'Ya existe un registro con esos datos');
    case 'P2003': return responder(409, 'No se puede borrar: tiene datos asociados');
    case 'P2025': return responder(404, 'El recurso no existe');
    case 'P2034': return responder(409, 'Otra persona hizo una operación al mismo tiempo; inténtalo de nuevo');
    default: break;
  }

  if (!config.esPrueba) console.error('[error 500]', err);
  return responder(500, 'Ocurrió un error inesperado en el servidor');
}

export { manejarErrores, noEncontrada, camposDeZod };
export default { manejarErrores, noEncontrada, camposDeZod };
