// ============================================================================
//  src/middleware/validar.js — valida la petición con esquemas de Zod
//
//  Uso en una ruta:
//    router.post('/', validar({ body: esquemaCrear }), controlador.crear)
//
//  ¿Por qué en un middleware?
//   El controlador recibe datos ya limpios y con el tipo correcto en
//   `req.datos` ({ body, query, params }). Si algo no cumple, Zod lanza un
//   ZodError y el manejador central responde 422 con el detalle por campo.
//   (En Express 5 `req.query` es de solo lectura; por eso usamos req.datos.)
// ============================================================================

function validar(esquemas) {
  return (req, res, next) => {
    req.datos = req.datos || {};
    for (const parte of ['params', 'query', 'body']) {
      if (esquemas[parte]) req.datos[parte] = esquemas[parte].parse(req[parte] ?? {});
    }
    next();
  };
}

module.exports = { validar };
