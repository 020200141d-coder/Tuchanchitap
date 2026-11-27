// ============================================================================
//  src/modules/reservas/reservas.controller.js — HTTP ↔ servicio de reservas
// ============================================================================

import servicio from './reservas.service.js';
import { ok, creado } from '../../utils/respuesta.js';

export default {
  crear: async (req, res) => creado(res, await servicio.crear(req.usuario, req.datos.body)),
  mias: async (req, res) => ok(res, await servicio.listarMias(req.usuario, req.datos.query)),
  obtener: async (req, res) => ok(res, await servicio.obtener(req.usuario, req.datos.params.id)),
  deCancha: async (req, res) => ok(res, await servicio.listarDeCancha(req.usuario, req.datos.params.id, req.datos.query)),
  cancelar: async (req, res) => ok(res, await servicio.cancelar(req.usuario, req.datos.params.id))
};
