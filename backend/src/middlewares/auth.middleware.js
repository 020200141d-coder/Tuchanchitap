// ============================================================================
//  src/middlewares/auth.middleware.js — autenticación (JWT) y permisos por rol
//
//  autenticar      → exige "Authorization: Bearer <token>"; sin él, 401.
//                    Deja al usuario en req.usuario.
//  autenticarOpcional → si hay token lo usa, si no sigue como visitante
//                    (por ejemplo, el dueño ve sus canchas no publicadas).
//  permitir(...roles) → 403 si el rol del usuario no está en la lista.
//
//  Ojo: "solo el dueño de ESTA cancha" (regla 4) no se puede decidir aquí,
//  porque depende del recurso; eso lo valida el servicio con asegurarDueno().
// ============================================================================

import { verificarToken } from '../modules/auth/auth.service.js';
import { ErrorNegocio, prohibido } from '../utils/errores.js';

function leerToken(req) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  return tipo === 'Bearer' && token ? token : null;
}

async function autenticar(req, res, next) {
  const token = leerToken(req);
  if (!token) throw new ErrorNegocio('Necesitas iniciar sesión', 401);
  req.usuario = await verificarToken(token);
  next();
}

async function autenticarOpcional(req, res, next) {
  const token = leerToken(req);
  if (token) {
    try {
      req.usuario = await verificarToken(token);
    } catch {
      req.usuario = null; // token vencido: se trata como visitante
    }
  }
  next();
}

const permitir = (...roles) => (req, res, next) => {
  if (!req.usuario) throw new ErrorNegocio('Necesitas iniciar sesión', 401);
  if (!roles.includes(req.usuario.rol)) throw prohibido('Tu rol no permite esta acción');
  next();
};

export { autenticar, autenticarOpcional, permitir };
export default { autenticar, autenticarOpcional, permitir };
