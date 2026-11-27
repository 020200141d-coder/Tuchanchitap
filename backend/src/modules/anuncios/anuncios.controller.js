// ============================================================================
//  src/modules/anuncios/anuncios.controller.js — HTTP ↔ servicio de anuncios
//  (públicos: mostrar y contar clic; admin: CRUD con estadísticas)
// ============================================================================

import servicio from './anuncios.service.js';
import { ok, creado, sinContenido } from '../../utils/respuesta.js';

const id = req => req.datos.params.id;

export default {
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
