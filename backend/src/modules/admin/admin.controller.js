// ============================================================================
//  src/modules/admin/admin.controller.js — HTTP ↔ servicio del panel de administración
// ============================================================================

import servicio from './admin.service.js';
import { ok, creado, sinContenido } from '../../utils/respuesta.js';

const id = req => req.datos.params.id;

export default {
  resumen: async (req, res) => ok(res, await servicio.resumen()),
  listarUsuarios: async (req, res) => ok(res, await servicio.listarUsuarios(req.datos.query)),
  crearUsuario: async (req, res) => creado(res, await servicio.crearUsuario(req.datos.body)),
  actualizarUsuario: async (req, res) => ok(res, await servicio.actualizarUsuario(req.usuario, id(req), req.datos.body)),
  eliminarUsuario: async (req, res) => {
    await servicio.eliminarUsuario(req.usuario, id(req));
    sinContenido(res);
  },
  listarReservas: async (req, res) => ok(res, await servicio.listarReservas(req.datos.query)),
  listarResenas: async (req, res) => ok(res, await servicio.listarResenas()),
  eliminarResena: async (req, res) => {
    await servicio.eliminarResena(id(req));
    sinContenido(res);
  }
};
