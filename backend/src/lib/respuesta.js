// ============================================================================
//  src/lib/respuesta.js — formato único de las respuestas exitosas
//
//  Todas las respuestas de la API tienen la forma { ok: true, data }. Los
//  errores los arma middleware/errores.js como { ok: false, error, campos }.
//  Así el frontend siempre sabe dónde buscar.
//
//  `limpiar` convierte lo que Prisma devuelve y no es JSON "bonito":
//   • Decimal (precios) → número (Prisma lo mandaría como texto "35.5").
//   • Quita passwordHash de cualquier usuario, esté donde esté anidado.
// ============================================================================

function limpiar(valor) {
  if (valor === null || valor === undefined) return valor;
  if (valor instanceof Date) return valor;
  if (Array.isArray(valor)) return valor.map(limpiar);
  if (typeof valor === 'object') {
    // Decimal de Prisma (decimal.js): tiene toNumber.
    if (typeof valor.toNumber === 'function' && typeof valor.toFixed === 'function') return valor.toNumber();
    const salida = {};
    for (const [k, v] of Object.entries(valor)) {
      if (k === 'passwordHash') continue;
      salida[k] = limpiar(v);
    }
    return salida;
  }
  return valor;
}

const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data: limpiar(data) });
const creado = (res, data) => ok(res, data, 201);
const sinContenido = res => res.status(204).end();

module.exports = { ok, creado, sinContenido, limpiar };
