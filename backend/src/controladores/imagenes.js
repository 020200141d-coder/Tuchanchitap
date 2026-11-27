// ============================================================================
//  src/controladores/imagenes.js — HTTP ↔ imágenes del sitio
// ============================================================================

const servicio = require('../servicios/imagenes');
const { ok, creado, sinContenido } = require('../lib/respuesta');

module.exports = {
  publicas: async (req, res) => ok(res, await servicio.publicas(req.datos.query)),
  listar: async (req, res) => ok(res, await servicio.listar()),
  crear: async (req, res) => creado(res, await servicio.crear(req.datos.body, req.file)),
  actualizar: async (req, res) => ok(res, await servicio.actualizar(req.datos.params.id, req.datos.body)),
  eliminar: async (req, res) => {
    await servicio.eliminar(req.datos.params.id);
    sinContenido(res);
  }
};
