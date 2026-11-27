// ============================================================================
//  src/modules/imagenes/imagenes.controller.js — HTTP ↔ imágenes del sitio
// ============================================================================

import servicio from './imagenes.service.js';
import { ok, creado, sinContenido } from '../../utils/respuesta.js';

export default {
  publicas: async (req, res) => ok(res, await servicio.publicas(req.datos.query)),
  listar: async (req, res) => ok(res, await servicio.listar()),
  crear: async (req, res) => creado(res, await servicio.crear(req.datos.body, req.file)),
  actualizar: async (req, res) => ok(res, await servicio.actualizar(req.datos.params.id, req.datos.body)),
  eliminar: async (req, res) => {
    await servicio.eliminar(req.datos.params.id);
    sinContenido(res);
  }
};
