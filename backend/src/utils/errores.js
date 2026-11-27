// ============================================================================
//  src/utils/errores.js — errores de negocio
//
//  ¿Por qué una clase propia?
//   Los servicios (capa de reglas) no saben de HTTP; solo saben que una regla
//   no se cumple. Lanzan ErrorNegocio con el mensaje para la persona y el
//   código que mejor lo describe (403 sin permiso, 404 no existe, 409 choque
//   de horario, 422 dato que no tiene sentido…).
//
//  Flujo:
//    servicio → throw new ErrorNegocio('Esa hora ya está tomada', 409)
//    controlador → no lo atrapa (Express 5 pasa los errores async solo)
//    middlewares/error.middleware.js → responde { ok: false, error, campos } con ese status
// ============================================================================

class ErrorNegocio extends Error {
  /**
   * @param {string} mensaje  texto que verá la persona
   * @param {number} status   código HTTP (400, 401, 403, 404, 409, 422…)
   * @param {object} [campos] errores por campo, p. ej. { email: 'Ya existe' }
   */
  constructor(mensaje, status = 400, campos = null) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.status = status;
    this.campos = campos;
  }
}

// Atajos para que los servicios se lean como frases.
const noEncontrado = (que = 'El recurso') => new ErrorNegocio(`${que} no existe`, 404);
const prohibido = (mensaje = 'No tienes permiso para esta acción') => new ErrorNegocio(mensaje, 403);
const conflicto = mensaje => new ErrorNegocio(mensaje, 409);
const invalido = (mensaje, campos) => new ErrorNegocio(mensaje, 422, campos);

export { ErrorNegocio, noEncontrado, prohibido, conflicto, invalido };
export default { ErrorNegocio, noEncontrado, prohibido, conflicto, invalido };
