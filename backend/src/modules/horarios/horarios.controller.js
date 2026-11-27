// ============================================================================
//  src/modules/horarios/horarios.controller.js — HTTP ↔ tarifas, bloqueos y horas libres
// ============================================================================

import tarifas from './tarifas.service.js';
import bloqueos from './bloqueos.service.js';
import disponibilidad from './disponibilidad.service.js';
import { ok, creado, sinContenido } from '../../utils/respuesta.js';

const id = req => req.datos.params.id;

export default {
  listarTarifas: async (req, res) => ok(res, await tarifas.listar(id(req))),
  crearTarifa: async (req, res) => creado(res, await tarifas.crear(req.usuario, id(req), req.datos.body)),
  actualizarTarifa: async (req, res) => ok(res, await tarifas.actualizar(req.usuario, id(req), req.datos.body)),
  eliminarTarifa: async (req, res) => {
    await tarifas.eliminar(req.usuario, id(req));
    sinContenido(res);
  },

  listarBloqueos: async (req, res) => ok(res, await bloqueos.listar(req.usuario, id(req), req.datos.query)),
  crearBloqueo: async (req, res) => creado(res, await bloqueos.crear(req.usuario, id(req), req.datos.body)),
  eliminarBloqueo: async (req, res) => {
    await bloqueos.eliminar(req.usuario, id(req));
    sinContenido(res);
  },

  disponibilidad: async (req, res) => ok(res, await disponibilidad.horasDelDia(id(req), req.datos.query.fecha, { usuario: req.usuario }))
};
