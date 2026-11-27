// ============================================================================
//  src/controladores/anuncios.js — HTTP ↔ servicio de anuncios
//  (públicos: mostrar y contar clic; admin: CRUD con estadísticas)
// ============================================================================

const servicio = require('../servicios/anuncios');
const { ok, creado, sinContenido } = require('../lib/respuesta');

const id = req => req.datos.params.id;

module.exports = {
  mostrar: async (req, res) => ok(res, await servicio.paraMostrar(req.datos.query)),
  clic: async (req, res) => ok(res, await servicio.registrarClic(id(req))),
  listar: async (req, res) => ok(res, await servicio.listar()),
  crear: async (req, res) => creado(res, await servicio.crear(req.datos.body)),
  actualizar: async (req, res) => ok(res, await servicio.actualizar(id(req), req.datos.body)),
  eliminar: async (req, res) => {
    await servicio.eliminar(id(req));
    sinContenido(res);
  }
};
